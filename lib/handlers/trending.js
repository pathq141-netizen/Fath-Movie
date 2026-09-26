const movie = require('../movie');
const { trendingCache } = require('../cache');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(403).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ status: false, error: 'Method Not Allowed' });
  }

  try {
    const page = parseInt(req.query.page, 10) || 1;
    const perPage = parseInt(req.query.perPage, 10) || 20;
    const lang = req.query.lang || 'id';

    const cacheKey = `trending_${page}_${perPage}_${lang}`;
    const cached = trendingCache.get(cacheKey);

    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', 'public, max-age=900, s-maxage=1800, stale-while-revalidate=3600');
      return res.status(200).json({
        status: true,
        cached: true,
        page,
        count: cached.length,
        data: cached,
      });
    }

    const data = await movie.trending(page, perPage, lang);
    trendingCache.set(cacheKey, data);

    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control', 'public, max-age=900, s-maxage=1800, stale-while-revalidate=3600');
    return res.status(200).json({
      status: true,
      page,
      count: data.length,
      data,
    });
  } catch (err) {
    console.error('[API Trending Error]:', err.message);
    return res.status(500).json({
      status: false,
      error: err.message || 'Internal Server Error',
      data: [],
    });
  }
};
