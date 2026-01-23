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
        
        // Hook for 1DM button (Android only)
        if (typeof OneDM !== 'undefined') {
            OneDM.onModalOpen(details);
        }
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
        
        // Cleanup 1DM button
        if (typeof OneDM !== 'undefined') {
            OneDM.cleanup();
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
            <!-- Player Section (hidden initially, shown on Play click) -->
            <div id="player-section" class="player-section" style="display:none;">
                <div id="player-container" class="player-container">
                    <iframe id="player-iframe" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture" frameborder="0"></iframe>
                </div>
                <div class="server-selector">
                    <label for="server-dropdown">Server:</label>
                    <select id="server-dropdown" class="server-dropdown">
                        <!-- Populated by player.js -->
                    </select>
                </div>
                <!-- For TV Shows: Season/Episode selector -->
                <div id="episode-selector" class="episode-selector" style="display:none;">
                    <!-- Populated by player.js for TV shows -->
                </div>
            </div>
            
            <div class="modal-hero" style="background-image: url(${backdropURL || ''});">
                <div class="modal-hero-fade"></div>
                <div class="modal-hero-content">
                    <h1 class="modal-title">${title}</h1>
                    ${tagline ? `<p style="font-style: italic; color: #e5e5e5; margin-bottom: 15px;">${tagline}</p>` : ''}
                    <div class="modal-buttons">
                        <button class="btn btn-play" id="modal-play-btn" data-id="${itemId}" data-type="${itemType}">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                            Play
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="modal-info">
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
                
                ${cast.length > 0 ? renderCast(cast) : ''}
                
                ${similar.length > 0 ? renderSimilar(similar, itemType) : ''}
            </div>
        `;
        
        elements.modalBody.innerHTML = modalHTML;
        
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
