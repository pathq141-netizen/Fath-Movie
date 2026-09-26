const movie = require('../movie');
const { detailCache } = require('../cache');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(403).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ status: false, error: 'Method Not Allowed' });
  }

  try {
    const detailPath =
      req.query.detailPath ||
      req.query.path ||
      req.query.slug ||
      (req.params && req.params.detailPath);

    if (!detailPath) {
      return res.status(400).json({
        status: false,
        error: 'Parameter "detailPath", "path", atau "slug" dibutuhkan',
        data: null,
      });
    }

    const lang = req.query.lang || 'id';
    const cacheKey = `detail_${detailPath}_${lang}`;
    const cached = detailCache.get(cacheKey);

    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600, stale-while-revalidate=7200');
      return res.status(200).json({
        status: true,
        cached: true,
        data: cached,
      });
    }

    const data = await movie.detail(detailPath, lang);
    detailCache.set(cacheKey, data);

    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600, stale-while-revalidate=7200');
    return res.status(200).json({
      status: true,
      data,
    });
  } catch (err) {
    console.error('[API Detail Error]:', err.message);
    const statusCode = err.message.includes('404') ? 404 : 500;
    return res.status(statusCode).json({
      status: false,
      error: err.message || 'Internal Server Error',
      data: null,
    });
  }
};
