const http = require('http');
const WebSocket = require('ws');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { resolveUrl } = require('./resolvers');
const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200);
    res.end('OK');
  } else {
    res.writeHead(404);
    res.end();
  }
});

const wss = new WebSocket.Server({ server });

// Store rooms and their states
const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      state: {
        action: 'pause',
        time: 0,
        timestamp: Date.now(),
        currentMovie: null
      },
      clients: new Set(),
      users: new Map() // username -> client
    });
  }
  return rooms.get(roomId);
}

function broadcastToRoom(roomId, message, excludeClient = null) {
  const room = getRoom(roomId);
  const data = JSON.stringify(message);

  room.clients.forEach(client => {
    if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

wss.on('connection', (ws) => {
  let currentRoom = null;
  let username = null;

  console.log('New connection established');

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'join':
          currentRoom = message.roomId;
          username = message.username || `User${Math.floor(Math.random() * 1000)}`;

          const room = getRoom(currentRoom);
          room.clients.add(ws);
          room.users.set(username, ws);

          // Send current state to new user
          ws.send(JSON.stringify({
            type: 'state',
            ...room.state,
            userCount: room.clients.size
          }));

          // Notify others
          broadcastToRoom(currentRoom, {
            type: 'user-joined',
            username,
            userCount: room.clients.size
          }, ws);

          console.log(`${username} joined room ${currentRoom}`);
          break;

        case 'leave':
          if (currentRoom) {
            const room = getRoom(currentRoom);
            room.clients.delete(ws);
            room.users.delete(username);

            if (room.clients.size === 0) {
              rooms.delete(currentRoom);
              console.log(`Room ${currentRoom} deleted (empty)`);
            } else {
              broadcastToRoom(currentRoom, {
                type: 'user-left',
                username,
                userCount: room.clients.size
              });
            }
            console.log(`${username} left room ${currentRoom}`);
          }
          break;

        case 'change-movie':
          if (currentRoom) {
            const room = getRoom(currentRoom);
            room.state.currentMovie = message.movie;
            room.state.time = 0;
            room.state.action = 'pause';

            broadcastToRoom(currentRoom, {
              type: 'movie-changed',
              movie: message.movie,
              username
            });
          }
          break;

        case 'sync':
          if (currentRoom) {
            const room = getRoom(currentRoom);
            room.state = {
              action: message.action,
              time: message.time,
              timestamp: Date.now(),
              currentMovie: room.state.currentMovie
            };

            broadcastToRoom(currentRoom, {
              type: 'sync',
              action: message.action,
              time: message.time,
              timestamp: room.state.timestamp,
              username
            }, ws);
          }
          break;

        case 'chat':
          if (currentRoom) {
            broadcastToRoom(currentRoom, {
              type: 'chat',
              username,
              message: message.message,
              timestamp: Date.now()
            });
          }
          break;

        case 'buffering':
          if (currentRoom) {
            const room = getRoom(currentRoom);
            room.clients.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'buffering',
                  username: username,
                  action: message.action
                }));
              }
            });
          }
          break;

        case 'force-sync':
          if (currentRoom) {
            const room = getRoom(currentRoom);
            room.state.time = message.time;
            room.state.action = message.action;

            room.clients.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'force-sync',
                  time: message.time,
                  action: message.action,
                  username: username
                }));
              }
            });
          }
          break;

        case 'resolve-url':
          if (currentRoom) {
            const pageUrl = message.url;
            console.log(`Resolving URL: ${pageUrl}`);

            resolveUrl(pageUrl).then(result => {
              if (!result || !result.url) {
                ws.send(JSON.stringify({
                  type: 'error',
                  message: 'فشل استخراج الرابط تلقائيًا. حاول يدويًا.'
                }));
                return;
              }

              const movie = {
                type: 'url',
                url: result.url,
                name: result.name || 'تم الاستخراج ✨',
                id: 'resolved-' + Date.now()
              };

              const room = getRoom(currentRoom);
              room.state.currentMovie = movie;
              room.state.time = 0;
              room.state.action = 'pause';

              broadcastToRoom(currentRoom, {
                type: 'movie-changed',
                movie: movie,
                username: 'System (AI)'
              });
            }).catch(err => {
              console.error('Resolve-URL handler error:', err);
              ws.send(JSON.stringify({ type: 'error', message: 'خطأ داخلي في الخادم.' }));
            });
          }
          break;

        case 'seek':
          if (currentRoom) {
            const room = getRoom(currentRoom);
            room.state.time = message.time;
            room.state.timestamp = Date.now();
            broadcastToRoom(currentRoom, {
              type: 'seek',
              time: message.time,
              username
            }, ws);
          }
          break;

        case 'web-download':
          if (currentRoom) {
            const { url, title } = message;
            console.log(`[DOWNLOAD] Request: ${url} (${title || 'no title'})`);

            const runDownload = (pythonCmd) => {
              const args = ['add_movie.py', url];
              if (title) args.push('--title', title);

              console.log(`[DOWNLOAD] Spawning: ${pythonCmd} ${args.join(' ')}`);
              const child = spawn(pythonCmd, args, {
                cwd: path.join(__dirname, '..'),
                env: process.env
              });

              let output = '';
              let errorOutput = '';

              child.stdout.on('data', (data) => {
                output += data.toString();
              });

              child.stderr.on('data', (data) => {
                errorOutput += data.toString();
              });

              child.on('error', (err) => {
                console.error(`[DOWNLOAD] Spawn error:`, err);
                if (pythonCmd === 'python3') {
                  console.log(`[DOWNLOAD] 'python3' failed, trying 'python'...`);
                  return runDownload('python');
                }
                ws.send(JSON.stringify({
                  type: 'error',
                  code: 'ENV_ERROR',
                  message: 'فشل التشغيل: لم يتم العثور على Python في النظام.'
                }));
              });

              child.on('close', (code) => {
                if (code !== 0) {
                  console.error(`[DOWNLOAD] Failed with code ${code}. Stderr: ${errorOutput}`);
                  ws.send(JSON.stringify({
                    type: 'error',
                    code: 'DOWNLOAD_FAILED',
                    message: 'فشل التحميل. الرابط قد يكون منتهياً أو محمياً.'
                  }));
                  return;
                }

                console.log(`[DOWNLOAD] Finished successfully. Stdout: ${output}`);
                broadcastToRoom(currentRoom, {
                  type: 'chat',
                  username: 'System',
                  message: `✅ تم تحميل وإضافة: ${title || 'فيديو جديد'}`,
                  timestamp: Date.now()
                });
                broadcastToRoom(currentRoom, { type: 'library-updated' });
              });
            };

            runDownload('python3');
          }
          break;

        case 'web-delete':
          if (currentRoom) {
            const { movieId } = message;
            console.log(`[DELETE] Request for movieId: ${movieId}`);

            const catalogPath = path.join(__dirname, '../media/catalog.json');
            if (fs.existsSync(catalogPath)) {
              let catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
              let fileToDelete = null;
              let found = false;

              catalog = catalog.map(cat => {
                const itemIndex = cat.items.findIndex(i => i.id === movieId);
                if (itemIndex !== -1) {
                  const item = cat.items[itemIndex];
                  found = true;
                  console.log(`[DELETE] Found item: ${item.name}`);
                  if (item.url && item.url.startsWith('/live/')) {
                    fileToDelete = item.url.replace('/live/', '');
                  }
                  cat.items.splice(itemIndex, 1);
                }
                return cat;
              }).filter(cat => cat.items.length > 0 || (cat.category !== 'Downloaded' && cat.category !== 'Movies'));

              if (!found) {
                console.warn(`[DELETE] movieId ${movieId} not found in catalog.`);
                ws.send(JSON.stringify({ type: 'error', message: 'لم يتم العثور على الفيلم في المكتبة.' }));
                return;
              }

              fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf8');

              if (fileToDelete) {
                // Remove potential leading slashes
                const cleanFileName = fileToDelete.startsWith('/') ? fileToDelete.substring(1) : fileToDelete;
                const fullPath = path.join(__dirname, '../media', cleanFileName);
                console.log(`[DELETE] Attempting to unlink: ${fullPath}`);

                try {
                  if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                    console.log(`[DELETE] Successfully deleted file: ${fullPath}`);
                  } else {
                    console.warn(`[DELETE] File not found on disk: ${fullPath}`);
                  }
                } catch (err) {
                  console.error(`[DELETE] Error unlinking file: ${err.message}`);
                }
              }

              broadcastToRoom(currentRoom, {
                type: 'chat',
                username: 'System',
                message: `🗑️ تم الحذف من المكتبة بنجاح.`,
                timestamp: Date.now()
              });
              broadcastToRoom(currentRoom, { type: 'library-updated' });
            }
          }
          break;
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  ws.on('close', () => {
    if (currentRoom) {
      const room = getRoom(currentRoom);
      room.clients.delete(ws);
      room.users.delete(username);
      broadcastToRoom(currentRoom, {
        type: 'user-left',
        username,
        userCount: room.clients.size
      });
      if (room.clients.size === 0) {
        rooms.delete(currentRoom);
        console.log(`Room ${currentRoom} deleted (empty)`);
      }
      console.log(`${username} left room ${currentRoom}`);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
