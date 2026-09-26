const movie = require('../movie');
const { searchCache } = require('../cache');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(403).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ status: false, error: 'Method Not Allowed' });
  }

  try {
    const keyword = (req.query.q || req.query.keyword || '').trim();
    if (!keyword) {
      return res.status(400).json({
        status: false,
        error: 'Query parameter "q" atau "keyword" dibutuhkan',
        data: [],
      });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const perPage = parseInt(req.query.perPage, 10) || 20;
    const subjectType = parseInt(req.query.type || req.query.subjectType, 10) || 0;
    const lang = req.query.lang || 'id';

    const cacheKey = `search_${keyword.toLowerCase()}_${page}_${perPage}_${subjectType}_${lang}`;
    let data = searchCache.get(cacheKey);
    if (!data) {
      data = await movie.search(keyword, page, perPage, subjectType, lang);
      if (data && data.length > 0) {
        searchCache.set(cacheKey, data);
      }
    }

    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
    return res.status(200).json({
      status: true,
      query: keyword,
      page,
      subjectType,
      count: data.length,
      data,
    });
  } catch (err) {
    console.error('[API Search Error]:', err.message);
    return res.status(500).json({
      status: false,
      error: err.message || 'Internal Server Error',
      data: [],
    });
  }
};
