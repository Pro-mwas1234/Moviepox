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
            alert('Initialization failed: ' + error.message + '\n\nPlease check the console for details.');
        }
    }

    async loadAllContent() {
        const api = window.tmdbAPI;
        const ui = window.uiManager;

        console.log('Loading content...');

        // Hero Banner & Trending (Day)
        const trendingDay = await api.getTrendingDay();
        if (trendingDay && trendingDay.results) {
            // Filter for high-quality, released items with backdrop imagery
            const now = new Date();
            const validItems = trendingDay.results.filter(item => {
                const releaseDate = new Date(item.release_date || item.first_air_date);
                return item.backdrop_path && 
                       item.vote_average > 6 && 
                       releaseDate <= now;
            });

            // Pick a random item from the top 5 valid results to keep the UI fresh
            const candidates = validItems.slice(0, 5);
            const featured = candidates[Math.floor(Math.random() * candidates.length)] || trendingDay.results[0];
            
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

    scrollToSection(id) {
        const section = document.getElementById(id);
        if (!section) return;

        const navHeight = document.querySelector('.navbar').offsetHeight;
        let offset = navHeight + 20;

        // On mobile, the top nav is transparent/minimal, so we adjust the offset
        if (window.innerWidth <= 768) {
            offset = 10;
        }

        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = section.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.app.init();
});
