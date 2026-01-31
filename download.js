/**
 * Download Manager (IDM-style Unit)
 * Handles cross-platform download logic and 1DM integration
 */

class DownloadManager {
    constructor() {
        this.queue = this.loadQueue();
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
        // Fetch details for the item
        const details = mediaType === 'tv'
            ? await window.tmdbAPI.getTVDetails(itemId)
            : await window.tmdbAPI.getMovieDetails(itemId);

        if (!details) {
            alert('Failed to initialize download engine.');
            return;
        }

        // On Android, priority is 1DM if enabled in oneDm.js logic
        if (/Android/i.test(navigator.userAgent) && window.OneDM) {
            window.OneDM.onModalOpen(details);
            // We still open our portal as a backup and to track history
        }

        this.showDownloadPortal(details, mediaType, season, episode);
        this.addToQueue(details, mediaType, season, episode);
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
            status: 'completed' // Simple tracking for now
        };

        // Remove duplicate if exists
        this.queue = this.queue.filter(q => !(q.id === item.id && q.season === item.season && q.episode === item.episode));
        this.queue.unshift(item);
        this.saveQueue();
    }

    showDownloadPortal(details, mediaType, season, episode) {
        const modal = document.getElementById('downloadManagerModal');
        const content = document.getElementById('downloadManagerContent');
        if (!modal || !content) return;

        const title = details.title || details.name;
        const subTitle = mediaType === 'tv' ? `S${season} E${episode}` : '';

        modal.classList.add('active');
        content.innerHTML = `
            <div class="download-portal-header">
                <div class="portal-brand">
                    <i data-lucide="download-cloud" class="icon-gradient"></i>
                    <h2>Download <span>Unit</span></h2>
                </div>
                <p>Generating secure download streams for: <strong>${title} ${subTitle}</strong></p>
            </div>

            <div class="engine-list">
                ${this.engines.map(engine => `
                    <div class="engine-card" onclick="window.downloadManager.startDownload('${engine.id}', ${details.id}, '${mediaType}', ${season}, ${episode})">
                        <div class="engine-icon">
                            <i data-lucide="${engine.icon}"></i>
                        </div>
                        <div class="engine-info">
                            <h4>${engine.name}</h4>
                            <p>${this.getEngineDescription(engine.id)}</p>
                        </div>
                        <i data-lucide="chevron-right" class="arrow"></i>
                    </div>
                `).join('')}
            </div>

            <div class="portal-footer">
                <p><i data-lucide="shield"></i> 1DM Integration Active (Android Auto-detect)</p>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();
    }

    getEngineDescription(id) {
        switch (id) {
            case 'vidsrc': return 'High-speed stable CDN link';
            case 'direct': return 'Fast browser-based mirror';
            case 'proxy': return 'Secured encrypted stream';
            default: return '';
        }
    }

    startDownload(engineId, itemId, mediaType, season, episode) {
        let url = '';
        if (mediaType === 'tv') {
            url = `https://dl.vidsrc.vip/tv/${itemId}/${season}/${episode}`;
        } else {
            url = `https://dl.vidsrc.vip/movie/${itemId}`;
        }

        // Implementation of different engines would go here
        // For now, they all use the primary stable URL
        window.open(url, '_blank', 'noopener,noreferrer');

        // Close modal after starting
        document.getElementById('downloadManagerModal').classList.remove('active');
    }

    renderQueue() {
        const container = document.getElementById('downloadQueueContainer');
        if (!container) return;

        if (this.queue.length === 0) {
            container.innerHTML = '<p class="empty-msg">No recent downloads</p>';
            return;
        }

        container.innerHTML = this.queue.map(item => `
            <div class="queue-item">
                <img src="${window.tmdbAPI?.getImageURL(item.poster, 'w92')}" alt="">
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
