class TMDbAPI {
    constructor() {
        this.config = null;
        this.baseURL = '';
        this.imageBase = '';
        this.apiKey = '';
        this.userCountry = 'US';
    }

    async initialize() {
        this.config = window.getConfig();
        if (!this.config) return false;

        this.baseURL = this.config.tmdb_base_url;
        this.imageBase = this.config.tmdb_image_base;
        this.apiKey = this.config.tmdb_api_key;

        await this.detectLocation();
        return true;
    }

    async detectLocation() {
        try {
            const response = await fetch(this.config.geolocation_api);
            const data = await response.json();
            this.userCountry = data.country_code || 'US';
            console.log('✓ Location:', this.userCountry);
        } catch (error) {
            this.userCountry = 'US';
        }
    }

    async fetchData(endpoint, params = {}) {
        const url = new URL(`${this.baseURL}${endpoint}`);
        url.searchParams.append('api_key', this.apiKey);

        Object.keys(params).forEach(key => {
            if (params[key]) url.searchParams.append(key, params[key]);
        });

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('API error:', error);
            return null;
        }
    }

    getImageURL(path, size = 'w500') {
        if (!path) return 'https://via.placeholder.com/500x750/141414/ffffff?text=No+Image';
        return `${this.imageBase}/${size}${path}`;
    }

    async getTrending(mediaType = 'movie', timeWindow = 'week') {
        return await this.fetchData(`/trending/${mediaType}/${timeWindow}`);
    }

    async discoverMovies(params = {}) {
        return await this.fetchData('/discover/movie', params);
    }

    async discoverTV(params = {}) {
        return await this.fetchData('/discover/tv', params);
    }

    async getRegionalMovies() {
        return await this.discoverMovies({
            region: this.userCountry,
            sort_by: 'popularity.desc',
            page: 1
        });
    }

    async getAnime() {
        return await this.discoverTV({
            with_genres: this.config.genre_mappings.anime,
            with_original_language: 'ja',
            sort_by: 'popularity.desc'
        });
    }

    async getHollywood() {
        return await this.discoverMovies({
            with_original_language: 'en',
            region: 'US',
            sort_by: 'popularity.desc'
        });
    }

    async getBollywood() {
        return await this.discoverMovies({
            with_original_language: 'hi',
            region: 'IN',
            sort_by: 'popularity.desc'
        });
    }

    async getTollywood() {
        return await this.discoverMovies({
            with_original_language: 'te',
            region: 'IN',
            sort_by: 'popularity.desc'
        });
    }

    async getMovieDetails(id) {
        return await this.fetchData(`/movie/${id}`, {
            append_to_response: 'credits,videos'
        });
    }

    async getTVDetails(id) {
        return await this.fetchData(`/tv/${id}`, {
            append_to_response: 'credits,videos'
        });
    }

    async getTVSeasonDetails(tvId, seasonNumber) {
        return await this.fetchData(`/tv/${tvId}/season/${seasonNumber}`);
    }

    async search(query, page = 1) {
        return await this.fetchData('/search/multi', { query, page });
    }
}

window.tmdbAPI = new TMDbAPI();