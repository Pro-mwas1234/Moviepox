class UIManager {
    constructor() {
        this.api = window.tmdbAPI;
        this.searchTimeout = null;
    }

    createContentCard(item, mediaType, variant = 'default') {
        const card = document.createElement('div');
        card.className = `content-card card-${variant}`;

        const type = mediaType || item.media_type || 'movie';
        const posterPath = item.poster_path || item.backdrop_path;
        const title = item.title || item.name;
        const date = item.release_date || item.first_air_date || '';
        const year = date ? new Date(date).getFullYear() : 'N/A';
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
        const genresStr = item.genre_ids ? 'ACTION • SCIFI' : 'MOVIE'; // Mocked for aesthetic

        if (variant === 'history') {
            card.innerHTML = `
                <img src="${this.api.getImageURL(posterPath)}" alt="${title}" loading="lazy" style="width: 100%; height: 350px; object-fit: cover;">
                <div class="card-remove-overlay" title="Remove from History">
                    <i data-lucide="x" style="width: 16px; height: 16px;"></i>
                </div>
            `;
            const removeBtn = card.querySelector('.card-remove-overlay');
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                window.HistoryManager?.remove(item.id);
            };
        } else if (variant === 'wishlist') {
            card.innerHTML = `
                <img src="${this.api.getImageURL(posterPath)}" alt="${title}" loading="lazy" style="width: 100%; height: 350px; object-fit: cover;">
                <div class="card-info-bar">
                    <div class="card-info-text">
                        <h4>${title.toUpperCase()}</h4>
                        <span>${genresStr}</span>
                    </div>
                    <div class="card-bookmark-icon">
                        <i data-lucide="bookmark" style="width: 18px; height: 18px; fill: white;"></i>
                    </div>
                </div>
            `;
            const bookmarkIcon = card.querySelector('.card-bookmark-icon');
            bookmarkIcon.onclick = async (e) => {
                e.stopPropagation();
                await window.WishlistManager.toggle(item);
            };
        } else {
            // Default/Search/Trending Variant
            card.innerHTML = `
                <img src="${this.api.getImageURL(posterPath)}" alt="${title}" loading="lazy" style="width: 100%; height: 350px; object-fit: cover;">
                <div class="card-overlay">
                    <div class="card-title">${title}</div>
                    <div class="card-info">
                        <span>${year}</span>
                        <span class="card-rating">⭐ ${rating}</span>
                    </div>
                </div>
            `;
        }

        card.onclick = () => this.openDetail(item.id, type);

        if (window.lucide) window.lucide.createIcons();
        return card;
    }

    renderSlider(containerId, items, mediaType, variant = 'default') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const section = container.closest('.content-section');
        if (section && !section.querySelector('.section-nav')) {
            const header = section.querySelector('.section-header');
            if (header) {
                const nav = document.createElement('div');
                nav.className = 'section-nav';
                nav.innerHTML = `
                    <button class="slider-arrow slider-prev" onclick="this.closest('.content-section').querySelector('.content-slider').scrollBy({left: -600, behavior: 'smooth'})">
                        <i data-lucide="chevron-left"></i>
                    </button>
                    <button class="slider-arrow slider-next" onclick="this.closest('.content-section').querySelector('.content-slider').scrollBy({left: 600, behavior: 'smooth'})">
                        <i data-lucide="chevron-right"></i>
                    </button>
                `;
                header.appendChild(nav);
            }
        }

        container.innerHTML = '';
        if (!items || items.length === 0) {
            container.innerHTML = '<p class="empty-msg">No content available</p>';
            return;
        }

        items.slice(0, 20).forEach(item => {
            const card = this.createContentCard(item, mediaType, variant);
            container.appendChild(card);
        });

        if (window.lucide) window.lucide.createIcons();
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

    toggleSearch() {
        const overlay = document.querySelector('.search-overlay');
        const input = document.getElementById('searchInput');
        if (!overlay || !input) return;

        const isActive = overlay.classList.contains('active');
        
        if (isActive) {
            overlay.classList.remove('active');
            input.placeholder = "Search movies, series, anime...";
        } else {
            overlay.classList.add('active');
            input.focus();
        }
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

        const videos = mediaType === 'movie'
            ? await this.api.getMovieVideos(item.id)
            : await this.api.getTVVideos(item.id);

        const trailer = videos?.results?.filter(v => v.type === 'Trailer' && v.site === 'YouTube')[0];

        heroBanner.innerHTML = `
            <div class="hero-backdrop-container">
                ${trailer ? `
                    <iframe src="https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&loop=1&playlist=${trailer.key}&controls=0" frameborder="0"></iframe>
                ` : `<img src="${backdrop}" class="hero-backdrop-fallback">`}
            </div>
            <div class="hero-overlay"></div>
            <div class="hero-content">
                <h1>${title}</h1>
                <p>${overview.substring(0, 180)}...</p>
                <div class="hero-buttons">
                    <button class="btn btn-primary" onclick="window.playerManager.openPlayer(${item.id}, '${mediaType}')">
                        <i data-lucide="play" style="fill: white;"></i> WATCH NOW
                    </button>
                    <button class="btn btn-secondary ${isWishlisted ? 'hidden' : ''}" onclick="window.WishlistManager?.toggle(${JSON.stringify(item).replace(/"/g, '&quot;')}); this.classList.add('hidden');">
                        <i data-lucide="list-plus"></i> ADD TO BUCKET LIST
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
                    ${!isWishlisted ? `
                    <button class="btn btn-secondary btn-large bucket-add-btn" onclick="window.WishlistManager.toggle(${JSON.stringify(details).replace(/"/g, '&quot;')}); this.remove();">
                        <i data-lucide="list-plus"></i> Add to Bucket List
                    </button>
                    ` : ''}
                    <button class="btn btn-secondary btn-large" onclick="window.playerManager.playTrailer(${id}, '${mediaType}')">
                        🎬 Watch Trailer
                    </button>
                    <button class="btn btn-icon-only wishlist-toggle-btn ${isWishlisted ? 'active' : ''}" title="Bucket List">
                        <i data-lucide="check-square" style="width: 24px; height: 24px; ${isWishlisted ? 'fill: currentColor;' : ''}"></i>
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