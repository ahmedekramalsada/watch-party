const http = require('http');
const WebSocket = require('ws');
const { exec } = require('child_process');
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
            ...room.state
          }));

          // Notify others
          broadcastToRoom(currentRoom, {
            type: 'user-joined',
            username,
            userCount: room.clients.size
          }, ws);

          console.log(`${username} joined room ${currentRoom}`);
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
            exec(`yt-dlp --get-url -f "best" --no-playlist "${pageUrl}"`, (error, stdout, stderr) => {
              if (error) {
                console.error(`yt-dlp error: ${error.message}`);
                ws.send(JSON.stringify({
                  type: 'error',
                  message: 'فشل استخراج الرابط. حاول يدويًا.'
                }));
                return;
              }
              const resolvedUrl = stdout.trim();
              if (resolvedUrl) {
                console.log(`Resolved to: ${resolvedUrl}`);
                const movie = {
                  type: 'url',
                  url: resolvedUrl,
                  name: 'تم الاستخراج تلقائيًا ✨',
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
              }
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
