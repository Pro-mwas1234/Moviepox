/**
 * ShareRouter.js - URL routing and sharing for Equanta
 * Handles deep linking (e.g., /12345/ for movies, /12345/S05%20E01/ for TV episodes)
 * Updates URL when media plays and provides share functionality
 */

(function () {
  const ShareRouter = {
    initialized: false,

    /**
     * Initialize router on page load
     * Call this once in your main.js after playerManager is ready
     */
    init() {
      if (this.initialized) return;
      this.initialized = true;

      // Handle URL on first load
      this.handleInitialURL();

      // Setup share button
      this.setupShareButton();

      // Listen for manual URL changes (back/forward buttons)
      window.addEventListener('hashchange', () => {
        this.handleInitialURL();
      });

      console.log('[ShareRouter] Initialized');
    },

    /**
     * Read URL on first load and open the right media if present
     * Handles both movies (/123/) and TV episodes (/123/S05%20E01/)
     */
    handleInitialURL() {
    handleInitialURL() {
  const raw = window.location.hash || '';
  const hash = raw.replace(/^#/?/, ''); // remove leading # or #/
  if (!hash) {
    console.log('[ShareRouter] No hash, staying on home');
    return;
  }

  const parts = hash.split('/').filter(Boolean);
  const id = parseInt(parts[0], 10);
  if (!id || Number.isNaN(id)) {
    console.warn('[ShareRouter] Invalid ID in hash:', parts[0]);
    return;
  }

  if (parts.length === 1) {
    // Movie: #/12345
    if (window.playerManager) {
      window.playerManager.openPlayer(id, 'movie');
    }
  } else {
    // TV: #/12345/S05%20E01
    const decoded = decodeURIComponent(parts[1]); // "S05 E01"
    const match = decoded.match(/^S(d{2})sE(d{2})$/i);
    let season = 1, episode = 1;
    if (match) {
      season = parseInt(match[1], 10);
      episode = parseInt(match[2], 10);
    }
    if (window.playerManager) {
      window.playerManager.openPlayer(id, 'tv', { season, episode });
    }
  }
}

    /**
     * Update browser URL when media/episode changes
     * @param {number} id - TMDb ID
     * @param {string} type - 'movie' or 'tv'
     * @param {number} season - Season number (TV only)
     * @param {number} episode - Episode number (TV only)
     */
    updateURL(id, type, season = 1, episode = 1) {
  let hash;

  if (type === 'tv') {
    const sStr = String(season).padStart(2, '0');
    const eStr = String(episode).padStart(2, '0');
    const segment = `S${sStr} E${eStr}`;
    hash = `#/${id}/${encodeURIComponent(segment)}`;
  } else {
    hash = `#/${id}`;
  }

  window.location.hash = hash;
  console.log('[ShareRouter] Hash updated to:', hash);
}

      const newUrl = window.location.origin + path;

      // Use replaceState (don't add to history) for smooth switching
      window.history.replaceState({}, '', newUrl);

      console.log('[ShareRouter] URL updated to:', newUrl);
    },

    /**
     * Setup share button
     * Supports native share (mobile), clipboard (desktop), or fallback prompt
     */
    setupShareButton() {
      const btn = document.getElementById('shareBtn');
      if (!btn) {
        console.warn('[ShareRouter] Share button #shareBtn not found in DOM');
        return;
      }

      btn.onclick = async () => {
        const url = window.location.href;
        const title = document.title || 'Equanta';
        const text = 'Watch this on Equanta';

        try {
          // Native share API (mobile, some desktop)
          if (navigator.share) {
            await navigator.share({
              title,
              text,
              url
            });
            console.log('[ShareRouter] Shared via native API');
          }
          // Clipboard API (modern desktop browsers)
          else if (navigator.clipboard) {
            await navigator.clipboard.writeText(url);
            alert('âœ“ Link copied to clipboard');
            console.log('[ShareRouter] Copied to clipboard:', url);
          }
          // Fallback: prompt user to copy
          else {
            prompt('Copy this link to share:', url);
            console.log('[ShareRouter] Used fallback prompt');
          }
        } catch (error) {
          console.error('[ShareRouter] Share error:', error);
          alert('Unable to share. Try copying the URL from the address bar.');
        }
      };

      console.log('[ShareRouter] Share button ready');
    },

    /**
     * Get current URL for manual sharing
     * @returns {string} Current shareable URL
     */
    getCurrentShareURL() {
      return window.location.href;
    }
  };

  // Expose globally so player.js can access it
  window.ShareRouter = ShareRouter;

  console.log('[ShareRouter] Module loaded (call ShareRouter.init() to start)');
})();
