/**
 * player-updates.js - Integration patch for shareRouter with existing playerManager
 * 
 * This file patches your existing PlayerManager.openPlayer() and episode handlers
 * to call ShareRouter.updateURL() automatically when media changes.
 * 
 * Just add this after player.js in your HTML and it will auto-integrate!
 * No modifications needed to existing player.js code.
 */

(function () {
  // Wait for playerManager to be available
  function patchPlayerManager() {
    if (!window.playerManager) {
      console.warn('[player-updates] playerManager not found, retrying...');
      setTimeout(patchPlayerManager, 500);
      return;
    }

    const originalOpenPlayer = window.playerManager.openPlayer.bind(
      window.playerManager
    );

    /**
     * Wrap openPlayer to update URL when media opens
     */
    window.playerManager.openPlayer = async function (id, mediaType, opts = {}) {
      console.log('[player-updates] openPlayer called:', id, mediaType, opts);

      // Call original openPlayer
      await originalOpenPlayer(id, mediaType, opts);

      // After opening, update URL if shareRouter is ready
      if (window.ShareRouter && window.ShareRouter.updateURL) {
        if (mediaType === 'tv') {
          window.ShareRouter.updateURL(
            id,
            mediaType,
            opts.season || this.currentSeason || 1,
            opts.episode || this.currentEpisode || 1
          );
        } else {
          window.ShareRouter.updateURL(id, mediaType);
        }
      }
    };

    console.log('[player-updates] openPlayer patched');

    // Patch setupEpisodeSelector to update URL on episode change
    if (window.playerManager.setupEpisodeSelector) {
      const originalSetupEpisode = window.playerManager.setupEpisodeSelector.bind(
        window.playerManager
      );

      window.playerManager.setupEpisodeSelector = async function () {
        // Call original
        await originalSetupEpisode();

        // Patch the episode select onchange
        const episodeSelect = document.getElementById('episodeSelect');
        if (episodeSelect) {
          const originalOnchange = episodeSelect.onchange;

          episodeSelect.onchange = (e) => {
            this.currentEpisode = parseInt(e.target.value, 10);
            this.loadServer();

            // Update URL when episode changes
            if (
              window.ShareRouter &&
              window.ShareRouter.updateURL &&
              this.currentId &&
              this.currentType === 'tv'
            ) {
              window.ShareRouter.updateURL(
                this.currentId,
                'tv',
                this.currentSeason,
                this.currentEpisode
              );
            }

            // Call original onchange if it existed
            if (typeof originalOnchange === 'function') {
              originalOnchange.call(episodeSelect, e);
            }
          };

          console.log('[player-updates] Episode select patched');
        }
      };
    }

    // Patch setupSeasonEpisodeSelector to update URL on season change
    if (window.playerManager.setupSeasonEpisodeSelector) {
      const originalSetupSeason = window.playerManager.setupSeasonEpisodeSelector.bind(
        window.playerManager
      );

      window.playerManager.setupSeasonEpisodeSelector = async function () {
        // Call original
        await originalSetupSeason();

        // Patch the season select onchange
        const seasonSelect = document.getElementById('seasonSelect');
        if (seasonSelect) {
          seasonSelect.onchange = async (e) => {
            this.currentSeason = parseInt(e.target.value, 10);
            console.log('[player-updates] Season changed to:', this.currentSeason);

            // Rebuild episodes for new season
            await this.setupEpisodeSelector();
            this.loadServer();

            // Update URL when season changes
            if (
              window.ShareRouter &&
              window.ShareRouter.updateURL &&
              this.currentId &&
              this.currentType === 'tv'
            ) {
              window.ShareRouter.updateURL(
                this.currentId,
                'tv',
                this.currentSeason,
                this.currentEpisode
              );
            }
          };

          console.log('[player-updates] Season select patched');
        }
      };
    }

    console.log('[player-updates] All patches applied successfully');
  }

  // Start patching once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patchPlayerManager);
  } else {
    patchPlayerManager();
  }
})();
