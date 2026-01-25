/**
 * Modal Module
 * Handles movie/TV show detail modal functionality
 */

const Modal = (() => {
    // Cache DOM elements
    const elements = {
        modal: null,
        modalOverlay: null,
        modalClose: null,
        modalBody: null
    };

    /**
     * Initialize modal
     */
    function init() {
        elements.modal = document.getElementById('detailModal');
        elements.modalOverlay = document.getElementById('modalOverlay');
        elements.modalClose = document.getElementById('modalClose');
        elements.modalBody = document.getElementById('modalBody');

        // Add close listeners
        elements.modalClose?.addEventListener('click', close);
        elements.modalOverlay?.addEventListener('click', close);

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && elements.modal?.classList.contains('active')) {
                close();
            }
        });
    }

    /**
     * Open modal with item details
     */
    async function open(itemId, itemType) {
        if (!itemId || !itemType) return;

        UI.showLoading();

        // Fetch details based on type
        const details = itemType === 'movie' ?
            await API.getMovieDetails(itemId) :
            await API.getTVDetails(itemId);

        UI.hideLoading();

        if (!details) {
            alert('Failed to load details. Please try again.');
            return;
        }

        renderModalContent(details, itemType, itemId);
        elements.modal?.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Close modal
     */
    function close() {
        elements.modal?.classList.remove('active');
        document.body.style.overflow = '';

        // Destroy player when modal closes
        if (typeof Player !== 'undefined') {
            Player.destroy();
        }
    }

    /**
     * Render modal content
     */
    function renderModalContent(details, itemType, itemId) {
        const backdropURL = API.getImageURL(details.backdrop_path, 'backdrop');
        const posterURL = API.getImageURL(details.poster_path, 'poster');
        const title = details.title || details.name;
        const tagline = details.tagline || '';
        const overview = details.overview || 'No overview available.';
        const rating = details.vote_average ? details.vote_average.toFixed(1) : 'N/A';
        const releaseDate = details.release_date || details.first_air_date || 'Unknown';
        const runtime = itemType === 'movie' ?
            (details.runtime ? `${details.runtime} min` : 'N/A') :
            (details.episode_run_time && details.episode_run_time.length > 0 ? `${details.episode_run_time[0]} min/ep` : 'N/A');
        const genres = details.genres ? details.genres.map(g => g.name).join(', ') : 'N/A';

        // Get trailer
        const trailer = details.videos && details.videos.results ?
            details.videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube') : null;

        // Get cast
        const cast = details.credits && details.credits.cast ?
            details.credits.cast.slice(0, 8) : [];

        // Get similar items
        const similar = details.similar && details.similar.results ?
            details.similar.results.slice(0, 6) : [];

        const modalHTML = `
            <div class="modal-hero" style="background-image: url(${backdropURL || ''});">
                <div class="modal-hero-fade"></div>
                <div class="modal-hero-content">
                    <h1 class="modal-title">${title}</h1>
                    ${tagline ? `<p style="font-style: italic; color: #e5e5e5; margin-bottom: 15px;">${tagline}</p>` : ''}
                    <div class="modal-buttons">
                        <button class="btn btn-play" id="modal-play-btn" data-id="${itemId}" data-type="${itemType}">
                            <i data-lucide="play" style="width: 20px; height: 20px;"></i>
                            Play Now
                        </button>
                    </div>
                </div>
            </div >

            < !--Tabs Interface-- >
            <div class="modal-tabs-wrapper" style="padding: 0 2rem;">
                <div class="tabs-header">
                    <button class="tab-btn active" data-tab="overview">
                        <i data-lucide="info" style="width: 16px; height: 16px; margin-right: 6px;"></i> Overview
                    </button>
                    <button class="tab-btn" data-tab="servers">
                        <i data-lucide="server" style="width: 16px; height: 16px; margin-right: 6px;"></i> Watch Now
                    </button>
                    <button class="tab-btn" data-tab="cast">
                        <i data-lucide="users" style="width: 16px; height: 16px; margin-right: 6px;"></i> Cast
                    </button>
                </div>
            </div>
            
            <div class="modal-info">
                <!-- Overview Tab -->
                <div id="tab-overview" class="tab-content active">
                    <p class="modal-overview">${overview}</p>
                    
                    <div class="modal-meta">
                        <div class="meta-item">
                            <span class="meta-label">Rating</span>
                            <span class="meta-value">⭐ ${rating}/10</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Release Date</span>
                            <span class="meta-value">${releaseDate}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Runtime</span>
                            <span class="meta-value">${runtime}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Genres</span>
                            <span class="meta-value">${genres}</span>
                        </div>
                    </div>
                    
                    ${trailer ? renderTrailer(trailer) : ''}
                    ${similar.length > 0 ? renderSimilar(similar, itemType) : ''}
                </div>

                <!-- Servers Tab -->
                <div id="tab-servers" class="tab-content">
                    <div id="player-section" class="player-section">
                        <div id="player-container" class="player-container">
                            <div class="player-placeholder" style="aspect-ratio: 16/9; display: flex; align-items: center; justify-content: center; background: #000; border-radius: 8px;">
                                <div style="text-align: center;">
                                    <i data-lucide="play-circle" style="width: 64px; height: 64px; margin-bottom: 1rem; color: var(--accent-color);"></i>
                                    <p>Click "Play Now" to start streaming</p>
                                </div>
                            </div>
                            <iframe id="player-iframe" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture" frameborder="0" style="display: none;"></iframe>
                        </div>
                        <div class="server-selector" style="margin-top: 1rem;">
                            <label for="server-dropdown">Select Server:</label>
                            <select id="server-dropdown" class="server-dropdown">
                                <!-- Populated by player.js -->
                            </select>
                        </div>
                        <div class="download-section" style="margin-top: 1.5rem;">
                            <button class="btn btn-download" id="modal-download-btn" style="width: 100%;">
                                <i data-lucide="download" style="width: 18px; height: 18px; margin-right: 8px;"></i>
                                Download Video
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Cast Tab -->
                <div id="tab-cast" class="tab-content">
                    ${cast.length > 0 ? renderCast(cast) : '<p>Cast information not available.</p>'}
                </div>
            </div>
`;

        elements.modalBody.innerHTML = modalHTML;

        // Initialize Lucide icons
        if (window.lucide) {
            window.lucide.createIcons();
        }

        // Tab Switching Logic
        const tabBtns = elements.modalBody.querySelectorAll('.tab-btn');
        const tabContents = elements.modalBody.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;

                // Update buttons
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update content
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === `tab-${tabId}`) {
                        content.classList.add('active');
                    }
                });
            });
        });

        // Attach Play button listener
        const playBtn = document.getElementById('modal-play-btn');
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                const id = playBtn.dataset.id;
                const type = playBtn.dataset.type;

                if (typeof Player !== 'undefined') {
                    Player.init(id, type);

                    // Scroll to player
                    setTimeout(() => {
                        const playerSection = document.getElementById('player-section');
                        if (playerSection) {
                            playerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    }, 100);
                }
            });
        }

        // Attach Download button listener
        const downloadBtn = document.getElementById('modal-download-btn');
        const directBtn = document.getElementById('direct-download-btn');

        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                const downloadUrl = itemType === 'movie'
                    ? `https://vidsrc.me/download/${itemId}`
                    : `https://vidsrc.me/download/${itemId}/1/1`;

                window.open(downloadUrl, '_blank', 'noopener,noreferrer');
            });
        }

        if (directBtn) {
            directBtn.addEventListener('click', () => {
                const downloadUrl = itemType === 'movie'
                    ? `https://vidsrc.me/download/${itemId}`
                    : `https://vidsrc.me/download/${itemId}/1/1`;

                // Show a simple prompt with the link
                prompt('Copy this direct download link:', downloadUrl);
            });
        }
    }

    /**
     * Render trailer section
     */
    function renderTrailer(trailer) {
        return `
            <div class="modal-section">
                <h3 class="section-title">Trailer</h3>
                <div class="trailer-container">
                    <iframe 
                        src="https://www.youtube.com/embed/${trailer.key}" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen>
                    </iframe>
                </div>
            </div>
        `;
    }

    /**
     * Render cast section
     */
    function renderCast(cast) {
        return `
            <div class="modal-section">
                <h3 class="section-title">Cast</h3>
                <div class="cast-grid">
                    ${cast.map(member => {
            const profileURL = API.getImageURL(member.profile_path, 'profile');
            return `
                            <div class="cast-member">
                                ${profileURL ?
                    `<img src="${profileURL}" alt="${member.name}" loading="lazy">` :
                    `<div class="no-poster" style="width:100%;height:150px;">No Photo</div>`
                }
                                <div class="cast-name">${member.name}</div>
                                <div class="cast-character">${member.character || 'Unknown'}</div>
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render similar items section
     */
    function renderSimilar(similar, itemType) {
        return `
            <div class="modal-section">
                <h3 class="section-title">More Like This</h3>
                <div class="similar-grid">
                    ${similar.map(item => {
            const posterURL = API.getImageURL(item.poster_path, 'poster');
            const title = item.title || item.name;
            return `
                            <div class="similar-card" data-id="${item.id}" data-type="${itemType}">
                                ${posterURL ?
                    `<img src="${posterURL}" alt="${title}" loading="lazy">` :
                    `<div class="no-poster" style="width:100%;height:225px;">No Image</div>`
                }
                                <div class="similar-title">${title}</div>
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    }

    // Public API
    return {
        init,
        open,
        close
    };
})();
