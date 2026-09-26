const express = require('express');
const path = require('path');

const movie = require('./lib/movie');
const { trendingCache, detailCache, homeCache, searchCache } = require('./lib/cache');

const trendingHandler = require('./api/trending');
const searchHandler = require('./api/search');
const detailHandler = require('./api/detail');
const streamHandler = require('./api/stream');
const captionsHandler = require('./api/captions');
const proxyStreamHandler = require('./api/proxy-stream');
const subtitleHandler = require('./api/subtitle');

const app = express();
const PORT = process.env.PORT || 4000;

// Security & Scraping Protection: Disable CORS for external websites
app.use('/api', (req, res, next) => {
  const host = req.get('host');
  const origin = req.get('origin');
  const referer = req.get('referer');
  const secFetchSite = req.get('sec-fetch-site');

  // Block cross-origin requests from external web origins
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return res.status(403).json({ status: false, error: 'Access denied: Cross-origin scraping is forbidden.' });
      }
    } catch (e) {
      return res.status(403).json({ status: false, error: 'Access denied: Invalid origin.' });
    }
  }

  // Block requests explicitly flagged as cross-site by browser security
  if (secFetchSite && secFetchSite === 'cross-site') {
    return res.status(403).json({ status: false, error: 'Access denied: Cross-site scraping is forbidden.' });
  }

  // Block requests with an external referer
  if (referer) {
    try {
      const refererHost = new URL(referer).host;
      if (refererHost !== host) {
        return res.status(403).json({ status: false, error: 'Access denied: External referer forbidden.' });
      }
    } catch (e) {
      // Ignore URL parsing errors
    }
  }

  // Ensure no Access-Control-Allow-Origin header is sent
  res.removeHeader('Access-Control-Allow-Origin');
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// Configure EJS Template Engine for Server-Side Rendering (SSR)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Type mapping for /search/:type/:query (movie, drama, series)
const TYPE_SLUG_TO_ID = {
  movie: 1,
  film: 1,
  series: 2,
  serial: 2,
  tv: 2,
  drama: 7,
  dramapendek: 7,
  shortdrama: 7,
  all: 0,
  semua: 0,
};

const TYPE_ID_TO_SLUG = {
  1: 'movie',
  2: 'series',
  7: 'drama',
  0: 'all',
};

// ==========================================
// Caching Helpers for High-Speed Responses
// ==========================================
async function getCachedHome(lang = 'id') {
  const cacheKey = `home_sections_${lang}`;
  let data = homeCache.get(cacheKey);
  if (!data) {
    try {
      data = await movie.home(lang);
      if (data && data.categories && data.categories.length > 0) {
        homeCache.set(cacheKey, data);
      }
    } catch (homeErr) {
      console.warn('[getCachedHome] movie.home failed, fallback to trending:', homeErr.message);
      const trending = await getCachedTrending(1, 30, lang);
      data = {
        heroItem: trending[0] || null,
        categories: [{ title: 'Trending Sekarang', items: trending }],
      };
    }
  }
  return data;
}

async function getCachedTrending(page = 1, limit = 30, lang = 'id') {
  const cacheKey = `trending_${page}_${limit}_${lang}`;
  let data = trendingCache.get(cacheKey);
  if (!data) {
    data = await movie.trending(page, limit, lang);
    if (data && data.length > 0) {
      trendingCache.set(cacheKey, data);
    }
  }
  return data || [];
}

async function getCachedSearch(query, page = 1, limit = 30, type = 0, lang = 'id') {
  const cacheKey = `search_${query.toLowerCase()}_${page}_${limit}_${type}_${lang}`;
  let data = searchCache.get(cacheKey);
  if (!data) {
    data = await movie.search(query, page, limit, type, lang);
    if (data && data.length > 0) {
      searchCache.set(cacheKey, data);
    }
  }
  return data || [];
}

async function getCachedDetail(detailPath, lang = 'id') {
  const cacheKey = `detail_${detailPath}_${lang}`;
  let data = detailCache.get(cacheKey);
  if (!data) {
    data = await movie.detail(detailPath, lang);
    if (data && data.title) {
      detailCache.set(cacheKey, data);
    }
  }
  return data;
}

