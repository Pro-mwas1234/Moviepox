/**
 * Main Application Module
 * Initializes and orchestrates the Netflix Clone application
 */

(async function initApp() {
    console.log('🎬 Netflix Clone - Initializing...');
    
    // Show loading spinner
    UI.showLoading();
    
    try {
        // Initialize all modules
        UI.init();
        Modal.init();
        Search.init();
        
        // Detect user region
        console.log('🌍 Detecting user region...');
        const userRegion = await API.detectUserRegion();
        console.log(`📍 Region detected: ${userRegion}`);
        
        // Set up hero banner with trending movies
        await UI.setupHeroBanner();
        
        // Render content rows based on region
        await renderContentByRegion(userRegion);
        
        console.log('✅ Netflix Clone - Ready!');
    } catch (error) {
        console.error('❌ Initialization Error:', error);
        alert('Failed to initialize the application. Please refresh the page.');
    } finally {
        // Hide loading spinner
        UI.hideLoading();
    }
    
    /**
     * Render content based on user's region
     */
    async function renderContentByRegion(region) {
        const container = document.querySelector('.content-container');
        if (!container) return;
        
        // Content categories based on region
        const categories = [];
        
        // Region-specific trending
        if (region === 'IN') {
            categories.push(
                { title: 'Trending in India 🇮🇳', fetchFn: () => API.getTrendingInIndiaMovies() },
                { title: 'Trending TV Shows in India', fetchFn: () => API.getTrendingInIndiaTV() }
            );
        } else {
            categories.push(
                { title: 'Trending Now', fetchFn: () => API.getTrendingMovies() },
                { title: 'Trending TV Shows', fetchFn: () => API.getTrendingTV() }
            );
        }
        
        // Bollywood section
        categories.push(
            { title: 'Bollywood Movies 🎬', fetchFn: () => API.getBollywoodMovies() },
            { title: 'Bollywood TV Shows', fetchFn: () => API.getBollywoodTV() }
        );
        
        // Hollywood section
        categories.push(
            { title: 'Hollywood Blockbusters 🎥', fetchFn: () => API.getHollywoodBlockbusters() }
        );
        
        // Anime section
        categories.push(
            { title: 'Anime Series 🎌', fetchFn: () => API.getAnimeSeries() },
            { title: 'Anime Movies', fetchFn: () => API.getAnimeMovies() }
        );
        
        // Popular content
        categories.push(
            { title: 'Popular Movies', fetchFn: () => API.getPopularMovies() },
            { title: 'Popular TV Shows', fetchFn: () => API.getPopularTV() },
            { title: 'Top Rated Movies', fetchFn: () => API.getTopRatedMovies() }
        );
        
        // Genre-based content
        categories.push(
            { title: 'Action Movies', fetchFn: () => API.getMoviesByGenre(28) },
            { title: 'Comedy Movies', fetchFn: () => API.getMoviesByGenre(35) },
            { title: 'Horror Movies', fetchFn: () => API.getMoviesByGenre(27) }
        );
        
        // Render each category
        for (const category of categories) {
            const data = await category.fetchFn();
            if (data && data.results && data.results.length > 0) {
                renderRow(container, category.title, data.results);
            }
        }
    }
    
    /**
     * Render a single content row
     */
    function renderRow(container, title, items) {
        const rowHTML = `
            <div class="content-row">
                <h2 class="row-title">${title}</h2>
                <div class="row-slider">
                    <div class="row-cards">
                        ${items.map(item => createCardHTML(item)).join('')}
                    </div>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', rowHTML);
        
        // Add click listeners to cards
        const cards = container.querySelectorAll('.movie-card');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const itemId = card.dataset.id;
                const itemType = card.dataset.type;
                Modal.open(itemId, itemType);
            });
        });
    }
    
    /**
     * Create movie card HTML
     */
    function createCardHTML(item) {
        const posterURL = API.getImageURL(item.poster_path, 'poster');
        const title = item.title || item.name;
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
        const mediaType = item.media_type || (item.title ? 'movie' : 'tv');
        const year = item.release_date ? item.release_date.split('-')[0] : 
                     (item.first_air_date ? item.first_air_date.split('-')[0] : '');
        
        return `
            <div class="movie-card" data-id="${item.id}" data-type="${mediaType}">
                ${posterURL ? 
                    `<img src="${posterURL}" alt="${title}" loading="lazy">` :
                    `<div class="no-poster" style="width:100%;height:300px;">No Image</div>`
                }
                <div class="card-info">
                    <div class="card-title">${title}</div>
                    <div class="card-meta">
                        <span>⭐ ${rating}</span>
                        ${year ? `<span>${year}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    // Add navigation listeners
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Update active state
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Clear search when navigating
            Search.clearSearch();
            
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
    
    // Add smooth scrolling to internal links
    document.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' && e.target.getAttribute('href')?.startsWith('#')) {
            e.preventDefault();
        }
    });
    
    // Add similar card click listeners in modal
    document.addEventListener('click', (e) => {
        const similarCard = e.target.closest('.similar-card');
        if (similarCard) {
            const itemId = similarCard.dataset.id;
            const itemType = similarCard.dataset.type;
            if (itemId && itemType) {
                Modal.open(itemId, itemType);
            }
        }
    });
    
    console.log('💡 Tip: API key is loaded from Equanta GitHub repo. All features enabled!');
    console.log('📥 Download button available in player (coming soon feature)');
    console.log('🌍 Content is customized based on your region!');
})();