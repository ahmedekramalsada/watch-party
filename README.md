# 🎬 Watch Party Ultimate

> **"Watch Together, Sync Forever."** 🚀🍿

A modern, high-performance **Watch Party** application that lets you watch movies synchronously with friends. Features real-time chat, instant seek synchronization, and a robust "Anti-Lag" system.

## ✨ Key Features

-   **🔄 Perfect Sync**: Video play/pause/seek events are synchronized instantly across all users.
-   **⚡ Force Sync Button**: One click to pull everyone to your exact timestamp if they fall behind.
-   **⏳ Smart Anti-Lag**: If anyone buffers, the video pauses for everyone automatically to keep the group together.
-   **💬 Live Chat**: Chat with your friends while watching.
-   **📚 Link Library**: Easily curate your movie list by editing a simple JSON file.
-   **🔗 Direct Link Support**: Paste any `.m3u8` or `.mp4` link directly in the room to play it.
-   **📱 Responsive Design**: Works beautifully on Desktop, Mobile, and Tablets.

---

## 🚀 Quick Start (Docker)

You can run the entire stack (Frontend + Backend + Nginx) with a single command:

```bash
# Build the image
docker build -t watchparty .

# Run the container (Port 8080)
docker run -p 8080:8080 watchparty
```

Open your browser at: `http://localhost:8080`

---

## 🛠️ How to Add Movies

The application uses a **Link-Only Library** system. You don't need to upload heavy files!

1.  Open `media/catalog.json`.
2.  Add your movie links (HLS `.m3u8` or Direct `.mp4`) like this:

```json
[
  {
    "category": "Movies",
    "items": [
      {
        "id": "my-movie",
        "name": "My Awesome Movie",
        "url": "https://example.com/movie.m3u8",
        "poster": "https://example.com/poster.jpg"
      }
    ]
  }
]
```

3.  Restart the container (or just refresh the page if mounted as a volume).

---

## ☁️ Deploy on Zeabur / Cloud

This project is "Zeabur-Ready".
1.  Push this code to GitHub.
2.  Create a Service in Zeabur.
3.  Select "Docker" as the runtime.
4.  It will automatically build and deploy!

**Note**: Ensure your environment variables (PORT) allow traffic on port 8080.

---

## 📂 Project Structure

-   `frontend/`: The User Interface (HTML/CSS/JS).
    -   `room.html`: The main player logic with WebSocket sync.
    -   `index.html`: The landing page.
-   `backend/`: Node.js WebSocket Server.
    -   `server.js`: Handles room state, sync logic, and buffering events.
-   `media/`: Configuration and static assets.
    -   `catalog.json`: Your movie library database.
-   `zeabur-nginx.conf`: Nginx configuration for serving the frontend and proxying WebSocket requests.

---

## 🛡️ License

MIT License. Free to use and modify! 
Happy Watching! 🎥

---

## ❓ Troubleshooting Video Links

If a link works for you but not for your friends:
1. **CORS Policy**: Many websites block video playback on external domains. Use links from CDNs that allow cross-origin requests.
2. **Mixed Content**: If you deploy on HTTPS, all video links **MUST** also be HTTPS. Browsers block naked `http://` links on secure sites.
3. **Format Support**: Ensure the link is either a direct MP4 or an HLS (`.m3u8`) stream. **Webpage links (ending in .html or .php) will NOT work.**

### 🔍 How to find the "Direct Link"?
If you have a webpage link with a video player:
1. **Open the page** in Chrome/Edge/Firefox.
2. **Press F12** (or Right-click -> Inspect).
3. Go to the **Network** tab.
4. Refresh the page and type `m3u8` in the filter box.
5. **Right-click** the first file that appears and select **Copy -> Copy link address**.
6. Paste that link into the Watch Party room!

4. **Ad-Blockers**: Some ad-blockers can interfere with WebSocket connections or video scripts.
