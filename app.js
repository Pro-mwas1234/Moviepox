class App {
    async init() {
        try {
            console.log('🎬 Initializing Equanta...');

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

            console.log('✅ Equanta ready!');
        } catch (error) {
            console.error('Init error:', error);
            alert('Initialization failed. Please run via a local server (not file://)');
        }
    }

    async loadAllContent() {
        const api = window.tmdbAPI;
        const ui = window.uiManager;

        console.log('Loading content...');

        // Trending Movies
        const trendingMovies = await api.getTrending('movie', 'week');
        if (trendingMovies && trendingMovies.results) {
            ui.renderSlider('trendingMovies', trendingMovies.results, 'movie');
            if (trendingMovies.results[0]) {
                await ui.createHeroBanner(trendingMovies.results[0], 'movie');
            }
        }

        // Trending TV
        const trendingSeries = await api.getTrending('tv', 'week');
        if (trendingSeries && trendingSeries.results) {
            ui.renderSlider('trendingSeries', trendingSeries.results, 'tv');
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