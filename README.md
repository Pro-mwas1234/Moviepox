# 🎬 Moviepox

**Moviepox** is a high-performance, Vanilla JavaScript Single-Page Application (SPA) designed for seamless streaming of movies and TV shows. Inspired by modern platforms like HiAnime, it offers a clean, cinematic interface with advanced features like geolocation-aware content, cross-device synchronization via Firebase, and a multi-server streaming architecture.

---

## 🚀 Key Features

- 🔁 **Multi-Server Streaming** — **Vidsuper** ([`./vidsuper`](./vidsuper)) is the main internal player: a self-hosted streaming API that resolves real HLS/DASH/MP4 streams from multiple scrapers and proxies every byte through your own server (quality switching, subtitles, skip-intro). Taostream, Core, Vyla and Flax remain as fallback embed servers.
- 🌍 **Geolocation-Aware Discovery** — Automatically detects user region to serve relevant "Top Movies in Your Area" and specific categories like **Tollywood**, **Bollywood**, **Hollywood**, and **Anime**.
- 🔐 **Firebase Integration** — Full Authentication system (Login/Signup/Password Reset) and Realtime Database for persistent user data.
- 💾 **Bucket List & History** — Save titles to your "Bucket List" and track "Recently Watched" content, with seamless syncing between local storage and the cloud.
- 🔍 **Cinematic Search & Browse** — Real-time search with dropdown previews and a dedicated Genre Hub for deep exploration.
- 📺 **Advanced Player** — Supports Season/Episode selection for TV series and integrated trailer playback.
- 📱 **Responsive & Fast** — Optimized for both mobile and desktop with zero dependencies (Vanilla JS).

---

## 🛠 Tech Stack

- **Core:** Vanilla JavaScript (ES6+), HTML5, CSS3
- **Backend/Auth:** [Firebase](https://firebase.google.com/) (Authentication & Realtime Database)
- **Metadata API:** [The Movie Database (TMDB) v3](https://developer.themoviedb.org/)
- **Streaming API/Player:** [Vidsuper](./vidsuper) — self-hosted Next.js player + stream proxy (run on port 3000; the base URL is configured per-server in `config.json`)
- **Hosting:** [Cloudflare Pages](https://pages.cloudflare.com/) (Wrangler)
- **Icons:** [Lucide Icons](https://lucide.dev/)

---

## 📂 Project Structure

- `api.js`: The `TMDbAPI` class handling all data fetching and geolocation.
- `auth.js`: Logic for Firebase Auth and user profile management.
- `wishlist.js`: Manages the "Bucket List" synchronization between Firebase and LocalStorage.
- `ui.js`: `UIManager` class responsible for dynamic DOM rendering and card creation.
- `player.js`: `PlayerManager` for handling streaming embeds and TV episode logic.
- `router.js`: Handles SPA navigation and URL state.
- `config.json`: Central configuration for API keys and streaming server URLs.

---

## ⚙️ Setup & Installation

### Prerequisites
- A TMDB API Key ([Get one here](https://www.themoviedb.org/settings/api))
- A Firebase Project ([Setup here](https://console.firebase.google.com/))

### Steps
1. **Clone the repository:**
   ```bash
   git clone https://github.com/Pro-mwas1234/moviepox.git
   cd moviepox
   ```

2. **Configure API Keys:**
   Update `config.json` with your TMDB API key:
   ```json
   {
     "tmdb_api_key": "YOUR_TMDB_API_KEY",
     "tmdb_base_url": "https://api.themoviedb.org/3",
     "tmdb_image_base": "https://image.tmdb.org/t/p",
     "servers": [...]
   }
   ```
   Update `firebase_config.js` with your Firebase project credentials.

3. **Run Locally:**
   You can use a simple local server like Live Server (VS Code extension) or run:
   ```bash
   npm install
   npm run dev
   ```

---

## 🤝 Contributors
- **CLINTON GETHI**
- **SHAWN MWANGI**

---
*Disclaimer: This is an educational project. All content belongs to its respective owners.*
