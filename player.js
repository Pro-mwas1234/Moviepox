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
        this.loadServer();
        this.updateDownloadLink(); // Initialize download button
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