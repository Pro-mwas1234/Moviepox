class UIManager {
    constructor() {
        this.api = window.tmdbAPI;
        this.searchTimeout = null;
    }

    createContentCard(item, mediaType, showRemove = false) {
        const card = document.createElement('div');
        card.className = 'content-card';

        const type = mediaType || item.media_type || 'movie';
        const posterPath = item.poster_path || item.backdrop_path;
        const title = item.title || item.name;
        const date = item.release_date || item.first_air_date || '';
        const year = date ? new Date(date).getFullYear() : 'N/A';
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

        card.innerHTML = `
            <img src="${this.api.getImageURL(posterPath)}" alt="${title}" loading="lazy">
            <div class="card-play-btn-large">
                <i data-lucide="play" style="width: 30px; height: 30px; fill: white;"></i>
            </div>
            <div class="card-overlay">
                <div class="card-actions-wrapper">
                    ${showRemove ? `
                        <div class="card-action-btn card-remove-btn" title="Remove" data-id="${item.id}">
                            <i data-lucide="x" style="width: 18px; height: 18px;"></i>
                        </div>
                    ` : ''}
                    <div class="card-action-btn card-bookmark-btn" title="Watch Later" data-id="${item.id}">
                        <i data-lucide="bookmark" style="width: 18px; height: 18px;"></i>
                    </div>
                </div>
                <div class="card-title">${title}</div>
                <div class="card-info">
                    <span>${year}</span>
                    <span class="card-rating">⭐ ${rating}</span>
                </div>
            </div>
        `;

        card.onclick = () => this.openDetail(item.id, type);

        // Actions
        const playBtnLarge = card.querySelector('.card-play-btn-large');
        if (playBtnLarge) {
            playBtnLarge.onclick = (e) => {
                e.stopPropagation();
                window.playerManager.openPlayer(item.id, type);
            };
        }

        const bookmarkBtn = card.querySelector('.card-bookmark-btn');
        if (bookmarkBtn) {
            // Update bookmark icon state
            window.WishlistManager?.isWishlisted(item.id).then(isSaved => {
                if (isSaved) {
                    bookmarkBtn.classList.add('active');
                    bookmarkBtn.querySelector('i').style.fill = 'currentColor';
                }
            });

            bookmarkBtn.onclick = async (e) => {
                e.stopPropagation();
                const isSaved = await window.WishlistManager.toggle(item);
                bookmarkBtn.classList.toggle('active', isSaved);
                bookmarkBtn.querySelector('i').style.fill = isSaved ? 'currentColor' : 'none';
            };
        }

        const removeBtn = card.querySelector('.card-remove-btn');
        if (removeBtn) {
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                if (window.HistoryManager && card.closest('#recentlyWatchedContainer')) {
                    window.HistoryManager.remove(item.id);
                } else if (window.WishlistManager && card.closest('#wishlistContainer')) {
                    window.WishlistManager.remove(item.id);
                }
            };
        }

        if (window.lucide) window.lucide.createIcons();
        return card;
    }

    renderSlider(containerId, items, mediaType) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container not found:', containerId);
            return;
        }

        container.innerHTML = '';

        if (!items || items.length === 0) {
            container.innerHTML = '<p style="color: #b3b3b3; padding: 2rem;">No content available</p>';
            return;
        }

        items.slice(0, 20).forEach(item => {
            const card = this.createContentCard(item, mediaType);
            container.appendChild(card);
        });

        console.log(`✓ Rendered ${items.length} items in ${containerId}`);
    }

    setupSliderNavigation() {
        document.querySelectorAll('.slider-btn').forEach(btn => {
            btn.onclick = () => {
                const sliderId = btn.getAttribute('data-slider');
                const slider = document.getElementById(sliderId);
                if (slider) {
                    const direction = btn.classList.contains('slider-btn-left') ? -1 : 1;
                    slider.scrollBy({ left: direction * 600, behavior: 'smooth' });
                }
            };
        });
    }

    setupRealtimeSearch() {
        const searchInput = document.getElementById('searchInput');
        const dropdown = document.getElementById('searchDropdown');

        searchInput.addEventListener('input', () => {
            clearTimeout(this.searchTimeout);
            const value = searchInput.value.trim();

            if (value === '') {
                dropdown.classList.remove('active');
                return;
            }

            this.searchTimeout = setTimeout(async () => {
                const results = await this.api.search(value);
                dropdown.innerHTML = '';

                if (!results || !results.results || results.results.length === 0) {
                    dropdown.classList.remove('active');
                    return;
                }

                dropdown.classList.add('active');

                results.results.slice(0, 10).forEach(item => {
                    if (item.media_type !== 'movie' && item.media_type !== 'tv') return;

                    const div = document.createElement('div');
                    div.className = 'search-dropdown-item';
                    div.innerHTML = `
                        <img src="${this.api.getImageURL(item.poster_path || item.backdrop_path, 'w92')}" alt="">
                        <div class="search-dropdown-item-info">
                            <div class="search-dropdown-item-title">${item.title || item.name}</div>
                            <div class="search-dropdown-item-meta">${item.media_type} • ${(item.release_date || item.first_air_date || '').substring(0, 4)}</div>
                        </div>
                    `;
                    div.onclick = () => {
                        dropdown.classList.remove('active');
                        this.openDetail(item.id, item.media_type);
                    };
                    dropdown.appendChild(div);
                });
            }, 300);
        });

        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && e.target !== searchInput) {
                dropdown.classList.remove('active');
            }
        });
    }

    async createHeroBanner(item, mediaType) {
        const heroBanner = document.getElementById('heroBanner');
        if (!heroBanner) return;

        const title = item.title || item.name;
        const overview = item.overview || 'No description available';
        const backdrop = this.api.getImageURL(item.backdrop_path, 'original');

        // Fetch trailer
        const videos = mediaType === 'movie'
            ? await this.api.getMovieVideos(item.id)
            : await this.api.getTVVideos(item.id);

        const results = videos?.results || [];
        const trailer = results
            .filter(v => v.type === 'Trailer' && v.site === 'YouTube')
            .sort((a, b) => {
                // Prioritize official trailers, then by latest publication date
                if (a.official !== b.official) return b.official ? 1 : -1;
                return new Date(b.published_at) - new Date(a.published_at);
            })[0];

        heroBanner.innerHTML = `
            <div id="hero-video-container" class="hero-video-container">
                ${trailer ? `
                    <iframe 
                        src="https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&loop=1&playlist=${trailer.key}&controls=0&modestbranding=1&rel=0&iv_load_policy=3&showinfo=0&autohide=1" 
                        frameborder="0" 
                        allow="autoplay; encrypted-media" 
                        allowfullscreen
                        style="width: 100%; height: 100%; pointer-events: none;">
                    </iframe>
                ` : `<div class="hero-backdrop-fallback" style="background-image: url('${backdrop}'); width: 100%; height: 100%;"></div>`}
            </div>
            <div class="hero-overlay"></div>
            <div class="hero-content">
                <h1>${title}</h1>
                <p>${overview.substring(0, 200)}${overview.length > 200 ? '...' : ''}</p>
                <div class="hero-buttons">
                    <button class="btn btn-primary" onclick="window.playerManager.openPlayer(${item.id}, '${mediaType}')">
                        <i data-lucide="play" style="width: 20px; height: 20px; margin-right: 8px;"></i> Play Now
                    </button>
                    <button class="btn btn-secondary" onclick="window.playerManager.playTrailer(${item.id}, '${mediaType}')">
                        <i data-lucide="youtube" style="width: 20px; height: 20px; margin-right: 8px;"></i> Watch Trailer
                    </button>
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();
    }

    async openDetail(id, mediaType) {
        const modal = document.getElementById('detailModal');
        const detailContent = document.getElementById('detailContent');

        modal.classList.add('active');
        detailContent.innerHTML = '<div class="loading-container"><div class="loading"></div></div>';

        const details = mediaType === 'tv'
            ? await this.api.getTVDetails(id)
            : await this.api.getMovieDetails(id);

        if (!details) {
            detailContent.innerHTML = '<p>Failed to load details</p>';
            return;
        }

        const title = details.title || details.name;
        const rating = details.vote_average ? details.vote_average.toFixed(1) : 'N/A';
        const releaseDate = details.release_date || details.first_air_date || 'N/A';
        const runtime = details.runtime || (details.episode_run_time && details.episode_run_time[0]) || 'N/A';
        const genres = details.genres || [];
        const isWishlisted = await window.WishlistManager?.isWishlisted(id);

        detailContent.innerHTML = `
            <div class="detail-backdrop-container">
                <img src="${this.api.getImageURL(details.backdrop_path, 'original')}" alt="${title}" class="detail-backdrop">
                <div class="detail-backdrop-overlay"></div>
            </div>
            <div class="detail-info">
                <h2 class="detail-title">${title}</h2>
                <div class="detail-meta">
                    <div class="meta-item"><i data-lucide="star" style="width: 16px; height: 16px; fill: #ffd700; color: #ffd700;"></i> ${rating}</div>
                    <div class="meta-item"><i data-lucide="calendar" style="width: 16px; height: 16px;"></i> ${releaseDate.substring(0, 4)}</div>
                    <div class="meta-item"><i data-lucide="clock" style="width: 16px; height: 16px;"></i> ${runtime} min</div>
                </div>
                <div class="detail-genres">
                    ${genres.map(g => `<span class="genre-tag">${g.name}</span>`).join('')}
                </div>
                <p class="detail-overview">${details.overview || 'No description available'}</p>
                <div class="detail-actions">
                    <button class="btn btn-primary btn-large" onclick="window.playerManager.openPlayer(${id}, '${mediaType}')">
                        <i data-lucide="play" style="width: 20px; height: 20px; fill: white;"></i> Play Now
                    </button>
                    <button class="btn btn-secondary btn-large" onclick="window.playerManager.playTrailer(${id}, '${mediaType}')">
                        🎬 Watch Trailer
                    </button>
                    <button class="btn btn-icon-only wishlist-toggle-btn ${isWishlisted ? 'active' : ''}" title="Watch Later">
                        <i data-lucide="bookmark" style="width: 24px; height: 24px; ${isWishlisted ? 'fill: currentColor;' : ''}"></i>
                    </button>
                </div>
            </div>
        `;

        const wishlistBtn = detailContent.querySelector('.wishlist-toggle-btn');
        if (wishlistBtn) {
            wishlistBtn.onclick = async () => {
                const nowSaved = await window.WishlistManager.toggle(details);
                wishlistBtn.classList.toggle('active', nowSaved);
                wishlistBtn.querySelector('i').style.fill = nowSaved ? 'currentColor' : 'none';
            };
        }

        if (window.HistoryManager) {
            window.HistoryManager.add(details);
        }
    }
}

window.uiManager = new UIManager();