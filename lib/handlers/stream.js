const movie = require('../movie');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(403).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ status: false, error: 'Method Not Allowed' });
  }

  try {
    const detailPath = req.query.detailPath || req.query.path || req.query.slug;
    if (!detailPath) {
      return res.status(400).json({
        status: false,
        error: 'Parameter "detailPath", "path", atau "slug" dibutuhkan',
        data: null,
      });
    }

    const subjectId = req.query.subjectId || req.query.id || '';
    const season = parseInt(req.query.season || req.query.se || '0', 10);
    const episode = parseInt(req.query.episode || req.query.ep || '0', 10);
    const lang = req.query.lang || 'id';

    const data = await movie.stream(detailPath, subjectId, season, episode, lang);

    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
    return res.status(200).json({
      status: true,
      data,
    });
  } catch (err) {
    console.error('[API Stream Error]:', err.message);
    return res.status(500).json({
      status: false,
      error: err.message || 'Internal Server Error',
      data: null,
    });
  }
};
