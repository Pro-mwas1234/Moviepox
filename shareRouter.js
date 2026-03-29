/**
 * ShareRouter.js - URL routing and sharing for Moviepox
 * Handles deep linking (e.g., #/12345 for movies, #/12345/S05%20E01 for TV episodes)
 * Updates URL when media plays and provides share functionality
 */

(function () {
  const ShareRouter = {
    initialized: false,

    /**
     * Initialize router on page load
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
     */
    handleInitialURL() {
      const raw = window.location.hash || '';
      const hash = raw.replace(/^#\/?/, ''); // remove leading # or #/
      
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
        const match = decoded.match(/^S(\d{2})\sE(\d{2})$/i);
        let season = 1, episode = 1;
        
        if (match) {
          season = parseInt(match[1], 10);
          episode = parseInt(match[2], 10);
        }
        
        if (window.playerManager) {
          window.playerManager.openPlayer(id, 'tv', { season, episode });
        }
      }
    },

    /**
     * Update browser URL when media/episode changes
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

      // Update without triggering another hashchange if possible
      window.location.hash = hash;
      console.log('[ShareRouter] Hash updated to:', hash);
    },

    /**
     * Setup share button
     */
    setupShareButton() {
      const btn = document.getElementById('shareBtn');
      if (!btn) {
        console.warn('[ShareRouter] Share button #shareBtn not found in DOM');
        return;
      }

      btn.onclick = async () => {
        const url = window.location.href;
        const title = document.title || 'Moviepox';
        const text = 'Check out this title on Moviepox 🎬';

        try {
          if (navigator.share) {
            await navigator.share({ title, text, url });
            console.log('[ShareRouter] Shared via native API');
          } else if (navigator.clipboard) {
            await navigator.clipboard.writeText(url);
            alert('✓ Link copied to clipboard');
          } else {
            prompt('Copy this link to share:', url);
          }
        } catch (error) {
          console.error('[ShareRouter] Share error:', error);
        }
      };
    },

    /**
     * Get current URL for manual sharing
     */
    getCurrentShareURL() {
      return window.location.href;
    }
  };

  // Expose globally
  window.ShareRouter = ShareRouter;
  console.log('[ShareRouter] Module loaded');
})();
