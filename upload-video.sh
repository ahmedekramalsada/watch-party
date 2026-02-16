#!/bin/bash

# Watch Party - Video Upload Helper
# This script helps convert and prepare videos for streaming

echo "🎬 Watch Party - Video Upload Helper"
echo "====================================="
echo ""

if [ -z "$1" ]; then
    echo "Usage: ./upload-video.sh <path-to-video-file>"
    echo ""
    echo "Examples:"
    echo "  ./upload-video.sh ~/Downloads/movie.mkv"
    echo "  ./upload-video.sh /path/to/video.avi"
    exit 1
fi

INPUT_FILE="$1"
OUTPUT_FILE="media/movie.mp4"

if [ ! -f "$INPUT_FILE" ]; then
    echo "❌ File not found: $INPUT_FILE"
    exit 1
fi

echo "📁 Input:  $INPUT_FILE"
echo "📁 Output: $OUTPUT_FILE"
echo ""

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ FFmpeg not found. Installing..."
    echo ""
    echo "Please install FFmpeg:"
    echo "  Ubuntu/Debian: sudo apt install ffmpeg"
    echo "  macOS: brew install ffmpeg"
    exit 1
fi

echo "🔄 Converting video to streaming format..."
echo "   (This may take a few minutes)"
echo ""

# Convert video with optimal settings for streaming
ffmpeg -i "$INPUT_FILE" \
    -c:v libx264 \
    -preset medium \
    -crf 23 \
    -maxrate 2M \
    -bufsize 4M \
    -c:a aac \
    -b:a 128k \
    -movflags +faststart \
    "$OUTPUT_FILE" \
    -y

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Video ready for streaming!"
    echo ""
    echo "📊 File size: $(du -h "$OUTPUT_FILE" | cut -f1)"
    echo ""
    echo "🚀 Start the server with: ./start.sh"
else
    echo ""
    echo "❌ Conversion failed. Check the error above."
    exit 1
fi
