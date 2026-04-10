class WishlistManager {
    static STORAGE_KEY = 'moviepox_wishlist_v1';

    /**
     * Toggles an item in the wishlist.
     */
    static async toggle(item) {
        if (!item || !item.id) return;

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
                poster_path: item.poster_path,
                backdrop_path: item.backdrop_path,
                media_type: item.media_type || (item.first_air_date ? 'tv' : 'movie'),
                vote_average: item.vote_average,
                release_date: item.release_date || item.first_air_date,
                timestamp: Date.now()
            });
            console.log(`[Wishlist] Added: ${item.title || item.name}`);
        }

        if (user) {
            await this.saveToDb(user.uid, wishlist);
        } else {
            this.saveToLocal(wishlist);
        }

        this.render();
        return !exists; // Returns true if added, false if removed
    }

    static async isWishlisted(id) {
        const wishlist = await this.get();
        return wishlist.some(item => item.id === id);
    }

    static async get() {
        const user = window.firebaseAuth?.currentUser;

        if (user) {
            try {
                const snapshot = await window.firebaseDb.ref(`wishlist/${user.uid}`).once('value');
                return snapshot.val() || [];
            } catch (e) {
                console.error("Cloud wishlist error:", e);
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

    static saveToLocal(wishlist) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(wishlist));
    }

    static async saveToDb(uid, wishlist) {
        return window.firebaseDb.ref(`wishlist/${uid}`).set(wishlist);
    }

    static async syncLocalToCloud(uid) {
        const localItems = this.getFromLocal();
        const cloudItems = await this.get();

        if (localItems.length === 0) {
            this.render();
            return;
        }

        // Merge logic
        const merged = [...cloudItems];
        localItems.forEach(localItem => {
            if (!merged.some(item => item.id === localItem.id)) {
                merged.push(localItem);
            }
        });

        const finalWishlist = merged.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        await this.saveToDb(uid, finalWishlist);
        this.saveToLocal([]);
        this.render();
    }

    static async render() {
        const container = document.getElementById('wishlistContainer');
        const section = document.getElementById('watch-later-section');

        if (!container || !section) return;

        // Safety check: wait for API to be ready
        if (!window.tmdbAPI || !window.tmdbAPI.imageBase) {
            setTimeout(() => this.render(), 500);
            return;
        }

        const wishlist = await this.get();

        if (wishlist.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        container.innerHTML = '';

        wishlist.forEach(item => {
            const card = window.uiManager.createContentCard(item, item.media_type, true); // Pass true to show remove button
            container.appendChild(card);
        });

        if (window.lucide) window.lucide.createIcons();
    }

    static async remove(id) {
        const user = window.firebaseAuth?.currentUser;
        let wishlist = await this.get();
        wishlist = wishlist.filter(item => item.id !== id);

        if (user) {
            await this.saveToDb(user.uid, wishlist);
        } else {
            this.saveToLocal(wishlist);
        }

        this.render();
    }
}

window.WishlistManager = WishlistManager;
