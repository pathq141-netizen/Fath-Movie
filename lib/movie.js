const https = require('https');
const dns = require('dns');

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Robust HTTP client using native Node.js https.request to ensure TLS stability
 */
function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(url);
      const opts = {
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + u.search,
        method: options.method || 'GET',
        headers: {
          'User-Agent': DEFAULT_USER_AGENT,
          ...options.headers,
        },
        servername: u.hostname,
        timeout: 15000,
      };

      const req = https.request(opts, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            headers: res.headers,
            text: () => Promise.resolve(data),
            json: () => {
              try {
                return Promise.resolve(JSON.parse(data));
              } catch (e) {
                return Promise.reject(new Error(`JSON Parse error: ${e.message}`));
              }
            },
          });
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout for ${url}`));
      });

      req.on('error', (err) => {
        reject(err);
      });

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

function formatDuration(seconds) {
  const s = Number(seconds) || 0;
  if (s <= 0) return '';
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  if (hrs > 0) {
    return `${hrs} jam ${mins > 0 ? `${mins} mnt` : ''}`.trim();
  }
  return `${mins} mnt`;
}

function formatBytes(bytes) {
  const b = Number(bytes) || 0;
  if (b <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${parseFloat((b / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Bootstrap session token from detail endpoint
 */
async function getSessionToken(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedToken && tokenExpiresAt > now + 60000) {
    return cachedToken;
  }

  try {
    const res = await request(
      'https://h5-api.aoneroom.com/wefeed-h5api-bff/detail?detailPath=the-scandal-mlNU8SlJXV8',
      {
        headers: {
          Accept: 'application/json',
          'X-Request-Lang': 'id',
          Origin: 'https://themoviebox.xyz',
          Referer: 'https://themoviebox.xyz/id',
        },
      }
    );

    const xUser = res.headers['x-user'];
    if (xUser) {
      const userObj = JSON.parse(xUser);
      if (userObj.token) {
        cachedToken = userObj.token;
        tokenExpiresAt = now + 6 * 3600 * 1000;
        return cachedToken;
      }
    }

    const setCookie = res.headers['set-cookie'];
    if (setCookie) {
      const cookieStr = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
      const match = cookieStr.match(/token=([^;]+)/);
      if (match) {
        cachedToken = match[1];
        tokenExpiresAt = now + 6 * 3600 * 1000;
        return cachedToken;
      }
    }
  } catch (err) {
    console.error('[MovieBox Scraper] Error getting session token:', err.message);
  }

  return cachedToken || '';
}

/**
 * 1. Search movies and TV series
 */
async function search(keyword, page = 1, perPage = 20, subjectType = 0, lang = 'id') {
  const trimmed = (keyword || '').trim();
  const subType = Number(subjectType) || 0;

  // Dedicated Short Drama search (upstream /subject/search does not index type 7)
  if (subType === 7) {
    try {
      const homeData = await home(lang);
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

      if (!trimmed) return shortDramas;

      const q = trimmed.toLowerCase();
      return shortDramas.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          (s.description && s.description.toLowerCase().includes(q)) ||
          (Array.isArray(s.genre) && s.genre.some((g) => g.toLowerCase().includes(q)))
      );
    } catch (e) {
      console.error('[Short Drama Search Warning]:', e.message);
      return [];
    }
  }

  if (!trimmed) return [];

  let token = await getSessionToken();

  async function callSearch(t) {
    return request('https://h5-api.aoneroom.com/wefeed-h5api-bff/subject/search', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: t ? `Bearer ${t}` : '',
        'X-Client-Info': JSON.stringify({ timezone: 'Asia/Jakarta' }),
        'X-Request-Lang': lang,
        Origin: 'https://themoviebox.xyz',
        Referer: `https://themoviebox.xyz/${lang}/web/searchResult?keyword=${encodeURIComponent(trimmed)}`,
        ...(t ? { Cookie: `mb_token=${encodeURIComponent(JSON.stringify(t))}` } : {}),
      },
      body: JSON.stringify({
        keyword: trimmed,
        page: Number(page) || 1,
        perPage: Number(perPage) || 20,
        subjectType: subType,
      }),
    });
  }

  let res = await callSearch(token);

  if (res.status === 400 || res.status === 401) {
    token = await getSessionToken(true);
    res = await callSearch(token);
  }

  if (!res.ok) {
    throw new Error(`TheMovieBox search request failed with HTTP ${res.status}`);
  }

  const json = await res.json();
  const items = json.data?.items || json.data || [];

  const formattedResults = items.map((item) => {
    const durSec = Number(item.duration) || 0;
    const releaseDate = item.releaseDate || '';
    const year = releaseDate ? releaseDate.split('-')[0] : '';
    const subType = Number(item.subjectType) || 1;

    let typeLabel = 'Movie';
    if (subType === 2) typeLabel = 'Series';
    else if (subType === 7) typeLabel = 'Short Drama';

    return {
      subjectId: String(item.subjectId || ''),
      subjectType: subType,
      typeLabel,
      title: item.title || '',
      description: item.description || '',
      releaseDate,
      year,
      duration: durSec,
      durationFormatted: subType === 1 ? formatDuration(durSec) : '',
      genre: item.genre ? item.genre.split(',').map((g) => g.trim()) : [],
      coverUrl: item.cover?.url || '',
      imdbRating: item.imdbRatingValue || '0.0',
      detailPath: item.detailPath || '',
      trailerMp4: item.trailer?.videoAddress?.url || '',
      stillsUrl: item.stills?.url || '',
    };
  });

  if (subType === 0 && trimmed) {
    try {
      const homeData = await home(lang);
      const q = trimmed.toLowerCase();
      (homeData.categories || []).forEach((c) => {
        c.items.forEach((item) => {
          if (
            (item.subjectType === 7 || item.typeLabel === 'Short Drama') &&
            (item.title.toLowerCase().includes(q) || (item.description && item.description.toLowerCase().includes(q)))
          ) {
            if (!formattedResults.some((f) => f.subjectId === item.subjectId)) {
              formattedResults.unshift(item);
            }
          }
        });
      });
    } catch (err) {
      // ignore
    }
  }

  return formattedResults;
}

