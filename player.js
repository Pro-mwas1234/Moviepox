// Player Manager with season/episode support and working download button
class PlayerManager {
    constructor() {
        this.config = null;
        this.currentServer = 0;
        this.currentId = null;
        this.currentType = null;
        this.currentSeason = 1;
        this.currentEpisode = 1;
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
            this.loadServer();
        };

        document.getElementById('playerModal').onclick = (e) => {
            if (e.target.id === 'playerModal') this.closePlayer();
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

        // Show/hide TV controls based on media type
        if (mediaType === 'tv') {
            document.getElementById('tvControls').style.display = 'flex';
            await this.setupSeasonEpisodeSelector();
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
            
            const trailer = videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
            
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
            embedURL = server.movie_url + this.currentId;
        }

        videoPlayer.src = embedURL;
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
