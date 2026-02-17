#!/bin/sh

# Start backend in background on port 3000
echo "Starting Backend..."
cd /app/backend
PORT=3000 node server.js &

# Wait for backend to be ready
echo "Waiting for backend..."
sleep 2

# Start Nginx in foreground
echo "Starting Nginx..."
exec nginx -g "daemon off;"
