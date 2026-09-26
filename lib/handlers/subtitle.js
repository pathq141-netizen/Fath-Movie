const movie = require('../movie');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(403).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const subtitleUrl = req.query.url;
    if (!subtitleUrl) {
      return res.status(400).send('Parameter "url" subtitle dibutuhkan');
    }

    const subRes = await movie.request(subtitleUrl, {
      headers: {
        Referer: 'https://themoviebox.xyz/',
      },
    });

    if (!subRes.ok) {
      return res.status(subRes.status).send('Gagal mengunduh subtitle upstream');
    }

    const srtText = await subRes.text();
    const vttText = movie.convertSrtToVtt(srtText);

    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    return res.send(vttText);
  } catch (err) {
    console.error('[API Subtitle Error]:', err.message);
    return res.status(500).send(`Subtitle Error: ${err.message}`);
  }
};