/**
 * 2. Get trending movies and TV series
 */
async function trending(page = 1, perPage = 20, lang = 'id') {
  const url = `https://h5-api.aoneroom.com/wefeed-h5api-bff/subject/trending?page=${page}&perPage=${perPage}`;
  const res = await request(url, {
    headers: {
      Accept: 'application/json',
      'X-Request-Lang': lang,
      Origin: 'https://themoviebox.xyz',
      Referer: `https://themoviebox.xyz/${lang}`,
    },
  });

  if (!res.ok) {
    throw new Error(`TheMovieBox trending request failed with HTTP ${res.status}`);
  }

  const json = await res.json();
  const list = json.data?.subjectList || json.data?.items || [];

  return list.map((item) => {
    const durSec = Number(item.duration) || 0;
    const releaseDate = item.releaseDate || '';
    const year = releaseDate ? releaseDate.split('-')[0] : '';
    const subType = Number(item.subjectType) || 1;

    let typeLabel = 'Movie';
    if (subType === 2) typeLabel = 'Series';
    else if (subType === 7) typeLabel = 'Short Drama';

    return {
      subjectId: String(item.subjectId || ''),
      subjectType: subType,
      typeLabel,
      title: item.title || '',
      description: item.description || '',
      releaseDate,
      year,
      duration: durSec,
      durationFormatted: subType === 1 ? formatDuration(durSec) : '',
      genre: item.genre ? item.genre.split(',').map((g) => g.trim()) : [],
      coverUrl: item.cover?.url || '',
      imdbRating: item.imdbRatingValue || '0.0',
      detailPath: item.detailPath || '',
      trailerMp4: item.trailer?.videoAddress?.url || '',
      stillsUrl: item.stills?.url || '',
    };
  });
}

/**
 * 2b. Get full homepage recommendations from themoviebox.xyz/id
 */
