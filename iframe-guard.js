// iframe-guard.js
(function() {
  'use strict';

  const BLOCKED_DOMAINS = new Set([
    'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
    'popads.net', 'popcash.net', 'propellerads.com', 'adsterra.com',
    'taboola.com', 'outbrain.com', 'revcontent.com', 'mgid.com',
    'imasdk.googleapis.com', 'spotx.tv', 'teads.tv', 'criteo.com',
    'rubiconproject.com', 'pubmatic.com', 'openx.net', 'adnxs.com',
    'amazon-adsystem.com', 'media.net', 'moatads.com', 'doubleverify.com',
    'bit.ly', 'adf.ly', 'shorte.st', 'linkbucks.com'
  ]);

  const AD_PATTERNS = [
    /\/ads?\//i, /\/pop(up|under)/i, /clickid=/i, /aff=/i,
    /[?&]pid=/i, /[?&]subid=/i, /\/redirect\?/i, /\/track/i
  ];

  const SAFE_HOSTS = [
    'youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com',
    'twitter.com', 'x.com', 'facebook.com', 'wa.me', 't.me'
  ];

  function isAdUrl(url) {
    if (!url || url.startsWith('javascript:') || url === 'about:blank') return false;
    try {
      const u = new URL(url, window.location.href);
      const host = u.hostname.toLowerCase();
      const full = u.href.toLowerCase();

      for (const domain of BLOCKED_DOMAINS) {
        if (host === domain || host.endsWith('.' + domain)) return true;
      }
      for (const pattern of AD_PATTERNS) {
        if (pattern.test(full)) return true;
      }
      return false;
    } catch {
      return true;
    }
  }

  function isSafeUrl(url) {
    try {
      const host = new URL(url, window.location.href).hostname.toLowerCase();
      return SAFE_HOSTS.some(d => host === d || host.endsWith('.' + d));
    } catch {
      return false;
    }
  }

  class IframeGuard {
    constructor(containerId) {
      this.container = document.getElementById(containerId);
      if (!this.container) return;

      this.observer = null;
      this.interval = null;
      this.isActive = false;
    }

    start() {
      if (this.isActive) return;
      this.isActive = true;

      this.container.addEventListener('click', this.handleClick.bind(this), true);
      this.removeAdOverlays();
      this.interval = setInterval(() => this.removeAdOverlays(), 3000);

      this.observer = new MutationObserver(() => {
        setTimeout(() => this.removeAdOverlays(), 100);
      });
      this.observer.observe(this.container, { childList: true, subtree: true });
    }

    stop() {
      if (!this.isActive) return;
      this.isActive = false;

      this.container.removeEventListener('click', this.handleClick.bind(this), true);
      if (this.interval) clearInterval(this.interval);
      if (this.observer) this.observer.disconnect();
      this.cleanupNotice();
    }

    handleClick(e) {
      const anchor = e.target.closest('a');
      if (!anchor || !anchor.href) return;

      if (isAdUrl(anchor.href)) {
        e.preventDefault();
        e.stopPropagation();
        console.warn('[IframeGuard] Blocked ad navigation:', anchor.href);
        this.showNotice();
        return;
      }

      if (anchor.target === '_blank' && !isSafeUrl(anchor.href)) {
        e.preventDefault();
        e.stopPropagation();
        console.warn('[IframeGuard] Blocked unknown popup:', anchor.href);
        this.showNotice();
      }
    }

    removeAdOverlays() {
      const selectors = [
        'iframe[style*="opacity: 0"]',
        'iframe[style*="visibility: hidden"]',
        'iframe[width="1"][height="1"]',
        'iframe[style*="width: 1px"]',
        'iframe[style*="height: 1px"]',
        'div[style*="z-index: 999"]',
        'a[target="_blank"][style*="position: fixed"]'
      ];

      let removed = 0;
      selectors.forEach(sel => {
        try {
          this.container.querySelectorAll(sel).forEach(el => {
            const style = getComputedStyle(el);
            const isHidden = style.opacity === '0' || style.visibility === 'hidden';
            const isTiny = el.tagName === 'IFRAME' &&
                          (el.offsetWidth <= 2 || el.offsetHeight <= 2);
            if (isHidden || isTiny) {
              el.remove();
              removed++;
            }
          });
        } catch (e) {}
      });

      if (removed > 0) {
        console.log(`[IframeGuard] Removed ${removed} ad elements`);
        this.showNotice();
      }
    }

    showNotice() {
      this.cleanupNotice();
      const notice = document.createElement('div');
      notice.id = 'iframe-guard-notice';
      notice.textContent = '🛡️ Ad blocked';
      notice.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(74, 222, 128, 0.95);
        color: white;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        z-index: 10000;
        pointer-events: none;
        opacity: 0;
        transform: translateY(-10px);
        transition: opacity 0.3s, transform 0.3s;
      `;
      this.container.appendChild(notice);

      setTimeout(() => {
        notice.style.opacity = '1';
        notice.style.transform = 'translateY(0)';
      }, 10);

      setTimeout(() => {
        notice.style.opacity = '0';
        notice.style.transform = 'translateY(-10px)';
        setTimeout(() => {
          if (notice.parentNode) notice.remove();
        }, 300);
      }, 2000);
    }

    cleanupNotice() {
      const notice = document.getElementById('iframe-guard-notice');
      if (notice) notice.remove();
    }
  }

  window.IframeGuard = IframeGuard;
})();
