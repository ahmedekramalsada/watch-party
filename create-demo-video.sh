#!/bin/bash

# Create a test video for demo purposes
# This generates a simple test pattern video if you don't have a movie file

echo "🎬 Creating Demo Video for Watch Party"
echo "======================================"
echo ""

if ! command -v ffmpeg &> /dev/null; then
    echo "❌ FFmpeg not found. Please install it first."
    exit 1
fi


mkdir -p media
OUTPUT="media/movie.mp4"

echo "📹 Generating 60-second test video..."
echo ""

# Create a test video with:
# - Color bars pattern
# - Timer overlay
# - Audio tone
# - 60 seconds duration

ffmpeg -f lavfi -i testsrc=duration=60:size=1280x720:rate=30 \
       -f lavfi -i sine=frequency=1000:duration=60 \
       -vf "drawtext=text='Watch Party Test Video':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=100,
            drawtext=text='%{pts\:hms}':fontsize=36:fontcolor=yellow:x=(w-text_w)/2:y=200" \
       -c:v libx264 -preset fast -crf 23 \
       -c:a aac -b:a 128k \
       -movflags +faststart \
       "$OUTPUT" \
       -y

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Demo video created successfully!"
    echo ""
    echo "📁 Location: $OUTPUT"
    echo "📊 Size: $(du -h "$OUTPUT" | cut -f1)"
    echo ""
    echo "🚀 You can now start the server:"
    echo "   ./start.sh"
    echo ""
    echo "💡 Replace this with your actual movie later:"
    echo "   ./upload-video.sh /path/to/your/movie.mp4"
else
    echo ""
    echo "❌ Failed to create demo video"
    exit 1
fi