async function home(lang = 'id') {
  const url = 'https://h5-api.aoneroom.com/wefeed-h5api-bff/home';
  const res = await request(url, {
    headers: {
      Accept: 'application/json',
      'X-Request-Lang': lang,
      Origin: 'https://themoviebox.xyz',
      Referer: `https://themoviebox.xyz/${lang}`,
    },
  });

  if (!res.ok) {
    throw new Error(`TheMovieBox home request failed with HTTP ${res.status}`);
  }

  const json = await res.json();
  const operatingList = json.data?.operatingList || [];

  function formatSubject(item) {
    const durSec = Number(item.duration) || 0;
    const releaseDate = item.releaseDate || '';
    const year = releaseDate ? releaseDate.split('-')[0] : '';
    const subType = Number(item.subjectType) || 1;

    let typeLabel = 'Movie';
    if (subType === 2) typeLabel = 'Series';
    else if (subType === 7) typeLabel = 'Short Drama';

    return {
      subjectId: String(item.subjectId || ''),
      subjectType: subType,
      typeLabel,
      title: item.title || '',
      description: item.description || '',
      releaseDate,
      year,
      duration: durSec,
      durationFormatted: subType === 1 ? formatDuration(durSec) : '',
      genre: item.genre ? item.genre.split(',').map((g) => g.trim()) : [],
      coverUrl: item.cover?.url || '',
      imdbRating: item.imdbRatingValue || '0.0',
      detailPath: item.detailPath || '',
      trailerMp4: item.trailer?.videoAddress?.url || '',
      stillsUrl: item.stills?.url || '',
    };
  }

  // 1. Extract Hero Banner (featured item)
  let heroItem = null;
  const bannerOp = operatingList.find((o) => o.type === 'BANNER');
  if (bannerOp && bannerOp.banner?.items && bannerOp.banner.items.length > 0) {
    const b0 = bannerOp.banner.items[0];
    const s0 = b0.subject || {};
    const heroSubType = Number(b0.subjectType || s0.subjectType) || 1;
    let heroTypeLabel = 'Movie';
    if (heroSubType === 2) heroTypeLabel = 'Series';
    else if (heroSubType === 7) heroTypeLabel = 'Short Drama';

    heroItem = {
      subjectId: String(b0.subjectId || s0.subjectId || ''),
      subjectType: heroSubType,
      typeLabel: heroTypeLabel,
      title: b0.title || s0.title || '',
      description: s0.description || '',
      releaseDate: s0.releaseDate || '',
      year: s0.releaseDate ? s0.releaseDate.split('-')[0] : '',
      duration: Number(s0.duration) || 0,
      durationFormatted: heroSubType === 1 ? formatDuration(s0.duration) : '',
      genre: s0.genre ? s0.genre.split(',').map((g) => g.trim()) : [],
      coverUrl: s0.cover?.url || '',
      stillsUrl: b0.image?.url || s0.stills?.url || s0.cover?.url || '',
      imdbRating: s0.imdbRatingValue || '8.5',
      detailPath: s0.detailPath || b0.detailPath || '',
    };
  }

  // 2. Extract Recommendation Categories (SUBJECTS_MOVIE)
  const categories = [];
  const seenTitles = new Set();

  for (const op of operatingList) {
    if (op.type === 'SUBJECTS_MOVIE' && Array.isArray(op.subjects) && op.subjects.length > 0) {
      const cleanTitle = (op.title || '').trim();
      if (!cleanTitle || seenTitles.has(cleanTitle)) continue;
      seenTitles.add(cleanTitle);

      const items = op.subjects
        .filter((s) => s.detailPath && s.title)
        .map(formatSubject);

      if (items.length > 0) {
        categories.push({
          title: cleanTitle,
          items,
        });
      }
    }
  }

  return {
    heroItem,
    categories,
  };
}

/**
 * 3. Get complete movie / series details with synopsis, audio dubs, trailer & episode list
 */