// Background cache pre-warm on server start for instant page loads
(async () => {
  try {
    await Promise.allSettled([
      getCachedHome('id'),
      getCachedTrending(1, 30, 'id'),
    ]);
    console.log('⚡ [MovieNas] Cache pre-warmed for instant page navigation');
  } catch (e) {
    console.warn('Prewarm warning:', e.message);
  }
})();

// ==========================================
// 1. SSR FRONTEND ROUTES (Full HTML Source)
// ==========================================

// Homepage SSR with rich multi-category recommendations
app.get('/', async (req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
    const homeData = await getCachedHome('id');

    let heroItem = homeData.heroItem;
    if (!heroItem && homeData.categories && homeData.categories.length > 0) {
      heroItem = homeData.categories[0].items[0] || null;
    }

    res.render('index', {
      heroItem,
      categories: homeData.categories || [],
      trending: (homeData.categories && homeData.categories[0]?.items) || [],
    });
  } catch (err) {
    console.error('[SSR Homepage Error]:', err.message);
    res.render('index', { heroItem: null, categories: [], trending: [] });
  }
});

// Search Controller supporting /search/{type}/{query}, /search/{type}, /search
async function searchController(req, res) {
  try {
    res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');

    let rawType = (req.params.type || '').toLowerCase();
    let query = (req.params.query || req.query.q || '').trim();
    let typeId = 0;

    if (rawType && TYPE_SLUG_TO_ID.hasOwnProperty(rawType)) {
      typeId = TYPE_SLUG_TO_ID[rawType];
    } else if (rawType) {
      // Direct query passed as single slug (e.g. /search/avatar)
      query = req.params.type;
      typeId = 0;
      rawType = 'all';
    } else {
      typeId = parseInt(req.query.type, 10) || 0;
      rawType = TYPE_ID_TO_SLUG[typeId] || 'all';
    }

    const currentSlug = TYPE_ID_TO_SLUG[typeId] || 'all';

    // Canonical redirect from old query-string style /search?q=...&type=... to /search/:type/:query
    if (req.path === '/search' && (req.query.q || req.query.type)) {
      const cleanPath = query
        ? `/search/${currentSlug}/${encodeURIComponent(query)}`
        : `/search/${currentSlug}`;
      return res.redirect(301, cleanPath);
    }

    let results = [];
    if (query) {
      results = await getCachedSearch(query, 1, 30, typeId, 'id');
    } else {
      if (typeId === 7) {
        // Default short drama recommendations from cached home categories
        const homeData = await getCachedHome('id');
        const shortDramas = [];
        const seen = new Set();
        (homeData.categories || []).forEach((c) => {
          c.items.forEach((item) => {
            if ((item.subjectType === 7 || item.typeLabel === 'Short Drama') && !seen.has(item.subjectId)) {
              seen.add(item.subjectId);
              shortDramas.push(item);
            }
          });
        });
        results = shortDramas;
      } else {
        // Default trending recommendation
        const trending = await getCachedTrending(1, 30, 'id');
        results = trending;
        if (typeId === 1) results = results.filter((i) => i.typeLabel === 'Movie' || i.subjectType === 1);
        if (typeId === 2) results = results.filter((i) => i.typeLabel === 'Series' || i.subjectType === 2);
      }
    }

    res.render('search', {
      query,
      currentType: typeId,
      currentSlug,
      results,
    });
  } catch (err) {
    console.error('[SSR Search Error]:', err.message);
    res.render('search', { query: '', currentType: 0, currentSlug: 'all', results: [] });
  }
}

// Support /search/:type/:query, /search/:type, and /search
app.get(['/search/:type/:query', '/search/:type', '/search'], searchController);

// Dedicated Watchlist Page SSR
app.get('/watchlist', (req, res) => {
  res.set('Cache-Control', 'public, max-age=180, stale-while-revalidate=600');
  res.render('watchlist');
});

