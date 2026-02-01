async initiate(itemId, mediaType, season = 1, episode = 1) {
    // Validate inputs
    if (!Number.isInteger(itemId) || itemId <= 0) {
        console.error('Invalid itemId:', itemId);
        return;
    }
    if (mediaType === 'tv') {
        if (!Number.isInteger(season) || season <= 0 || !Number.isInteger(episode) || episode <= 0) {
            console.error('Invalid season/episode:', season, episode);
            return;
        }
    }

    // 🔧 Fix: Remove extra spaces in URL (was causing broken links)
    const url = mediaType === 'tv'
        ? `https://dl.vidsrc.vip/tv/${itemId}/${season}/${episode}`
        : `https://dl.vidsrc.vip/movie/${itemId}`;

    // 📊 TRACK DOWNLOAD IN GOOGLE ANALYTICS
    if (typeof gtag === 'function') {
        gtag('event', 'download', {
            event_category: 'Media',
            event_label: `${mediaType}_${itemId}${mediaType === 'tv' ? `_S${season}E${episode}` : ''}`,
            value: 1
        });
    }

    // ➤ OPEN DOWNLOAD IMMEDIATELY
    window.open(url, '_blank', 'noopener,noreferrer');

    // Rest of your existing logic (1DM, queue, etc.)
    if (/Android/i.test(navigator.userAgent) && window.OneDM) {
        const details = mediaType === 'tv'
            ? await window.tmdbAPI.getTVDetails(itemId).catch(() => null)
            : await window.tmdbAPI.getMovieDetails(itemId).catch(() => null);
        if (details) {
            window.OneDM.onModalOpen(details);
            this.addToQueue(details, mediaType, season, episode);
        }
    } else {
        try {
            const details = mediaType === 'tv'
                ? await window.tmdbAPI.getTVDetails(itemId)
                : await window.tmdbAPI.getMovieDetails(itemId);
            if (details) {
                this.addToQueue(details, mediaType, season, episode);
            }
        } catch (e) {
            // Silent fail — download already started
        }
    }
}
