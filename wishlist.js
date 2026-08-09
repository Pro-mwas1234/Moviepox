class WishlistManager {
    static STORAGE_KEY = 'moviepox_wishlist_v1';
    static _listener = null;      // Active Firebase real-time listener ref
    static _cache = null;         // In-memory cache (avoids redundant DB reads)
    static _uid = null;           // UID of the currently subscribed user

    // ─── Real-time Cloud Listener ─────────────────────────────────────────────

    /**
     * Attach a real-time Firebase listener for the logged-in user's wishlist.
     * Any change from another device instantly updates local cache + re-renders.
     */
    static attachListener(uid) {
        // Detach previous listener if switching accounts
        this.detachListener();

        this._uid = uid;
        const ref = window.firebaseDb.ref(`wishlist/${uid}`);

        this._listener = ref.on('value', (snapshot) => {
            const val = snapshot.val();
            const wishlist = val
                ? (Array.isArray(val) ? val : Object.values(val))
                : [];

            // Update local cache + localStorage
            this._cache = wishlist;
            this.saveToLocal(wishlist);

            // Re-render the bucket list section
            this.render();
        }, (err) => {
            console.warn('[Wishlist] Real-time listener error:', err.message);
        });
    }

    /**
     * Detach the Firebase listener (called on logout or user switch).
     */
    static detachListener() {
        if (this._listener && this._uid) {
            window.firebaseDb.ref(`wishlist/${this._uid}`).off('value', this._listener);
        }
        this._listener = null;
        this._uid = null;
        this._cache = null;
    }

    // ─── Core CRUD ────────────────────────────────────────────────────────────

    /**
     * Toggles an item in/out of the wishlist.
     * Returns true if item was added, false if removed.
     */
    static async toggle(item) {
        if (!item || !item.id) {
            console.error('[Wishlist] Cannot toggle: Invalid item data');
            return false;
        }

        try {
            const user = window.firebaseAuth?.currentUser;
            let wishlist = await this.get();
            const exists = wishlist.some(i => i.id === item.id);

            if (exists) {
                wishlist = wishlist.filter(i => i.id !== item.id);
                console.log(`[Wishlist] Removed: ${item.title || item.name}`);
            } else {
                wishlist.unshift({
                    id: item.id,
                    title: item.title || item.name,
                    poster_path: item.poster_path || null,
                    backdrop_path: item.backdrop_path || null,
                    media_type: item.media_type || (item.first_air_date ? 'tv' : 'movie'),
                    vote_average: item.vote_average || null,
                    release_date: item.release_date || item.first_air_date || null,
                    timestamp: Date.now()
                });
                console.log(`[Wishlist] Added: ${item.title || item.name}`);
            }

            // Update cache immediately for snappy UI
            this._cache = wishlist;
            this.saveToLocal(wishlist);

            if (user) {
                // Cloud write — listener will pick it up and re-render
                await this.saveToDb(user.uid, wishlist);
            } else {
                // No user — render manually since no listener
                this.render();
            }

            return !exists;
        } catch (error) {
            console.error('[Wishlist] Toggle failed:', error);
            return false;
        }
    }

    static async isWishlisted(id) {
        const wishlist = await this.get();
        return wishlist.some(item => item.id === id);
    }

    /**
     * Get the current wishlist.
     * When logged in, returns in-memory cache (kept fresh by real-time listener).
     * Falls back to localStorage for guest users.
     */
    static async get() {
        const user = window.firebaseAuth?.currentUser;

        if (user) {
            // If cache is populated by the listener, use it immediately
            if (this._cache !== null) return this._cache;

            // First call before listener fires — fetch once from DB
            try {
                const snapshot = await window.firebaseDb.ref(`wishlist/${user.uid}`).once('value');
                const val = snapshot.val();
                const wishlist = val
                    ? (Array.isArray(val) ? val : Object.values(val))
                    : [];
                this._cache = wishlist;
                return wishlist;
            } catch (e) {
                console.warn('[Wishlist] Cloud read failed, using local cache:', e.message);
                return this.getFromLocal();
            }
        }

        return this.getFromLocal();
    }

    static async remove(id) {
        const user = window.firebaseAuth?.currentUser;
        let wishlist = await this.get();
        wishlist = wishlist.filter(item => item.id !== id);

        this._cache = wishlist;
        this.saveToLocal(wishlist);

        if (user) {
            try {
                await this.saveToDb(user.uid, wishlist);
                // Listener will re-render
            } catch (dbErr) {
                this.render();
            }
        } else {
            this.render();
        }
    }

    // ─── Sync (called on login) ───────────────────────────────────────────────

    /**
     * Called when the user logs in.
     * 1. Attaches real-time listener (cloud is source of truth from now on)
     * 2. Merges any local-only items into cloud (so offline additions aren't lost)
     */
    static async syncOnLogin(uid) {
        // Attach real-time listener first — this populates the cache ASAP
        this.attachListener(uid);

        // Merge local items that don't exist in cloud
        const localItems = this.getFromLocal();
        if (localItems.length === 0) return;

        // Wait a moment for the listener's first snapshot
        await new Promise(resolve => setTimeout(resolve, 800));

        const cloudItems = this._cache || [];
        let merged = [...cloudItems];
        let changed = false;

        localItems.forEach(localItem => {
            if (!merged.some(item => item.id === localItem.id)) {
                merged.push(localItem);
                changed = true;
            }
        });

        if (changed) {
            merged = merged.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            try {
                await this.saveToDb(uid, merged);
                console.log('[Wishlist] Merged local items into cloud.');
            } catch (err) {
                console.warn('[Wishlist] Merge failed:', err.message);
            }
        }
    }

    /**
     * Called when the user logs out.
     * Detaches listener and clears local cache so it doesn't bleed into next session.
     */
    static onLogout() {
        this.detachListener();
        this.saveToLocal([]); // Clear cache for this device
        this.render();
    }

    // ─── Storage Helpers ──────────────────────────────────────────────────────

    static getFromLocal() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || [];
        } catch {
            return [];
        }
    }

    static saveToLocal(wishlist) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(wishlist));
    }

    static async saveToDb(uid, wishlist) {
        // Store as an array; Firebase Realtime DB converts it to an object if > 10 items
        // so we wrap it back to an array-safe format using numeric keys
        const safeData = {};
        wishlist.forEach((item, i) => { safeData[i] = item; });
        return window.firebaseDb.ref(`wishlist/${uid}`).set(safeData);
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    static async render() {
        const container = document.getElementById('wishlistContainer');
        const section = document.getElementById('watch-later-section');
        if (!container || !section) return;

        // Wait for API + UI manager to be ready
        if (!window.tmdbAPI?.imageBase || !window.uiManager) {
            setTimeout(() => this.render(), 500);
            return;
        }

        const wishlist = await this.get();

        if (!wishlist || wishlist.length === 0) {
            section.style.display = 'block';
            container.innerHTML = `
                <div class="empty-bucket-msg">
                    <i data-lucide="list-plus" style="width: 48px; height: 48px; opacity: 0.2; margin-bottom: 1rem;"></i>
                    <p>Your bucket list is empty. Start adding some movies!</p>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        section.style.display = 'block';
        container.innerHTML = '';

        wishlist.forEach(item => {
            const card = window.uiManager.createContentCard(item, item.media_type, 'wishlist');
            container.appendChild(card);
        });

        if (window.lucide) window.lucide.createIcons();
    }
}

window.WishlistManager = WishlistManager;
