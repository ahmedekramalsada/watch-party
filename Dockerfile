FROM node:22-alpine AS builder

WORKDIR /app

# Copy backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Copy frontend
COPY frontend ./frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install && npm run build

# Final stage
FROM node:22-alpine

WORKDIR /app

# Install nginx
RUN apk add --no-cache nginx

# Copy backend from builder
COPY --from=builder /app/backend ./backend

# Copy built frontend
COPY --from=builder /app/frontend/dist ./frontend/dist

# Copy nginx config
COPY zeabur-nginx.conf /etc/nginx/nginx.conf

# Create startup script
RUN echo '#!/bin/sh\n\
cd /app/backend && node server.js &\n\
nginx -g "daemon off;"\n\
' > /start.sh && chmod +x /start.sh

EXPOSE 8080

CMD ["/start.sh"]