import os
import json
import subprocess
import argparse
import time
import sys
import re
from urllib.parse import urlparse

def sanitize_filename(name):
    """Sanitize title to be a safe filename and ID."""
    # Remove special characters and replace spaces with hyphens
    name = re.sub(r'[^\w\s-]', '', name).strip()
    # Replace any sequence of whitespace or hyphens with a single hyphen
    return re.sub(r'[-\s]+', '-', name)

def add_to_catalog(title, file_path):
    # Use absolute path to be safe
    script_dir = os.path.dirname(os.path.abspath(__file__))
    catalog_path = os.path.join(script_dir, 'media', 'catalog.json')
    
    print(f"📖 Updating catalog at: {catalog_path}")
    
    if not os.path.exists(catalog_path):
        data = []
    else:
        try:
            with open(catalog_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            print(f"❌ Error reading catalog: {e}")
            data = []

    # Find "Downloaded" category or create it
    target_category = next((c for c in data if c['category'] == 'Downloaded'), None)
    if not target_category:
        target_category = {"category": "Downloaded", "items": []}
        data.insert(0, target_category) # Put newly downloaded at the top

    # Add new item
    item_id = sanitize_filename(title).lower()
    new_item = {
        "id": item_id,
        "name": title,
        "url": f"/live/{os.path.basename(file_path)}",
        "poster": "" 
    }
    
    # Avoid exact duplicate IDs in the same category
    if not any(item['id'] == item_id for item in target_category['items']):
        target_category['items'].insert(0, new_item) # Put newest at the top
        
    with open(catalog_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Added '{title}' to catalog.json")

def download_video(url, title):
    if not os.path.exists('media'):
        os.makedirs('media')

    # Extract Referer (e.g., https://egydead.co/)
    parsed_url = urlparse(url)
    referer = f"{parsed_url.scheme}://{parsed_url.netloc}/"

    print(f"🚀 Downloading from: {url}")
    print(f"📡 Using Referer: {referer}")
    
    # Check if it's a direct MP4 link
    is_direct_mp4 = url.lower().split('?')[0].endswith('.mp4')
    
    success = False
    actual_file = None

    try:
        if is_direct_mp4:
            ext = "mp4"
            base_name = sanitize_filename(title) if title else f"video_{int(time.time())}"
            filename = f"{base_name}.{ext}"
            file_path = os.path.join('media', filename)
            
            print(f"📦 Direct MP4 detected, using curl...")
            curl_cmd = [
                'curl', '-L', '--retry', '3',
                '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                '--referer', referer,
                '-o', file_path,
                url
            ]
            
            result = subprocess.run(curl_cmd, capture_output=True, text=True)
            if result.returncode == 0:
                success = True
                actual_file = file_path
            else:
                print(f"❌ Curl failed with code {result.returncode}")
                if result.stderr: print(f"Error details: {result.stderr[:200]}")

        if not success:
            # Fallback to yt-dlp
            print(f"🎬 Falling back to yt-dlp...")
            # Clean template
            clean_title = sanitize_filename(title) if title else "video_%(title)s"
            output_template = f"media/{clean_title}.%(ext)s"
                
            cmd = [
                'yt-dlp',
                '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                '--merge-output-format', 'mp4',
                '--referer', referer,
                '-o', output_template,
                url
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                # Find the most recent file
                files = [os.path.join('media', f) for f in os.listdir('media') if os.path.isfile(os.path.join('media', f))]
                files.sort(key=os.path.getmtime, reverse=True)
                if files:
                    actual_file = files[0]
                    success = True

        if success and actual_file:
            actual_title = title if title else os.path.splitext(os.path.basename(actual_file))[0]
            add_to_catalog(actual_title, actual_file)
            print(f"🎉 Success! File saved to {actual_file}")
            sys.exit(0)
        else:
            print(f"❌ Failed to download video from {url}")
            sys.exit(1)
        
    except Exception as e:
        print(f"❌ Unexpected error in download script: {e}")
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Download video and add to Watch Party catalog.')
    parser.add_argument('url', help='The URL of the video to download')
    parser.add_argument('--title', help='Optional title for the movie', default=None)

    args = parser.parse_args()
    download_video(args.url, args.title)
