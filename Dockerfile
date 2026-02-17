FROM nginx:alpine

WORKDIR /etc/nginx

# Copy the nginx configuration file
COPY zeabur-nginx.conf /etc/nginx/nginx.conf

# Copy frontend files
COPY frontend /usr/share/nginx/html

# Copy media files
COPY media /usr/share/nginx/html/live

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]