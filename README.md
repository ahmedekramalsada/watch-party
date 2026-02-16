# 🎬 Watch Party - Synchronous Movie Watching with Friends

A complete, production-ready application for watching movies together in perfect sync. Built with Docker, WebSockets, and HLS streaming.

---

## ✨ Features

- **🎥 Perfect Synchronization**: Play, pause, and seek synchronized across all viewers
- **💬 Live Chat**: Talk with friends while watching
- **📱 Multi-Device**: Works on phones, tablets, and computers
- **🔒 Private Rooms**: Each watch party gets a unique room code
- **⚡ Low Latency**: HLS streaming with minimal delay
- **🚀 Easy Deployment**: One command to launch everything

---

## 📋 Requirements

- Docker & Docker Compose
- A video file (MP4, MKV, etc.)
- Port 80 available (or change in docker-compose.yml)

---

## 🚀 Quick Start

### 1. Clone and Setup

```bash
cd watchparty
```

### 2. Add Your Movie

**Option A: Direct File** (Easiest)
```bash
cp /path/to/your/movie.mp4 media/movie.mp4
```

**Option A: Using Azure DevOps (Fully Automated)**
1. Create a new Pipeline in Azure DevOps using `azure-pipelines.yml`.
2. Click "Run Pipeline".
3. Enter the **Direct Link** to your `.mp4` file in the "videoUrl" field.
4. The pipeline will:
   - Download the video.
   - Convert it to HLS.
   - Push it to the repo.
   - Trigger Zeabur to redeploy.

**Option B: Using the Helper Script (Run Locally)**
1. Put your file in `media/` (e.g., `media/movie.mp4`).
2. Run the script:
   ```bash
   ./convert.sh
   ```
3. Commit and push the `media/` folder.

**Option C: Using FFmpeg Manually**
```bash
ffmpeg -i /path/to/video.mkv -c:v libx264 -c:a aac media/movie.mp4
```

**Option C: Stream with OBS/FFmpeg**
```bash
# Stream to: rtmp://localhost:1935/live/movie
ffmpeg -re -i movie.mp4 -c:v libx264 -c:a aac -f flv rtmp://localhost:1935/live/movie
```

### 3. Launch

```bash
docker-compose up -d
```

### 4. Access

Open in browser:
```
http://localhost
```

Or from other devices on your network:
```
http://YOUR_SERVER_IP
```

---

## 📖 How to Use

### Starting a Watch Party

1. Open `http://localhost` in browser
2. Enter your name
3. Enter a room name (or use the auto-generated one)
4. Click "Create Room"
5. Share the room link with friends

### Joining a Watch Party

1. Get the room link from your friend
2. Or enter the room code manually
3. Click "Join Room"
4. Enjoy synchronized watching!

---

## ⚙️ Configuration

### Change Ports

Edit `docker-compose.yml`:

```yaml
nginx:
  ports:
    - "8080:80"  # Change 80 to any port
```

### Enable HTTPS

