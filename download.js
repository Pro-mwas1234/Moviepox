/**
 * Download Manager (IDM-style Unit)
 * Handles cross-platform download logic and 1DM integration
 * → NOW OPENS DOWNLOAD IMMEDIATELY ON CALL
 */

class DownloadManager {
    constructor() {
        this.queue = this.loadQueue();
        // Engines are kept for potential future use, but not shown
        this.engines = [
            { id: 'vidsrc', name: 'Primary Engine (Vidsrc)', icon: 'zap' },
            { id: 'direct', name: 'Direct Mirror', icon: 'download' },
            { id: 'proxy', name: 'Proxy Stream', icon: 'shield-check' }
        ];
    }

    loadQueue() {
        try {
            return JSON.parse(localStorage.getItem('moviepox_download_queue')) || [];
        } catch {
            return [];
        }
    }

    saveQueue() {
        localStorage.setItem('moviepox_download_queue', JSON.stringify(this.queue.slice(0, 20)));
    }

    async initiate(itemId, mediaType, season = 1, episode = 1) {
        // Validate inputs to prevent malformed URLs
        if (!Number.isInteger(itemId) || itemId <= 0) {
            console.error('Invalid itemId:', itemId);
            return;
        }
        if (mediaType === 'tv') {
            if (!Number.isInteger(season) || season <= 0 || !Number.isInteger(episode) || episode <= 0) {
                console.error('Invalid season/episode:', season, episode);
                return;
            }
        }

        // Build clean Vidsrc URL (NO extra spaces!)
        const url = mediaType === 'tv'
            ? `https://dl.streammafia.to/media/tv/${itemId}?season=${season}&episode={${episode}`
            : `https://dl.streammafia.to/media/movie/${itemId}`;

        // ➤ GOOGLE ANALYTICS: Track download event
        if (typeof gtag === 'function') {
            gtag('event', 'download', {
                event_category: 'App',
                event_label: `${mediaType}_${itemId}${mediaType === 'tv' ? `_S${season}E${episode}` : ''}`,
                value: 1
            });
        }

        // ➤ OPEN DOWNLOAD IMMEDIATELY
        window.open(url, '_blank', 'noopener,noreferrer');

        // Still support 1DM on Android (if available)
        if (/Android/i.test(navigator.userAgent) && window.OneDM) {
            // Fetch details only for 1DM (non-blocking)
            const details = mediaType === 'tv'
                ? await window.tmdbAPI.getTVDetails(itemId).catch(() => null)
                : await window.tmdbAPI.getMovieDetails(itemId).catch(() => null);
            if (details) {
                window.OneDM.onModalOpen(details);
                this.addToQueue(details, mediaType, season, episode);
            }
        } else {
            // For non-Android or no 1DM: still try to add to queue silently
            try {
                const details = mediaType === 'tv'
                    ? await window.tmdbAPI.getTVDetails(itemId)
                    : await window.tmdbAPI.getMovieDetails(itemId);
                if (details) {
                    this.addToQueue(details, mediaType, season, episode);
                }
            } catch (e) {
                // Silent fail — download already started
            }
        }
    }

    addToQueue(details, mediaType, season, episode) {
        const item = {
            id: details.id,
            title: details.title || details.name,
            type: mediaType,
            season: season,
            episode: episode,
            poster: details.poster_path,
            timestamp: Date.now(),
            status: 'completed'
        };

        this.queue = this.queue.filter(q => !(q.id === item.id && q.season === item.season && q.episode === item.episode));
        this.queue.unshift(item);
        this.saveQueue();
    }

    // These methods are kept for compatibility (e.g., renderQueue may be used elsewhere)
    showDownloadPortal() { /* NO-OP — not used anymore */ }
    startDownload() { /* NO-OP — bypassed */ }
    getEngineDescription() { return ''; }

    renderQueue() {
        const container = document.getElementById('downloadQueueContainer');
        if (!container) return;

        if (this.queue.length === 0) {
            container.innerHTML = '<p class="empty-msg">No recent downloads</p>';
            return;
        }

        container.innerHTML = this.queue.map(item => `
            <div class="queue-item">
                <img src="${item.poster ? window.tmdbAPI?.getImageURL(item.poster, 'w92') : '/assets/poster-placeholder.png'}" alt="">
                <div class="queue-info">
                    <div class="queue-title">${item.title}</div>
                    <div class="queue-meta">${item.type} ${item.type === 'tv' ? `• S${item.season} E${item.episode}` : ''}</div>
                </div>
                <div class="queue-status status-completed">
                    <i data-lucide="check-circle"></i>
                </div>
            </div>
        `).join('');

        if (window.lucide) window.lucide.createIcons();
    }
}

window.downloadManager = new DownloadManager();
