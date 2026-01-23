# 🎬 Equanta

**Equanta** is a modern, high-speed streaming web app inspired by platforms like HiAnime — but smarter, cleaner, and faster.  
It lets users stream movies and TV shows directly using data fetched from **TMDB (The Movie Database)** API and offers **7+ embeddable servers** to switch between seamlessly — **all without page reloads**.

🌐 **Live Demo:** [https://equanta.run.place](https://equanta.run.place)

---

## 🚀 Features

- 🔁 **Multiple Streaming Servers** — Choose between 7+ servers for the best playback experience.  
- ⚡ **Single-Page Design** — Everything loads dynamically without reloading the page.  
- 🧠 **TMDB Integration** — Automatically fetches metadata, posters, ratings, and show info from TMDB.  
- 🎨 **Minimal & Fast UI** — Clean, Netflix-style layout optimized for speed and responsiveness.  
- 📱 **Responsive Design** — Works smoothly on both desktop and mobile devices.  
- 🔍 **Smart Search** — Instantly find movies or shows by name or keyword.  
- 💾 **Automatic Data Handling** — Fetches and displays show details in real time.

---

## 🧩 Tech Stack

- **Frontend:** HTML, CSS, JavaScript (Vanilla)
- **API:** [TMDB API](https://developer.themoviedb.org/)
- **Hosting:** GitHub Pages / Custom Domain via `run.place`
- **Architecture:** Single Page Application (SPA)

---

## ⚙️ How It Works

1. Fetches movie/show data from TMDB using its public API.  
2. Displays details dynamically in a single-page layout.  
3. Embeds one of several available streaming servers inside the page.  
4. Users can **switch between servers** instantly — no reload, no delay.  

---

## 📦 Setup (for Developers)

If you’d like to clone and run *Equanta* locally:

```bash
# Clone the repository
git clone https://github.com/Rishu-xd/equanta.git

# Open the project folder
cd equanta

# Start a local server (for example, using VSCode Live Server)
# Or simply open index.html in your browser