async function detail(detailPath, lang = 'id') {
  const cleanPath = (detailPath || '').replace(/^\/+/, '').split('/').pop() || detailPath;
  const url = `https://h5-api.aoneroom.com/wefeed-h5api-bff/detail?detailPath=${encodeURIComponent(cleanPath)}`;

  const res = await request(url, {
    headers: {
      Accept: 'application/json',
      'X-Request-Lang': lang,
      Origin: 'https://themoviebox.xyz',
      Referer: `https://themoviebox.xyz/${lang}`,
    },
  });

  if (!res.ok) {
    throw new Error(`TheMovieBox detail request failed with HTTP ${res.status}`);
  }

  const json = await res.json();
  const subject = json.data?.subject || {};
  const resource = json.data?.resource || {};

  const durSec = Number(subject.duration) || 0;
  const releaseDate = subject.releaseDate || '';
  const year = releaseDate ? releaseDate.split('-')[0] : '';
  const subType = Number(subject.subjectType) || 1;
  let typeLabel = 'Movie';
  if (subType === 2) typeLabel = 'Series';
  else if (subType === 7) typeLabel = 'Short Drama';

  const rawSeasons = resource.seasons || [];
  let totalEpCount = 0;
  const parsedSeasons = rawSeasons.map((s, idx) => {
    const seNum = Number(s.se) || Number(s.seasonNumber) || (idx + 1);
    const maxEp = Number(s.maxEp) || Number(s.maxEpisode) || 0;
    let epList = [];
    if (s.allEp && typeof s.allEp === 'string') {
      epList = s.allEp.split(',').map(Number).filter((n) => !isNaN(n));
    } else if (Array.isArray(s.allEpisodes) && s.allEpisodes.length > 0) {
      epList = s.allEpisodes;
    } else if (maxEp > 0) {
      epList = Array.from({ length: maxEp }, (_, i) => i + 1);
    } else {
      epList = [1];
    }

    const seasonTotal = maxEp || epList.length || 0;
    totalEpCount += seasonTotal;

    const resList = (s.resolutions || []).map((r) => Number(r.resolution || r)).filter((n) => !isNaN(n));

    return {
      seasonNumber: seNum,
      maxEpisode: seasonTotal,
      allEpisodes: epList,
      resolutions: resList,
    };
  });

  const isEpisodic = subType === 2 || subType === 7;
  const totalEpisodes = totalEpCount || (parsedSeasons[0]?.maxEpisode || parsedSeasons[0]?.allEpisodes?.length || 0);

  const trailerUrl = subject.trailer?.videoAddress?.url || '';

  return {
    subjectId: String(subject.subjectId || ''),
    subjectType: subType,
    typeLabel,
    totalEpisodes,
    isEpisodic,
    title: subject.title || '',
    description: subject.description || '',
    releaseDate,
    year,
    duration: durSec,
    durationFormatted: subType === 1 ? formatDuration(durSec) : '',
    genre: subject.genre ? subject.genre.split(',').map((g) => g.trim()) : [],
    coverUrl: subject.cover?.url || '',
    imdbRating: subject.imdbRatingValue || '0.0',
    imdbRatingCount: Number(subject.imdbRatingCount) || 0,
    countryName: subject.countryName || '',
    subtitles: subject.subtitles ? subject.subtitles.split(',').map((s) => s.trim()) : [],
    trailer: trailerUrl
      ? {
          url: trailerUrl,
          proxyUrl: `/api/proxy-stream?url=${encodeURIComponent(trailerUrl)}&filename=${encodeURIComponent(
            `${subject.title || 'Trailer'}-Trailer.mp4`
          )}`,
          duration: Number(subject.trailer?.videoAddress?.duration) || 0,
          width: Number(subject.trailer?.videoAddress?.width) || 0,
          height: Number(subject.trailer?.videoAddress?.height) || 0,
          coverUrl: subject.trailer?.cover?.url || '',
        }
      : null,
    dubs: (subject.dubs || []).map((d) => ({
      subjectId: String(d.subjectId || ''),
      language: d.lanName || '',
      code: d.lanCode || '',
      isOriginal: Boolean(d.original),
      detailPath: d.detailPath || '',
    })),
    resource: {
      source: resource.source || '',
      uploadBy: resource.uploadBy || '',
      seasons: parsedSeasons,
    },
    detailPath: cleanPath,
  };
}

