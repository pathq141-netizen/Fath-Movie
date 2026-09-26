/**
 * Security & Anti-Scraping Middleware for API Routes
 * Blocks cross-origin, cross-site, and unauthorized scrapers.
 */

function enforceSameOrigin(req, res) {
  const host = req.headers['host'];
  const origin = req.headers['origin'];
  const referer = req.headers['referer'];
  const secFetchSite = req.headers['sec-fetch-site'];

  // Block OPTIONS preflights from external origins
  if (req.method === 'OPTIONS') {
    res.status(403).end();
    return false;
  }

  // Block cross-origin requests from external web origins
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        res.status(403).json({ status: false, error: 'Access denied: Cross-origin scraping is forbidden.' });
        return false;
      }
    } catch {
      res.status(403).json({ status: false, error: 'Access denied: Invalid origin.' });
      return false;
    }
  }

  // Block requests explicitly flagged as cross-site by browser security
  if (secFetchSite === 'cross-site') {
    res.status(403).json({ status: false, error: 'Access denied: Cross-site scraping is forbidden.' });
    return false;
  }

  // Block requests with an external referer
  if (referer) {
    try {
      const refererHost = new URL(referer).host;
      if (refererHost !== host) {
        res.status(403).json({ status: false, error: 'Access denied: External referer forbidden.' });
        return false;
      }
    } catch {
      // Ignore URL parsing errors
    }
  }

  // Ensure no Access-Control-Allow-Origin header is sent
  res.removeHeader('Access-Control-Allow-Origin');
  return true;
}

module.exports = {
  enforceSameOrigin,
};
