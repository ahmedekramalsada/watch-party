#!/bin/bash

# Default to movie.mp4 if no argument provided
INPUT_FILE=${1:-movie.mp4}

echo "🎬 Converting $INPUT_FILE to HLS format..."
echo "========================================"

if [ ! -f "media/$INPUT_FILE" ]; then
    echo "❌ Error: File media/$INPUT_FILE not found!"
    echo "Please place your video file in the media/ folder first."
    exit 1
fi

# Run conversion using Docker (same command we verified)
docker run --rm -v $(pwd)/media:/media jrottenberg/ffmpeg:4.1-alpine \
    -i "/media/$INPUT_FILE" \
    -c:v libx264 -c:a aac \
    -f hls -hls_time 10 -hls_list_size 0 \
    -hls_segment_filename "/media/movie_%03d.ts" \
    "/media/movie.m3u8"

# Fix permissions
sudo chmod -R 755 media/

echo ""
echo "✅ Conversion complete!"
echo "You can now refresh the page to watch."
