// Player Manager with season/episode support and working download button
class PlayerManager {
    constructor() {
        this.config = null;
        this.currentServer = 0;
        this.currentId = null;
        this.currentType = null;
        this.currentSeason = 1;
        this.currentEpisode = 1;
        this._openToken = 0; // increments per openPlayer() to supersede stale calls
    }

    initialize() {
        this.config = window.getConfig();
        this.setupEventListeners();
        if (window.lucide) window.lucide.createIcons();
    }

    setupEventListeners() {
        document.getElementById('closePlayer').onclick = () => this.closePlayer();

        document.getElementById('serverSelect').onchange = (e) => {
            this.currentServer = parseInt(e.target.value);
            this.saveServer(this.currentServer);
            this.loadServer();
        };

        document.getElementById('detailModal').onclick = (e) => {
            if (e.target.id === 'detailModal') {
                document.getElementById('detailModal').classList.remove('active');
            }
        };

        document.getElementById('closeModal').onclick = () => {
            document.getElementById('detailModal').classList.remove('active');
        };

        const trailerPlayBtn = document.getElementById('trailerPlayBtn');
        if (trailerPlayBtn) {
            trailerPlayBtn.onclick = () => {
                this.openPlayer(this.currentId, this.currentType);
            };
        }
    }

    async openPlayer(id, mediaType) {
        // Token guard: if another title is opened while this one is still
        // resolving (the async pref read below), the stale call bails out
        // instead of clobbering the newer selection.
        const token = ++this._openToken;

        this.currentId = id;
        this.currentType = mediaType;
        this.currentServer = 0;

        document.getElementById('detailModal').classList.remove('active');

        // Populate server selector
        const serverSelect = document.getElementById('serverSelect');
        serverSelect.innerHTML = '';
        this.config.servers.forEach((server, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = server.name;
            serverSelect.appendChild(option);
        });

        // Restore the server the user chose last time — synced to their account
        // when logged in (Firebase), else stored per-device (localStorage).
        const savedServer = await this.getSavedServer();
        if (token !== this._openToken) return; // superseded by a newer openPlayer
        this.currentServer = (savedServer >= 0 && savedServer < this.config.servers.length) ? savedServer : 0;
        serverSelect.value = this.currentServer;

        // Show/hide TV controls based on media type
        if (mediaType === 'tv') {
            document.getElementById('tvControls').style.display = 'flex';
            await this.setupSeasonEpisodeSelector();
            if (token !== this._openToken) return;
        } else {
            document.getElementById('tvControls').style.display = 'none';
        }

        document.getElementById('playerModal').classList.add('active');
        
        // Ensure controls are visible when opening a full movie/show
        document.getElementById('serverSelect').closest('.server-selector').style.display = 'block';
        document.getElementById('shareBtn').style.display = 'inline-flex';
        document.getElementById('downloadBtn').style.display = 'inline-flex';
        document.getElementById('trailerPlayBtn').style.display = 'none';

        this.loadServer();
        this.updateDownloadLink(); // Initialize download button
        this.renderRecommendations(); // Load recommendations

        // Add to history when player actually opens
        if (window.HistoryManager && window.tmdbAPI) {
            try {
                const apiMethod = mediaType === 'tv' ? 'getTVDetails' : 'getMovieDetails';
                window.tmdbAPI[apiMethod](id).then(details => {
                    if (details) window.HistoryManager.add(details);
                }).catch(e => console.error("History logging failed:", e));
            } catch (e) {
                console.error(e);
            }
        }
    }

    async renderRecommendations() {
        const container = document.getElementById('playerRecContainer');
        if (!container) return;

        container.innerHTML = '<div class="loading-mini"></div>';

        try {
            const recommendations = await window.tmdbAPI.getRecommendations(this.currentId, this.currentType);
            
            if (!recommendations || recommendations.results.length === 0) {
                document.querySelector('.player-extra-content').style.display = 'none';
                return;
            }

            document.querySelector('.player-extra-content').style.display = 'block';
            container.innerHTML = '';

            recommendations.results.slice(0, 10).forEach(rec => {
                const card = window.uiManager.createContentCard(rec, this.currentType);
                card.onclick = () => {
                    this.openPlayer(rec.id, this.currentType);
                    container.parentElement.scrollTo({ top: 0, behavior: 'smooth' });
                };
                container.appendChild(card);
            });

            if (window.lucide) window.lucide.createIcons();
        } catch (error) {
            console.error('Error loading player recommendations:', error);
            document.querySelector('.player-extra-content').style.display = 'none';
        }
    }

