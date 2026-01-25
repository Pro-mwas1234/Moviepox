class App {
    async init() {
        try {
            console.log('🎬 Initializing Moviepox...');

            await window.loadConfig();
            const apiInit = await window.tmdbAPI.initialize();

            if (!apiInit) {
                alert('Please add your TMDb API key to config.json');
                return;
            }

            window.playerManager.initialize();
            window.uiManager.setupSliderNavigation();
            window.uiManager.setupRealtimeSearch();
            this.setupNavbar();

            await this.loadAllContent();

            if (window.HistoryManager) {
                window.HistoryManager.render();
            }

            console.log('✅ moviepox ready!');
        } catch (error) {
            console.error('Init error:', error);
            alert('Initialization failed. Please run via a local server (not file://)');
        }
    }

    async loadAllContent() {
        const api = window.tmdbAPI;
        const ui = window.uiManager;

        console.log('Loading content...');

        // Hero Banner & Trending (Day)
        const trendingDay = await api.getTrendingDay();
        if (trendingDay && trendingDay.results) {
            // Pick a high-quality featured item for hero
            const featured = trendingDay.results.find(item => item.backdrop_path && item.vote_average > 7) || trendingDay.results[0];
            if (featured) {
                await ui.createHeroBanner(featured, featured.media_type || 'movie');
            }
        }

        // Trending Movies (Week)
        const trendingMovies = await api.getTrending('movie', 'week');
        if (trendingMovies && trendingMovies.results) {
            ui.renderSlider('trendingMovies', trendingMovies.results, 'movie');
        }

        // Trending TV
        const trendingSeries = await api.getTrending('tv', 'week');
        if (trendingSeries && trendingSeries.results) {
            ui.renderSlider('trendingSeries', trendingSeries.results, 'tv');
        }

        // Popular Movies
        const popularMovies = await api.getTopRated('movie'); // Using top rated as popular for higher quality
        if (popularMovies && popularMovies.results) {
            ui.renderSlider('popularMovies', popularMovies.results, 'movie');
        }

        // Upcoming
        const upcoming = await api.getUpcoming();
        if (upcoming && upcoming.results) {
            ui.renderSlider('upcomingMovies', upcoming.results, 'movie');
        }

        // Regional
        const regionalMovies = await api.getRegionalMovies();
        if (regionalMovies && regionalMovies.results) {
            ui.renderSlider('regionalMovies', regionalMovies.results, 'movie');
            document.getElementById('regionalTitle').textContent = `Top Movies in ${api.userCountry}`;
        }

        // Anime
        const anime = await api.getAnime();
        if (anime && anime.results) {
            ui.renderSlider('animeContent', anime.results, 'tv');
        }



        // Hollywood
        const hollywood = await api.getHollywood();
        if (hollywood && hollywood.results) {
            ui.renderSlider('hollywoodContent', hollywood.results, 'movie');
        }

        // Bollywood
        const bollywood = await api.getBollywood();
        if (bollywood && bollywood.results) {
            ui.renderSlider('bollywoodContent', bollywood.results, 'movie');
        }

        // Tollywood
        const tollywood = await api.getTollywood();
        if (tollywood && tollywood.results) {
            ui.renderSlider('tollywoodContent', tollywood.results, 'movie');
        }

        console.log('✓ All content loaded');
    }

    setupNavbar() {
        const navbar = document.querySelector('.navbar');
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });

        document.querySelector('.nav-logo').onclick = () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
