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
                <img src="${this.api.getImageURL(posterPath)}" alt="${title}" loading="lazy" class="card-img-responsive">
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
        if (window.innerWidth <= 768) {
            this.openSearchHub();
            return;
        }

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

    openSearchHub() {
        const mainContent = document.getElementById('mainContent');
        if (!mainContent) return;

        // Transitions smoothly to a full search page
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        mainContent.innerHTML = `
            <div class="search-hub-container" style="min-height: 100vh; padding-top: 100px;">
                <div class="search-hub-header">
                    <h2 class="section-title">Explore <span>Movies & Shows</span></h2>
                    <div class="search-hub-input-wrapper">
                        <i data-lucide="search"></i>
                        <input type="text" id="hubSearchInput" placeholder="Titles, genres, actors..." autofocus>
                    </div>
                </div>
                <div id="hubResultsGrid" class="genre-results-grid">
                    <!-- Results will populate here -->
                    <div class="search-placeholder">
                        <i data-lucide="sparkles" style="width: 48px; height: 48px; opacity: 0.2; margin-bottom: 1rem;"></i>
                        <p>Search for your next obsession...</p>
                    </div>
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();

        const input = document.getElementById('hubSearchInput');
        input.addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            const query = e.target.value.trim();
            if (query.length < 2) {
                document.getElementById('hubResultsGrid').innerHTML = `
                    <div class="search-placeholder">
                        <i data-lucide="sparkles" style="width: 48px; height: 48px; opacity: 0.2; margin-bottom: 1rem;"></i>
                        <p>Search for your next obsession...</p>
                    </div>
                `;
                if (window.lucide) window.lucide.createIcons();
                return;
            }

            this.searchTimeout = setTimeout(async () => {
                const resultsGrid = document.getElementById('hubResultsGrid');
                resultsGrid.innerHTML = '<div class="loading-mini"></div>';

                try {
                    const data = await this.api.search(query);
                    resultsGrid.innerHTML = '';
                    
                    if (!data || data.results.length === 0) {
                        resultsGrid.innerHTML = '<p class="empty-message-vibrant">No results found for "' + query + '"</p>';
                        return;
                    }

                    data.results.forEach(item => {
                        const card = this.createContentCard(item);
                        resultsGrid.appendChild(card);
                    });

                    if (window.lucide) window.lucide.createIcons();
                } catch (error) {
                    console.error('Search error:', error);
                    resultsGrid.innerHTML = '<p class="error-msg">Failed to load results.</p>';
                }
            }, 500);
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
        const isWishlisted = await window.WishlistManager?.isWishlisted(item.id);

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

    openGenreHub() {
        const modal = document.getElementById('genreHubModal');
        if (!modal) return;

        this.renderGenreGrid();
        modal.classList.add('active');

        document.getElementById('closeGenreHub').onclick = () => {
            modal.classList.remove('active');
        };

        modal.onclick = (e) => {
            if (e.target.id === 'genreHubModal') modal.classList.remove('active');
        };

        // Esc key to close
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                modal.classList.remove('active');
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    renderGenreGrid() {
        const grid = document.getElementById('genreGrid');
        if (!grid) return;

        const genres = [
            { id: 28, name: 'Action', icon: 'zap' },
            { id: 35, name: 'Comedy', icon: 'laugh' },
            { id: 18, name: 'Drama', icon: 'clapperboard' },
            { id: 16, name: 'Anime', icon: 'swords' },
            { id: 27, name: 'Horror', icon: 'ghost' },
            { id: 10749, name: 'Romance', icon: 'heart' },
            { id: 878, name: 'Sci-Fi', icon: 'rocket' },
            { id: 9648, name: 'Mystery', icon: 'search' },
            { id: 10751, name: 'Family', icon: 'users' },
            { id: 14, name: 'Fantasy', icon: 'wand-2' }
        ];

        grid.innerHTML = '';
        genres.forEach(genre => {
            const card = document.createElement('div');
            card.className = 'genre-card';
            card.innerHTML = `
                <i data-lucide="${genre.icon}"></i>
                <span>${genre.name}</span>
            `;
            card.onclick = () => {
                document.getElementById('genreHubModal').classList.remove('active');
                this.applyGenreFilter(genre.id, genre.name);
            };
            grid.appendChild(card);
        });

        if (window.lucide) window.lucide.createIcons();
    }

    async applyGenreFilter(genreId, genreName) {
        const mainContent = document.getElementById('mainContent');
        if (!mainContent) return;

        // Cinematic transition
        mainContent.style.opacity = '0';
        mainContent.style.transform = 'translateY(20px)';
        mainContent.style.transition = 'all 0.4s ease';
        
        setTimeout(async () => {
            mainContent.innerHTML = `
                <div class="content-section" style="margin-top: 120px;">
                    <div class="section-header" style="margin-bottom: 3rem; text-align: center; display: block;">
                        <h2 class="section-title" style="font-size: 3rem; margin-bottom: 1rem;">Best in <span>${genreName}</span></h2>
                        <button class="btn btn-secondary" style="margin: 0 auto;" onclick="location.reload()">
                            <i data-lucide="home"></i> Back to Home
                        </button>
                    </div>
                    <div id="genreResultsGrid" class="genre-results-grid"></div>
                </div>
            `;

            const results = await this.api.discoverMovies({ with_genres: genreId });
            const container = document.getElementById('genreResultsGrid');
            
            if (results && results.results) {
                results.results.forEach(item => {
                    const card = this.createContentCard(item, 'movie');
                    container.appendChild(card);
                });
            }

            mainContent.style.opacity = '1';
            mainContent.style.transform = 'translateY(0)';
            window.scrollTo({ top: 0, behavior: 'smooth' });
            if (window.lucide) window.lucide.createIcons();
        }, 400);
    }

    async openDetail(id, mediaType) {
        const modal = document.getElementById('detailModal');
        const detailContent = document.getElementById('detailContent');

        modal.classList.add('active');
        detailContent.innerHTML = '<div class="loading-container"><div class="loading"></div></div>';

        const details = mediaType === 'tv'
            ? await this.api.getTVDetails(id)
            : await this.api.getMovieDetails(id);

        const recommendations = await this.api.getRecommendations(id, mediaType);

        if (!details) {
            detailContent.innerHTML = '<p>Failed to load details</p>';
            return;
        }

        const title = details.title || details.name;
        const rating = details.vote_average ? details.vote_average.toFixed(1) : 'N/A';
        const releaseDate = details.release_date || details.first_air_date || 'N/A';
        const runtime = details.runtime || (details.episode_run_time && details.episode_run_time[0]) || 'N/A';
        const genres = details.genres || [];
        const status = details.status || 'Released';
        const language = details.original_language?.toUpperCase() || 'EN';
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
                    <div class="meta-item"><i data-lucide="globe" style="width: 16px; height: 16px;"></i> ${language}</div>
                    <div class="meta-item"><i data-lucide="activity" style="width: 16px; height: 16px;"></i> ${status}</div>
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
                </div>

                ${recommendations?.results?.length > 0 ? `
                    <div class="more-like-this-section">
                        <h3 class="section-title" style="margin-top: 2rem;">More Like <span>This</span></h3>
                        <div class="rec-slider-container">
                            <div id="recSlider" class="content-slider rec-slider"></div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        // Render Recommendations
        if (recommendations?.results?.length > 0) {
            const recContainer = document.getElementById('recSlider');
            recommendations.results.slice(0, 10).forEach(rec => {
                const card = this.createContentCard(rec, mediaType);
                card.onclick = () => {
                    this.openDetail(rec.id, mediaType);
                    document.getElementById('detailModal').scrollTo({ top: 0, behavior: 'smooth' });
                };
                recContainer.appendChild(card);
            });
        }

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