1. Get SSL certificates (e.g., Let's Encrypt)
2. Update `nginx/nginx.conf`:

```nginx
server {
    listen 443 ssl;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    # ... rest of config
}
```

### Custom Video Source

To use a different video file name:

Edit `frontend/room.html` line 86:
```javascript
hls.loadSource('/live/YOUR_FILE_NAME.m3u8');
```

---

## 🏗️ Architecture

```
┌─────────────────┐
│   NGINX Proxy   │ ← Port 80/443
└────────┬────────┘
         │
    ┌────┴─────────────────────┐
    │                          │
┌───▼──────┐            ┌──────▼────┐
│ Frontend │            │ WebSocket │
│  (HTML)  │            │  (Rooms)  │
└──────────┘            └───────────┘
                               │
                        ┌──────▼──────┐
                        │  SRS Server │
                        │ (RTMP→HLS)  │
                        └─────────────┘
```

**Components:**
- **NGINX**: Reverse proxy and static file server
- **SRS**: Media server (RTMP ingestion, HLS output)
- **WebSocket**: Real-time sync and chat
- **Frontend**: Video player with HLS.js

---

## 🔧 Troubleshooting

### "Video not loading"

1. Check if file exists in `media/`:
   ```bash
   ls -lh media/
   ```

2. Check SRS logs:
   ```bash
   docker-compose logs srs
   ```

3. Verify HLS is working:
   ```
   http://localhost/live/movie.m3u8
   ```

### "Can't connect to room"

1. Check WebSocket service:
   ```bash
   docker-compose logs websocket
   ```

2. Try restarting:
   ```bash
   docker-compose restart websocket
   ```

### "Sync not working"

- Refresh the page
- Check browser console (F12)
- Ensure all users are in the same room

### "High latency / buffering"

1. Lower video quality:
   ```bash
   ffmpeg -i input.mp4 -b:v 2M -maxrate 2M -bufsize 4M output.mp4
   ```

2. Or use a CDN for remote viewers

---

## 📱 Mobile Access

1. Find your server IP:
   ```bash
   ip addr show | grep inet
   ```

2. On mobile, open:
   ```
   http://YOUR_SERVER_IP
   ```

3. For better mobile experience, add to home screen

---

## 🌐 Public Deployment

### Using ngrok (Quick & Easy)

```bash
ngrok http 80
```

Share the ngrok URL with friends.

### Using a VPS (Production)

1. Deploy to DigitalOcean/AWS/etc
2. Point domain to server IP
3. Set up SSL with Let's Encrypt:
   ```bash
   sudo certbot --nginx -d watchparty.yourdomain.com
   ```

4. Update `nginx/nginx.conf` for SSL

---

## 🎨 Customization

### Change Theme Colors

Edit `frontend/style.css`:

```css
:root {
    --primary: #6366f1;     /* Main color */
    --secondary: #8b5cf6;   /* Accent color */
    --bg: #0f172a;          /* Background */
}
```

### Add Password Protection

Uncomment in `websocket/server.js`:

```javascript
case 'join':
    if (message.password !== ROOM_PASSWORD) {
        ws.send(JSON.stringify({type: 'error', msg: 'Wrong password'}));
        return;
    }
    // ... rest of code
```

---

## 📊 Performance Tips

### For Large Groups (10+ users)

1. Increase WebSocket connections:
   ```javascript
   // In websocket/server.js
   const wss = new WebSocket.Server({ 
       port: 3000,
       maxPayload: 1024 * 1024 
   });
   ```

2. Use CDN for video delivery

### For Remote Viewing

1. Compress video:
   ```bash
   ffmpeg -i input.mp4 -vcodec h264 -b:v 1500k output.mp4
   ```

2. Consider adaptive bitrate streaming (HLS with multiple qualities)

---

## 🛑 Stopping the Server

```bash
docker-compose down
```

To remove all data:
```bash
docker-compose down -v
```

---

## ☁️ Deploy to Zeabur

1. **Push to GitHub**: Make sure your code is in a GitHub repository.
2. **Login to Zeabur**: Go to [Zeabur Dashboard](https://zeabur.com).
3. **Create Project**: Create a new project.
4. **Deploy Service**: Click "Deploy New Service" -> "GitHub" -> Select your repo.
5. **Effective Deployment**: Zeabur will automatically detect the `docker-compose.yml` and deploy all services.
   - **Note**: You might need to configure the `srs` service ports or networking depending on Zeabur's specific networking for RTMP (Port 1935). For basic web functionality, Zeabur handles the HTTP ports.
   - **Domains**: Assign a domain to the `nginx` service to access the application.

---

## 📝 File Structure

```
watchparty/
├── docker-compose.yml      # Main orchestration
├── .env                    # Configuration
├── README.md               # This file
├── nginx/
│   ├── Dockerfile
│   └── nginx.conf          # Reverse proxy config
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── server.js           # Sync & chat server
├── frontend/
│   ├── Dockerfile
│   ├── index.html          # Landing page
│   ├── room.html           # Watch room
│   └── style.css           # Styling
└── media/
    └── movie.mp4           # Your video file
```

---

## 🐛 Known Limitations

- Video file must be named `movie.mp4` (or change in code)
- Single video at a time per room
- No video upload UI (planned for v2)
- Chat history not persisted

---

## 🔮 Roadmap

- [ ] Video upload interface
- [ ] Multiple videos per room
- [ ] Playlist support
- [ ] Reaction emojis
- [ ] User avatars
- [ ] Admin controls (kick users, etc)
- [ ] Chat history persistence

---

## 📄 License

MIT License - Feel free to use and modify!

---

## 🤝 Support

Having issues? 

1. Check the troubleshooting section
2. Review Docker logs: `docker-compose logs`
3. Ensure all ports are available

---

## 🎉 Enjoy Your Watch Party!

Built with ❤️ for movie nights with friends 🍿
