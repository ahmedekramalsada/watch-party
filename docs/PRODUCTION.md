# Production Deployment Configuration Examples

## 1. Docker Compose for Production (docker-compose.prod.yml)

```yaml
version: '3.8'

services:
  srs:
    image: ossrs/srs:5
    container_name: watchparty-srs-prod
    volumes:
      - ./media:/usr/local/srs/objs/nginx/html/live
      - srs_logs:/var/log/srs
    environment:
      - CANDIDATE=${SERVER_IP}
    restart: always
    networks:
      - watchparty
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  websocket:
    build: ./websocket
    container_name: watchparty-ws-prod
    environment:
      - NODE_ENV=production
      - PORT=3000
    restart: always
    networks:
      - watchparty
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  frontend:
    image: nginx:alpine
    container_name: watchparty-frontend-prod
    volumes:
      - ./frontend:/usr/share/nginx/html:ro
    restart: always
    networks:
      - watchparty

  nginx:
    image: nginx:alpine
    container_name: watchparty-nginx-prod
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - nginx_cache:/var/cache/nginx
    depends_on:
      - srs
      - websocket
      - frontend
    restart: always
    networks:
      - watchparty
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

networks:
  watchparty:
    driver: bridge

volumes:
  srs_logs:
  nginx_cache:
```

## 2. NGINX Configuration with SSL (nginx/nginx.prod.conf)

```nginx
events {
    worker_connections 2048;
}

http {
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=websocket:10m rate=100r/s;

    # Cache
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=hls_cache:10m max_size=1g inactive=60m;

    upstream websocket {
        server websocket:3000;
    }

    upstream frontend {
        server frontend:80;
    }

    upstream srs {
        server srs:8080;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name watchparty.yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name watchparty.yourdomain.com;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # Security Headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # Frontend
        location / {
            limit_req zone=general burst=20 nodelay;
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket with rate limiting
        location /ws {
            limit_req zone=websocket burst=50 nodelay;
            proxy_pass http://websocket;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_read_timeout 86400;
        }

        # SRS HLS with caching
        location /live/ {
            proxy_pass http://srs/live/;
            proxy_set_header Host $host;
            
            # CORS
            add_header Access-Control-Allow-Origin *;
            add_header Access-Control-Allow-Methods 'GET, OPTIONS';
            
            # HLS Caching
            proxy_cache hls_cache;
            proxy_cache_valid 200 1m;
            proxy_cache_key $uri;
            add_header X-Cache-Status $upstream_cache_status;
            
            # HLS Headers
            add_header Cache-Control "public, max-age=2";
        }

        # SRS API
        location /api/ {
            proxy_pass http://srs:1985/api/;
            proxy_set_header Host $host;
        }
    }
}
```

## 3. Environment Variables (.env.production)

```bash
# Server Configuration
SERVER_IP=YOUR_PUBLIC_IP
DOMAIN=watchparty.yourdomain.com

# Security
ENABLE_AUTH=true
JWT_SECRET=your-super-secret-key-change-this

# Performance
MAX_WEBSOCKET_CONNECTIONS=1000
VIDEO_BITRATE=2M
HLS_SEGMENT_DURATION=6

# Monitoring
ENABLE_METRICS=true
LOG_LEVEL=info
```

## 4. SSL Certificate Setup (Let's Encrypt)

```bash
# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Stop NGINX temporarily
docker-compose down nginx

# Get certificate
sudo certbot certonly --standalone -d watchparty.yourdomain.com

# Copy certificates
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/watchparty.yourdomain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/watchparty.yourdomain.com/privkey.pem nginx/ssl/key.pem

# Set permissions
sudo chown -R $USER:$USER nginx/ssl
chmod 644 nginx/ssl/cert.pem
chmod 600 nginx/ssl/key.pem

# Start with production config
docker-compose -f docker-compose.prod.yml up -d
```

## 5. Firewall Configuration

```bash
# UFW Setup
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Or using iptables
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 1935 -j DROP  # Block external RTMP
```

## 6. Monitoring Setup

```bash
# Install monitoring tools
docker run -d \
  --name=cadvisor \
  -p 8080:8080 \
  -v /:/rootfs:ro \
  -v /var/run:/var/run:ro \
  -v /sys:/sys:ro \
  -v /var/lib/docker/:/var/lib/docker:ro \
  google/cadvisor:latest

# View metrics at http://your-server:8080
```

## 7. Backup Script (backup.sh)

```bash
#!/bin/bash

BACKUP_DIR="/backup/watchparty"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup configuration
tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" \
    docker-compose.yml \
    docker-compose.prod.yml \
    .env \
    .env.production \
    nginx/ \
    websocket/ \
    frontend/

# Backup media (if needed)
tar -czf "$BACKUP_DIR/media_$DATE.tar.gz" media/

# Keep only last 7 backups
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR"
```

## 8. Health Check Script (healthcheck.sh)

```bash
#!/bin/bash

# Check if all services are running
if [ "$(docker-compose ps -q | wc -l)" -ne 4 ]; then
    echo "ERROR: Not all services are running"
    docker-compose restart
    exit 1
fi

# Check HLS endpoint
if ! curl -f http://localhost/live/movie.m3u8 &> /dev/null; then
    echo "WARNING: HLS stream not accessible"
fi

# Check WebSocket
if ! curl -f http://localhost/ws &> /dev/null; then
    echo "WARNING: WebSocket not accessible"
    docker-compose restart websocket
fi

echo "All health checks passed"
```

## 9. Systemd Service (watchparty.service)

```ini
[Unit]
Description=Watch Party Service
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/watchparty
ExecStart=/usr/local/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.prod.yml down
ExecReload=/usr/local/bin/docker-compose -f docker-compose.prod.yml restart

[Install]
WantedBy=multi-user.target
```

```bash
# Install service
sudo cp watchparty.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable watchparty
sudo systemctl start watchparty
```

## 10. Deployment Checklist

- [ ] Update .env.production with production values
- [ ] Get SSL certificate
- [ ] Configure firewall
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Test all services
- [ ] Enable systemd service
- [ ] Configure CDN (optional)
- [ ] Set up logging
- [ ] Document access credentials
