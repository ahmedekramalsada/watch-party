FROM nginx:alpine

# Copy custom Nginx config
COPY zeabur-nginx.conf /etc/nginx/nginx.conf

# Copy Frontend
COPY frontend /usr/share/nginx/html

# Copy Media (The movie needs to be in media/movie.mp4)
COPY media /usr/share/nginx/html/live

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
