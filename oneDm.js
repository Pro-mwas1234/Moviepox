// js/oneDm.js
// 1DM integration: Android-only "Download via 1DM" button under the player in the modal

const OneDM = (() => {
  const PKG_FREE = 'idm.internet.download.manager'; // 1DM (free)
  // const PKG_PLUS = 'idm.internet.download.manager.plus'; // 1DM+ (optional support)

  function isAndroid() {
    return /Android/i.test(navigator.userAgent || '');
  }

  function buildIntentHref(mediaUrl, title) {
    const fallback = encodeURIComponent(`https://play.google.com/store/apps/details?id=${PKG_FREE}`);
    const encTitle = encodeURIComponent(title || 'Download');
    const headers = encodeURIComponent(`User-Agent: ${navigator.userAgent}
Referer: ${location.origin}`);

    // Chrome Android intent URI (string extras prefixed with S.)
    // Docs show intent:#Intent;package=...;scheme=...;S.browser_fallback_url=...;end
    // Use idmdownload scheme (as used by download managers) and include string extras supported by 1DM
    return (
      `intent:${encodeURI(mediaUrl)}#Intent;` +
      `package=${PKG_FREE};` +
      `scheme=idmdownload;` +
      `S.title=${encTitle};` +
      `S.android.media.intent.extra.HTTP_HEADERS=${headers};` +
      `S.browser_fallback_url=${fallback};` +
      `end`
    );
  }

  function getBestMediaUrl(details) {
    // If your Player has a current URL, use it; otherwise fall back to a public asset so button still works
    try {
      if (typeof Player !== 'undefined' && typeof Player.getCurrentMediaUrl === 'function') {
        const url = Player.getCurrentMediaUrl();
        if (url) return url;
      }
    } catch {}

    // Fallbacks: trailer URL if available, else backdrop/poster image
    if (details?.videos?.results?.length) {
      const yt = details.videos.results.find(v => v.site === 'YouTube' && v.key);
      if (yt) return `https://www.youtube.com/watch?v=${yt.key}`;
    }
    if (details?.backdrop_path) return `https://image.tmdb.org/t/p/original${details.backdrop_path}`;
    if (details?.poster_path) return `https://image.tmdb.org/t/p/w500${details.poster_path}`;
    return null;
  }

  function createButton(intentHref) {
    const btn = document.createElement('button');
    btn.className = 'btn-1dm-download';
    btn.type = 'button';
    btn.textContent = 'Download via 1DM';

    // Minimal Netflix-style look
    btn.style.marginTop = '12px';
    btn.style.display = 'inline-flex';
    btn.style.alignItems = 'center';
    btn.style.gap = '8px';
    btn.style.padding = '10px 14px';
    btn.style.background = '#E50914';
    btn.style.color = '#fff';
    btn.style.border = 'none';
    btn.style.borderRadius = '4px';
    btn.style.cursor = 'pointer';
    btn.style.fontSize = '14px';

    btn.addEventListener('click', () => {
      try {
        window.location.href = intentHref;
      } catch {
        window.location.href = `https://play.google.com/store/apps/details?id=${PKG_FREE}`;
      }
    });

    return btn;
  }

  function injectButton(details) {
    if (!isAndroid()) return;
    const playerSection = document.getElementById('player-section');
    const modalBody = document.getElementById('modalBody');
    const mount = playerSection || modalBody;
    if (!mount) return;

    // Prevent duplicates on repeated opens
    if (mount.querySelector('.btn-1dm-download')) return;

    const title = (details?.title || details?.name || 'Download').toString().trim().slice(0, 80);
    const mediaUrl = getBestMediaUrl(details);
    if (!mediaUrl) return;

    const intentHref = buildIntentHref(mediaUrl, title);
    const btn = createButton(intentHref);

    // Prefer to place after server selector beneath the player, else append at end
    if (playerSection) {
      const afterSelector = playerSection.querySelector('.server-selector');
      if (afterSelector?.parentNode) {
        afterSelector.parentNode.insertBefore(btn, afterSelector.nextSibling);
      } else {
        playerSection.appendChild(btn);
      }
    } else {
      mount.appendChild(btn);
    }
  }

  // Public API: call when modal opens with details loaded
  function onModalOpen(details) {
    try {
      injectButton(details);
    } catch {
      // no-op
    }
  }

  return { onModalOpen };
})();