    async playTrailer(id, mediaType) {
        this.currentId = id;
        this.currentType = mediaType;

        document.getElementById('detailModal').classList.remove('active');
        document.getElementById('playerModal').classList.add('active');

        // Hide selectors for trailer
        document.getElementById('tvControls').style.display = 'none';
        document.getElementById('serverSelect').closest('.server-selector').style.display = 'none';
        document.getElementById('shareBtn').style.display = 'none';
        document.getElementById('downloadBtn').style.display = 'none';
        document.getElementById('trailerPlayBtn').style.display = 'inline-flex';

        const videoPlayer = document.getElementById('videoPlayer');
        videoPlayer.src = ''; // Clear existing

        try {
            const api = window.tmdbAPI;
            const videos = mediaType === 'movie' 
                ? await api.getMovieVideos(id) 
                : await api.getTVVideos(id);
            
            const results = videos?.results || [];
            const trailer = results
                .filter(v => v.type === 'Trailer' && v.site === 'YouTube')
                .sort((a, b) => {
                    // Prioritize official trailers, then by latest publication date
                    if (a.official !== b.official) return b.official ? 1 : -1;
                    return new Date(b.published_at) - new Date(a.published_at);
                })[0];
            
            if (trailer) {
                videoPlayer.src = `https://www.youtube.com/embed/${trailer.key}?autoplay=1`;
                console.log('Playing Trailer:', trailer.key);
            } else {
                alert('No trailer available for this title.');
                this.closePlayer();
            }
        } catch (error) {
            console.error('Trailer error:', error);
            alert('Failed to load trailer.');
            this.closePlayer();
        }
    }

    async setupSeasonEpisodeSelector() {
        const seasonSelect = document.getElementById('seasonSelect');
        const episodeSelect = document.getElementById('episodeSelect');

        seasonSelect.innerHTML = '';
        episodeSelect.innerHTML = '';

        const tvDetails = await window.tmdbAPI.getTVDetails(this.currentId);

        if (tvDetails && tvDetails.seasons) {
            const seasons = tvDetails.seasons.filter(s => s.season_number > 0);

            seasons.forEach(season => {
                const option = document.createElement('option');
                option.value = season.season_number;
                option.textContent = season.name;
                seasonSelect.appendChild(option);
            });

            this.currentSeason = seasons[0].season_number;
            seasonSelect.value = this.currentSeason;

            await this.setupEpisodeSelector();

            // Season change handler
            seasonSelect.onchange = async (e) => {
                this.currentSeason = parseInt(e.target.value);
                await this.setupEpisodeSelector();
                this.loadServer();
                this.updateDownloadLink(); // Update download link
            };
        }
    }

    async setupEpisodeSelector() {
        const episodeSelect = document.getElementById('episodeSelect');
        episodeSelect.innerHTML = '';

        const seasonDetails = await window.tmdbAPI.getTVSeasonDetails(this.currentId, this.currentSeason);

        if (seasonDetails && seasonDetails.episodes) {
            seasonDetails.episodes.forEach(ep => {
                const option = document.createElement('option');
                option.value = ep.episode_number;
                option.textContent = `Episode ${ep.episode_number}: ${ep.name}`;
                episodeSelect.appendChild(option);
            });

            this.currentEpisode = seasonDetails.episodes[0].episode_number;
            episodeSelect.value = this.currentEpisode;
            this.updateDownloadLink(); // Update download link for initial episode

            // Episode change handler
            episodeSelect.onchange = (e) => {
                this.currentEpisode = parseInt(e.target.value);
                this.loadServer();
                this.updateDownloadLink(); // Update download link
            };
        }
    }

    /* ── Server preference: Firebase-synced per account, localStorage fallback ── */

