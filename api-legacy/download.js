//export default function handler(req, res) {
  //  const { type, id, s, e } = req.query;

    //if (!id) {
      //  return res.status(400).json({ error: 'ID is required' });
    //}

    //let downloadUrl = '';

    //if (type === 'tv') {
        // Construct URL for TV show download via vidsrc.xyz (reliable aggregator)
      //  downloadUrl = `https://02moviedownloader.site/api/download/tv?tmdb=${id}&season=${s || 1}&episode=${e || 1}`;
    //} else {
        // Construct URL for movie download
      //  downloadUrl = `https://02moviedownloader.site/api/download/movie?tmdb=${id}`;
    //}

    // Use a 302 redirect to the download aggregator
    //res.setHeader('Location', downloadUrl);
    //res.status(302).end();
//}