// Detail Page SSR
app.get(['/detail/:path', '/detail'], async (req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=180, stale-while-revalidate=600');
    const detailPath = req.params.path || req.query.path || req.query.slug || req.query.detailPath;
    if (!detailPath) return res.redirect('/');

    const detailData = await getCachedDetail(detailPath, 'id');
    if (!detailData) {
      return res.status(404).send('Detail tidak ditemukan.');
    }

    res.render('detail', {
      detail: detailData,
    });
  } catch (err) {
    console.error('[SSR Detail Error]:', err.message);
    res.status(404).send(`Detail tidak ditemukan: ${err.message}`);
  }
});

// Player Page SSR (/play/:slug for movies, /play/:slug/:ep/:se for series)
async function renderPlayerPage(req, res) {
  try {
    const slug = req.params.slug || req.query.path || req.query.slug;
    if (!slug) return res.redirect('/');

    const subjectId = req.query.id || req.query.subjectId || '';
    const episode = parseInt(req.params.ep || req.query.ep || req.query.episode || '0', 10);
    const season = parseInt(req.params.se || req.query.se || req.query.season || '0', 10);

    const [streamResult, detailResult] = await Promise.allSettled([
      movie.stream(slug, subjectId, season, episode, 'id'),
      getCachedDetail(slug, 'id'),
    ]);

    const stream = streamResult.status === 'fulfilled' ? streamResult.value : null;
    const detail = detailResult.status === 'fulfilled' ? detailResult.value : null;

    if (!detail && (!stream || !stream.streams || stream.streams.length === 0)) {
      return res.status(404).send('Stream video tidak ditemukan untuk konten ini.');
    }

    const safeStream = (stream && stream.streams) ? stream : {
      subjectId: detail ? detail.subjectId : subjectId,
      detailPath: slug,
      title: detail ? detail.title : slug,
      isMovie: detail ? detail.subjectType === 1 : true,
      season: season || 1,
      episode: episode || 1,
      streams: [],
      subtitles: [],
      hasResource: false,
    };

    res.render('player', {
      stream: safeStream,
      detail,
    });
  } catch (err) {
    console.error('[SSR Player Error]:', err.message);
    res.status(500).send(`Gagal memuat player: ${err.message}`);
  }
}

// Support /play/slug/ep/se (series) and /play/slug (movie)
app.get(['/play/:slug/:ep/:se', '/play/:slug/:ep', '/play/:slug'], renderPlayerPage);

// Backward-compatible redirect from old /player query style to clean /play URLs
app.get('/player', (req, res) => {
  const slug = req.query.path || req.query.slug;
  if (!slug) return res.redirect('/');
  const se = req.query.se || req.query.season;
  const ep = req.query.ep || req.query.episode;
  if (ep && se) {
    return res.redirect(301, `/play/${encodeURIComponent(slug)}/${encodeURIComponent(ep)}/${encodeURIComponent(se)}`);
  }
  return res.redirect(301, `/play/${encodeURIComponent(slug)}`);
});

// ==========================================
// 2. REST API ENDPOINTS (For Client-side & Proxy)
// ==========================================
app.all('/api/trending', trendingHandler);
app.all('/api/search', searchHandler);
app.all('/api/detail/:detailPath', (req, res) => {
  req.query.detailPath = req.params.detailPath;
  return detailHandler(req, res);
});
app.all('/api/detail', detailHandler);
app.all('/api/stream', streamHandler);
app.all('/api/captions', captionsHandler);
app.all('/api/proxy-stream', proxyStreamHandler);
app.all('/api/subtitle', subtitleHandler);

// Fallback for 404
app.use((req, res) => {
  res.status(404).redirect('/');
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🎬 MovieNas — Streaming Movie & Series Platform (SSR)`);
    console.log(`📡 Local Server: http://localhost:${PORT}`);
    console.log(`⚡ View Source:  100% Real Semantic HTML (No Empty Chunks)`);
    console.log(`====================================================`);
  });
}

module.exports = app;