    async getSavedServer() {
        const local = this.getLocalServerPref();
        const user = window.firebaseAuth?.currentUser;

        // Logged in → cloud is the source of truth (kept in local storage too,
        // so the choice still works offline / on slow connections).
        if (user && window.firebaseDb) {
            try {
                const snap = await window.firebaseDb.ref(`preferences/${user.uid}/preferredServer`).once('value');
                const cloud = snap.val();
                if (cloud !== null && cloud !== undefined) {
                    this.setLocalServerPref(cloud);
                    return parseInt(cloud, 10);
                }
            } catch (e) {
                console.warn('Cloud server pref read failed:', e.message);
            }
        }
        return local;
    }

    async saveServer(index) {
        this.setLocalServerPref(index);
        const user = window.firebaseAuth?.currentUser;
        if (user && window.firebaseDb) {
            try {
                await window.firebaseDb.ref(`preferences/${user.uid}/preferredServer`).set(index);
            } catch (e) {
                console.warn('Cloud server pref save failed:', e.message);
            }
        }
    }

    /**
     * Called when a user logs in: upload their device-local preference to the
     * cloud only if the account doesn't already have one (cloud wins otherwise).
     */
    async syncServerPrefOnLogin(uid) {
        if (!window.firebaseDb) return;
        try {
            const snap = await window.firebaseDb.ref(`preferences/${uid}/preferredServer`).once('value');
            if (snap.val() === null || snap.val() === undefined) {
                const local = this.getLocalServerPref();
                if (local >= 0) {
                    await window.firebaseDb.ref(`preferences/${uid}/preferredServer`).set(local);
                }
            }
        } catch (e) {
            console.warn('Server pref login sync failed:', e.message);
        }
    }

    getLocalServerPref() {
        try {
            const idx = parseInt(localStorage.getItem('moviepox_preferred_server'), 10);
            return Number.isInteger(idx) ? idx : -1;
        } catch {
            return -1;
        }
    }

    setLocalServerPref(index) {
        try {
            localStorage.setItem('moviepox_preferred_server', String(index));
        } catch {
            // Storage unavailable — preference just won't persist locally
        }
    }

    loadServer() {
        const server = this.config.servers[this.currentServer];
        const videoPlayer = document.getElementById('videoPlayer');

        let embedURL = '';

        if (this.currentType === 'tv') {
            if (server.tv_format) {
                embedURL = server.tv_format
                    .replace('{url}', server.tv_url)
                    .replace('{tmdb_id}', this.currentId)
                    .replace('{season}', this.currentSeason)
                    .replace('{episode}', this.currentEpisode);
            } else {
                embedURL = `${server.tv_url}${this.currentId}/${this.currentSeason}/${this.currentEpisode}`;
            }
        } else {
            embedURL = server.movie_format
                ? server.movie_format
                    .replace('{url}', server.movie_url)
                    .replace('{tmdb_id}', this.currentId)
                : server.movie_url + this.currentId;
        }

        videoPlayer.src = embedURL;

        if (server.id === 2) {
            videoPlayer.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
        } else {
            videoPlayer.removeAttribute('sandbox');
        }

        console.log('Loading:', embedURL);

        this.updateDownloadLink(); // Update download link when server changes
    }

    updateDownloadLink() {
        const btn = document.getElementById('downloadBtn');
        const modalBtn = document.getElementById('modal-download-btn');
        if (!this.currentId) return;

        const triggerDownload = () => {
            if (window.downloadManager) {
                window.downloadManager.initiate(this.currentId, this.currentType, this.currentSeason, this.currentEpisode);
            } else {
                // Fallback
                const url = this.currentType === 'tv'
                    ? `https://vidsrc.me/download/${this.currentId}/${this.currentSeason || 1}/${this.currentEpisode || 1}`
                    : `https://vidsrc.me/download/${this.currentId}`;
                window.open(url, '_blank', 'noopener,noreferrer');
            }
        };

        if (btn) btn.onclick = triggerDownload;
        if (modalBtn) modalBtn.onclick = triggerDownload;
    }

    closePlayer() {
        document.getElementById('playerModal').classList.remove('active');
        document.getElementById('videoPlayer').src = '';
    }
}

window.playerManager = new PlayerManager();
