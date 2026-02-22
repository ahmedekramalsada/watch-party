FROM node:18-alpine

WORKDIR /app

# Install Dependencies (Nginx, Python3, yt-dlp)
RUN apk add --no-cache nginx python3 py3-pip \
    && pip install --no-cache-dir yt-dlp --break-system-packages

# Setup Backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production
COPY backend/server.js ./backend/

# Setup Frontend (Vanilla JS - No build needed)
COPY frontend /usr/share/nginx/html

# Setup Media
# Since we are one container, frontend serves media from /live
# Nginx config aliases /live/ -> /usr/share/nginx/html/live/
COPY media /usr/share/nginx/html/live

# Nginx Config
COPY zeabur-nginx.conf /etc/nginx/nginx.conf

# Startup Script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Expose Zeabur Port
EXPOSE 8080

CMD ["/start.sh"]