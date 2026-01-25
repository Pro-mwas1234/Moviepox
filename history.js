class HistoryManager {
    static STORAGE_KEY = 'moviepox_history_v2';
    static MAX_ITEMS = 15;

    /**
     * Adds a movie to history. Saves to DB if logged in, otherwise to LocalStorage.
     */
    static async add(movie) {
        if (!movie || !movie.id) return;

        const user = window.firebaseAuth?.currentUser;
        let history = await this.get();

        // Remove duplicate if exists
        history = history.filter(item => item.id !== movie.id);

        // Add to front
        history.unshift({
            id: movie.id,
            title: movie.title || movie.name,
            poster_path: movie.poster_path,
            backdrop_path: movie.backdrop_path,
            media_type: movie.media_type || (movie.first_air_date ? 'tv' : 'movie'),
            timestamp: Date.now()
        });

        // Limit items
        if (history.length > this.MAX_ITEMS) {
            history = history.slice(0, this.MAX_ITEMS);
        }

        if (user) {
            await this.saveToDb(user.uid, history);
        } else {
            this.saveToLocal(history);
        }

        this.render();
    }

    /**
     * Gets history. Fetches from DB if logged in, otherwise from LocalStorage.
     */
    static async get() {
        const user = window.firebaseAuth?.currentUser;

        if (user) {
            try {
                const snapshot = await window.firebaseDb.ref(`history/${user.uid}`).once('value');
                return snapshot.val() || [];
            } catch (e) {
                console.error("Cloud history error:", e);
                return this.getFromLocal();
            }
        }

        return this.getFromLocal();
    }

    static getFromLocal() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || [];
        } catch {
            return [];
        }
    }

    static saveToLocal(history) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
    }

    static async saveToDb(uid, history) {
        return window.firebaseDb.ref(`history/${uid}`).set(history);
    }

    /**
     * Moves local history to DB. Called on login.
     */
    static async syncLocalToCloud(uid) {
        const localHistory = this.getFromLocal();
        const cloudHistory = await this.get();

        // If nothing to sync, just render what's in the cloud
        if (localHistory.length === 0) {
            this.render();
            return;
        }

        // Merge - Cloud priority, then Local unique items
        const merged = [...cloudHistory];
        localHistory.forEach(localItem => {
            if (!merged.some(item => item.id === localItem.id)) {
                merged.push(localItem);
            }
        });

        // Limit and save
        const finalHistory = merged.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, this.MAX_ITEMS);
        await this.saveToDb(uid, finalHistory);

        // Clear local
        this.saveToLocal([]);
        this.render();
    }

    static async render() {
        const container = document.getElementById('recentlyWatchedContainer');
        const section = document.getElementById('recently-watched-section');

        // Safety check: wait for API to be ready
        if (!window.tmdbAPI || !window.tmdbAPI.imageBase) {
            setTimeout(() => this.render(), 500);
            return;
        }

        const history = await this.get();

        if (!container || !section) return;

        if (history.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        container.innerHTML = history.map(item => `
            <div class="content-card" onclick="uiManager.openDetail(${item.id}, '${item.media_type}')">
                <img src="${window.tmdbAPI.getImageURL(item.poster_path, 'w342')}" alt="${item.title}" loading="lazy">
                <div class="card-overlay">
                    <div class="card-play">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"></path>
                        </svg>
                    </div>
                </div>
                <div class="card-info">
                    <h3 class="card-title">${item.title}</h3>
                </div>
            </div>
        `).join('');

        if (window.lucide) window.lucide.createIcons();
    }

    static async clear() {
        const user = window.firebaseAuth?.currentUser;
        if (user) {
            await window.firebaseDb.ref(`history/${user.uid}`).remove();
        }
        this.saveToLocal([]);
        this.render();
    }
}

window.HistoryManager = HistoryManager;