/**
 * Helper to fetch stream options from /subject/play
 */
async function fetchPlay(subjectId, se, ep, detailPath, lang = 'id') {
  const playUrl = `https://h5-api.aoneroom.com/wefeed-h5api-bff/subject/play?subjectId=${encodeURIComponent(
    subjectId
  )}&se=${se}&ep=${ep}&detailPath=${encodeURIComponent(detailPath)}&streamSignType=1`;

  const res = await request(playUrl, {
    headers: {
      Accept: 'application/json',
      'X-Request-Lang': lang,
      Origin: 'https://themoviebox.xyz',
      Referer: `https://themoviebox.xyz/${lang}/spa/videoPlayPage/movies/${detailPath}`,
    },
  });

  if (!res.ok) {
    return { streams: [], rawDash: [], rawHls: [], hasResource: false };
  }

  const json = await res.json();
  const rawStreams = json.data?.streams || [];
  const rawDash = json.data?.dash || [];
  const rawHls = json.data?.hls || [];
  const hasResource = Boolean(json.data?.hasResource);

  const streams = rawStreams.map((s) => {
    const resNum = parseInt(s.resolutions, 10) || 0;
    const sizeBytes = Number(s.size) || 0;
    const durSec = Number(s.duration) || 0;
    const qualityLabel = resNum > 0 ? `${resNum}p` : 'MP4';
    const streamUrl = s.url || '';

    return {
      format: s.format || 'MP4',
      id: String(s.id || ''),
      quality: qualityLabel,
      resolution: resNum,
      url: streamUrl,
      proxyUrl: `/api/proxy-stream?url=${encodeURIComponent(streamUrl)}&filename=${encodeURIComponent(
        `${detailPath}-S${se}E${ep}-${qualityLabel}.mp4`
      )}`,
      size: sizeBytes,
      sizeFormatted: formatBytes(sizeBytes),
      duration: durSec,
      durationFormatted: formatDuration(durSec),
      codec: s.codecName || 'h264',
      vipLocked: Boolean(s.vipLocked),
    };
  });

  return { streams, rawDash, rawHls, hasResource };
}

/**
 * 4. Get direct playable stream URLs (MP4), resolutions, DASH, HLS and subtitles
 * Handles Movies (se=0, ep=0) and Series (se=1.., ep=1..) with automatic smart fallback
 */
