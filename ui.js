class UIManager {
    constructor() {
        this.api = window.tmdbAPI;
        this.searchTimeout = null;
    }

    createContentCard(item, mediaType) {
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
            <div class="card-overlay">
                <div class="card-title">${title}</div>
                <div class="card-info">
                    <span>${year}</span>
                    <span class="card-rating">⭐ ${rating}</span>
                </div>
            </div>
        `;

        card.onclick = () => this.openDetail(item.id, type);
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

        heroBanner.style.backgroundImage = `url('${this.api.getImageURL(item.backdrop_path, 'original')}')`;

        heroBanner.innerHTML = `
            <div class="hero-content">
                <h1>${title}</h1>
                <p>${overview.substring(0, 200)}${overview.length > 200 ? '...' : ''}</p>
                <div class="hero-buttons">
                    <button class="btn btn-primary" onclick="window.playerManager.openPlayer(${item.id}, '${mediaType}')">
                        ▶ Play Now
                    </button>
                    <button class="btn btn-secondary" onclick="window.uiManager.openDetail(${item.id}, '${mediaType}')">
                        ℹ More Info
                    </button>
                </div>
            </div>
        `;
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

        detailContent.innerHTML = `
            <img src="${this.api.getImageURL(details.backdrop_path, 'original')}" alt="${title}" class="detail-backdrop">
            <div class="detail-info">
                <h2 class="detail-title">${title}</h2>
                <div class="detail-meta">
                    <div class="meta-item">⭐ ${rating}</div>
                    <div class="meta-item">📅 ${releaseDate}</div>
                    <div class="meta-item">⏱ ${runtime} min</div>
                </div>
                <div class="detail-genres">
                    ${genres.map(g => `<span class="genre-tag">${g.name}</span>`).join('')}
                </div>
                <p class="detail-overview">${details.overview || 'No description available'}</p>
                <button class="btn btn-primary" onclick="window.playerManager.openPlayer(${id}, '${mediaType}')">
                    ▶ Play Now
                </button>
            </div>
        `;
    }
}

window.uiManager = new UIManager();