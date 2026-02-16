# Watch Party - Deployment Commands Cheatsheet

## 🎬 Initial Setup

# 1. Navigate to project
cd watchparty

# 2. Add your video file (choose one method):

# Method A: Direct copy
cp /path/to/your/movie.mp4 media/movie.mp4

# Method B: Convert with helper script
./upload-video.sh /path/to/video.mkv

# Method C: Manual FFmpeg conversion
ffmpeg -i input.mkv -c:v libx264 -c:a aac -movflags +faststart media/movie.mp4

# Method D: Stream from external source (no file needed)
ffmpeg -re -i movie.mp4 -c copy -f flv rtmp://localhost:1935/live/movie

## 🚀 Start Services

# Easy way (recommended)
./start.sh

# Manual way
docker-compose up -d

# With live logs
docker-compose up

# Rebuild containers after code changes
docker-compose up -d --build

## 📊 Monitoring

# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f websocket
docker-compose logs -f srs
docker-compose logs -f nginx

# Check running services
docker-compose ps

# Check service health
docker-compose ps | grep Up

## 🔄 Service Management

# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart websocket
docker-compose restart srs

# Stop services (keep data)
docker-compose stop

# Stop and remove containers (keep data)
docker-compose down

# Stop and remove everything including volumes
docker-compose down -v

## 🐛 Troubleshooting

# Check if video is accessible
curl -I http://localhost/live/movie.m3u8

# Test WebSocket connection
curl http://localhost/ws

# Check NGINX configuration
docker-compose exec nginx nginx -t

# Enter container for debugging
docker-compose exec websocket sh
docker-compose exec srs sh

# View container resource usage
docker stats

# Check port conflicts
sudo lsof -i :80
sudo lsof -i :1935

## 🔧 Configuration Changes

# Edit environment variables
nano .env

# Edit NGINX config
nano nginx/nginx.conf

# Apply NGINX changes
docker-compose restart nginx

# Edit WebSocket server
nano websocket/server.js
docker-compose restart websocket

## 📱 Network Access

# Find your local IP (Linux/Mac)
hostname -I

# Find your local IP (alternative)
ip addr show | grep inet

# Test from another device
curl http://YOUR_IP

## 🌐 Public Deployment

# Using ngrok (quick)
ngrok http 80

# Using Tailscale (secure)
tailscale up
# Share your Tailscale IP

# Production deployment checklist:
# 1. Get a domain
# 2. Point DNS to server
# 3. Install certbot
sudo apt install certbot python3-certbot-nginx
# 4. Get SSL certificate
sudo certbot --nginx -d yourdomain.com
# 5. Update nginx config to use SSL

## 🎨 Customization

# Change frontend
nano frontend/index.html
nano frontend/room.html
nano frontend/style.css
# No restart needed - just refresh browser

# Add new features to WebSocket
nano websocket/server.js
docker-compose restart websocket

## 🗑️ Cleanup

# Remove unused Docker images
docker image prune -a

# Remove stopped containers
docker container prune

# Clean up everything Docker-related
docker system prune -a --volumes

# Delete only Watch Party containers
docker-compose down -v
docker rmi watchparty-websocket

## 📦 Backup & Restore

# Backup configuration
tar -czf watchparty-backup.tar.gz docker-compose.yml nginx/ websocket/ frontend/ .env

# Restore from backup
tar -xzf watchparty-backup.tar.gz

# Backup video files
cp media/*.mp4 /backup/location/

## 🔐 Security (Production)

# Enable firewall
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Change default ports in docker-compose.yml
# ports:
#   - "8080:80"  # Instead of 80:80

# Add basic auth to NGINX
sudo apt install apache2-utils
htpasswd -c nginx/.htpasswd username

# Update nginx.conf with:
# auth_basic "Restricted";
# auth_basic_user_file /etc/nginx/.htpasswd;

## ⚡ Performance Optimization

# Increase WebSocket connections (in websocket/server.js)
# const wss = new WebSocket.Server({ port: 3000, maxPayload: 5 * 1024 * 1024 });

# Lower video bitrate for slower connections
ffmpeg -i input.mp4 -b:v 1M -maxrate 1M -bufsize 2M output.mp4

# Enable NGINX caching (in nginx.conf)
# proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m;

## 📈 Scaling

# Run multiple instances (load balancing)
docker-compose up -d --scale websocket=3

# Use external database for state (advanced)
# Implement Redis for WebSocket state sharing

## 🧪 Testing

# Test HLS stream directly
vlc http://localhost/live/movie.m3u8

# Test WebSocket with wscat
npm install -g wscat
wscat -c ws://localhost/ws

# Load test
npm install -g artillery
artillery quick --count 10 --num 100 http://localhost

## 🔄 Updates

# Pull latest changes (if from git)
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Update specific image
docker-compose pull srs
docker-compose up -d srs

## 💾 Data Persistence

# Check volumes
docker volume ls

# Inspect volume
docker volume inspect watchparty_media

# Backup volume
docker run --rm -v watchparty_media:/data -v $(pwd):/backup ubuntu tar czf /backup/media-backup.tar.gz /data

# Restore volume
docker run --rm -v watchparty_media:/data -v $(pwd):/backup ubuntu tar xzf /backup/media-backup.tar.gz -C /

## 🎯 Quick Commands Reference

Start:      ./start.sh
Stop:       docker-compose down
Logs:       docker-compose logs -f
Restart:    docker-compose restart
Status:     docker-compose ps
Rebuild:    docker-compose up -d --build
Clean:      docker-compose down -v && docker system prune -af

## 🆘 Emergency Recovery

# If everything breaks:
docker-compose down -v
docker system prune -af
docker-compose up -d --build

# If only WebSocket is broken:
docker-compose restart websocket

# If video won't play:
docker-compose logs srs
# Check if movie.mp4 exists in media/

# If NGINX errors:
docker-compose exec nginx nginx -t
docker-compose restart nginx