async function stream(detailPath, subjectId, season = 0, episode = 0, lang = 'id') {
  const cleanPath = (detailPath || '').replace(/^\/+/, '').split('/').pop() || detailPath;
  let subId = subjectId;

  // Retrieve detail to know subjectType (1=Movie, 2=Series) and default season/episode
  const d = await detail(cleanPath, lang);
  if (!subId) subId = d.subjectId;
  const isMovie = d.subjectType === 1;

  let se = Number(season);
  let ep = Number(episode);

  // If user didn't specify or it's a Movie:
  if (isMovie) {
    // Movies always use season 0, episode 0
    se = 0;
    ep = 0;
  } else {
    // For series, if episode wasn't provided or is 0, pick the first episode of that season
    if ((isNaN(ep) || ep === 0) && d.resource?.seasons?.length) {
      const curSeason = d.resource.seasons.find((s) => s.seasonNumber === se) || d.resource.seasons[0];
      if (curSeason) {
        se = curSeason.seasonNumber;
        ep = curSeason.allEpisodes && curSeason.allEpisodes.length > 0 ? curSeason.allEpisodes[0] : 1;
      }
    }
  }

  // Attempt 1: Call with resolved se and ep
  let playResult = await fetchPlay(subId, se, ep, cleanPath, lang);

  // Smart Fallback 1: If 0 streams and was not se=0, ep=0, try se=0, ep=0
  if (playResult.streams.length === 0 && (se !== 0 || ep !== 0)) {
    const fb0 = await fetchPlay(subId, 0, 0, cleanPath, lang);
    if (fb0.streams.length > 0) {
      playResult = fb0;
      se = 0;
      ep = 0;
    }
  }

  // Smart Fallback 2: If 0 streams and was se=0, ep=0 (e.g. rare movie numbered se=1, ep=1), try se=1, ep=1
  if (playResult.streams.length === 0 && se === 0 && ep === 0) {
    const fb1 = await fetchPlay(subId, 1, 1, cleanPath, lang);
    if (fb1.streams.length > 0) {
      playResult = fb1;
      se = 1;
      ep = 1;
    }
  }

  // Smart Fallback 3: If stream is still empty but trailer MP4 exists, offer trailer as fallback
  if (playResult.streams.length === 0 && d.trailer?.url) {
    playResult.streams.push({
      format: 'MP4',
      id: 'trailer-fallback',
      quality: 'Trailer (Preview)',
      resolution: 480,
      url: d.trailer.url,
      proxyUrl: d.trailer.proxyUrl,
      size: 0,
      sizeFormatted: 'Preview MP4',
      duration: d.trailer.duration,
      durationFormatted: formatDuration(d.trailer.duration),
      codec: 'h264',
      vipLocked: false,
    });
  }

  // Fetch subtitles for this stream
  let subtitles = [];
  if (playResult.streams.length > 0 && playResult.streams[0].id !== 'trailer-fallback') {
    try {
      subtitles = await captions(cleanPath, subId, playResult.streams[0].id, lang);
    } catch (err) {
      console.warn('[MovieBox Scraper] Subtitle fetch warning:', err.message);
    }
  }

  const dashUrl = playResult.rawDash[0]?.url || undefined;
  const hlsUrl = playResult.rawHls[0]?.url || undefined;

  return {
    subjectId: subId,
    detailPath: cleanPath,
    title: d.title,
    isMovie,
    season: se,
    episode: ep,
    streams: playResult.streams,
    subtitles,
    dashUrl,
    hlsUrl,
    hasResource: playResult.hasResource,
  };
}

/**
 * 5. Get subtitles (.srt)
 */
async function captions(detailPath, subjectId, streamId, lang = 'id') {
  const cleanPath = (detailPath || '').replace(/^\/+/, '').split('/').pop() || detailPath;
  const captionUrl = `https://h5-api.aoneroom.com/wefeed-h5api-bff/subject/caption?format=MP4&id=${encodeURIComponent(
    streamId
  )}&subjectId=${encodeURIComponent(subjectId)}&detailPath=${encodeURIComponent(cleanPath)}`;

  const res = await request(captionUrl, {
    headers: {
      Accept: 'application/json',
      'X-Request-Lang': lang,
      Origin: 'https://themoviebox.xyz',
      Referer: `https://themoviebox.xyz/${lang}/spa/videoPlayPage/movies/${cleanPath}`,
    },
  });

  if (!res.ok) return [];

  const json = await res.json();
  const list = json.data?.captions || [];

  return list.map((c) => ({
    id: String(c.id || ''),
    languageCode: c.lan || '',
    languageName: c.lanName || c.lan || 'Subtitle',
    srtUrl: c.url || '',
    vttUrl: `/api/subtitle?url=${encodeURIComponent(c.url || '')}&lang=${encodeURIComponent(c.lan || 'sub')}`,
    size: Number(c.size) || 0,
  }));
}

/**
 * 6. Convert SRT to WebVTT
 */
function convertSrtToVtt(srtContent) {
  if (!srtContent) return 'WEBVTT\n\n';
  let clean = srtContent.replace(/^\uFEFF/, '');
  clean = clean.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  clean = clean.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  return `WEBVTT\n\n${clean.trim()}\n`;
}

module.exports = {
  request,
  search,
  trending,
  home,
  detail,
  stream,
  captions,
  convertSrtToVtt,
};
