import os
import json
import subprocess
import argparse

def add_to_catalog(title, file_path):
    catalog_path = 'media/catalog.json'
    if not os.path.exists(catalog_path):
        data = []
    else:
        with open(catalog_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

    # Find "Downloaded" category or create it
    target_category = next((c for c in data if c['category'] == 'Downloaded'), None)
    if not target_category:
        target_category = {"category": "Downloaded", "items": []}
        data.append(target_category)

    # Add new item
    item_id = title.lower().replace(' ', '-')
    new_item = {
        "id": item_id,
        "name": title,
        "url": f"/live/{os.path.basename(file_path)}",
        "poster": "" # Can be added manually later
    }
    
    # Avoid duplicates
    if not any(item['id'] == item_id for item in target_category['items']):
        target_category['items'].append(new_item)
        
    with open(catalog_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Added '{title}' to catalog.json")

def download_video(url, title):
    if not os.path.exists('media'):
        os.makedirs('media')

    # Use yt-dlp to download
    # %s -> title, %e -> extension
    output_template = f"media/%(title)s.%(ext)s"
    if title:
        output_template = f"media/{title}.%(ext)s"

    print(f"🚀 Downloading from: {url}")
    try:
        cmd = [
            'yt-dlp',
            '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            '--merge-output-format', 'mp4',
            '-o', output_template,
            url
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"❌ Error downloading: {result.stderr}")
            return

        # Find the actual filename (it might have changed extension or added IDs)
        # We look for the most recent file in media/
        files = [os.path.join('media', f) for f in os.listdir('media') if os.path.isfile(os.path.join('media', f))]
        files.sort(key=os.path.getmtime, reverse=True)
        
        if files:
            actual_file = files[0]
            actual_title = title if title else os.path.splitext(os.path.basename(actual_file))[0]
            add_to_catalog(actual_title, actual_file)
            print(f"🎉 Success! File saved to {actual_file}")
        
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Download video and add to Watch Party catalog.')
    parser.add_argument('url', help='The URL of the video to download')
    parser.add_argument('--title', help='Optional title for the movie', default=None)

    args = parser.parse_args()
    download_video(args.url, args.title)
