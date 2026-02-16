#!/bin/bash

echo "🎬 Watch Party - Quick Start"
echo "============================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker found"
echo ""

# Check for video file
if [ ! -f "media/movie.mp4" ]; then
    echo "⚠️  No video file found at media/movie.mp4"
    echo ""
    echo "Please add your video file:"
    echo "  cp /path/to/your/video.mp4 media/movie.mp4"
    echo ""
    echo "Or convert an existing file:"
    echo "  ffmpeg -i input.mkv -c:v libx264 -c:a aac media/movie.mp4"
    echo ""
    read -p "Do you want to continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "🚀 Starting Watch Party..."
echo ""

# Start services
docker-compose up -d

echo ""
echo "⏳ Waiting for services to start..."
sleep 5

# Check if services are running
if [ "$(docker-compose ps -q | wc -l)" -eq 4 ]; then
    echo ""
    echo "✅ Watch Party is running!"
    echo ""
    echo "📱 Access the app:"
    echo "   Local:    http://localhost"
    
    # Get local IP
    LOCAL_IP=$(hostname -I | awk '{print $1}')
    if [ ! -z "$LOCAL_IP" ]; then
        echo "   Network:  http://$LOCAL_IP"
    fi
    
    echo ""
    echo "🎉 Share the room link with your friends!"
    echo ""
    echo "📊 View logs:    docker-compose logs -f"
    echo "🛑 Stop:         docker-compose down"
    echo ""
else
    echo ""
    echo "❌ Some services failed to start"
    echo "Check logs with: docker-compose logs"
    exit 1
fi
