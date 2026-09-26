const https = require('https');
const http = require('http');

module.exports = (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Accept-Ranges, Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).send('Method Not Allowed');
  }

  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send('Parameter "url" dibutuhkan');
  }

  const filename = req.query.filename || 'video.mp4';
  const isDownload = req.query.download === '1';

  return new Promise((resolve) => {
    try {
      const parsed = new URL(targetUrl);
      const isHttps = parsed.protocol === 'https:';
      const client = isHttps ? https : http;

      const upstreamHeaders = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Referer: 'https://themoviebox.xyz/',
        Origin: 'https://themoviebox.xyz',
        Accept: '*/*',
        'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
        'Sec-Fetch-Dest': 'video',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
      };

      if (req.headers.range) {
        upstreamHeaders['Range'] = req.headers.range;
      }

      const upstreamReq = client.request(
        {
          protocol: parsed.protocol,
          hostname: parsed.hostname,
          port: parsed.port || (isHttps ? 443 : 80),
          path: parsed.pathname + parsed.search,
          method: req.method,
          headers: upstreamHeaders,
          servername: parsed.hostname,
          timeout: 45000,
        },
        (upstreamRes) => {
          const statusCode = upstreamRes.statusCode || 200;
          res.status(statusCode);

          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Headers', 'Range, Accept-Ranges, Content-Type');
          res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');

          const contentType = upstreamRes.headers['content-type'] || 'video/mp4';
          res.setHeader('Content-Type', contentType);

          if (upstreamRes.headers['content-length']) {
            res.setHeader('Content-Length', upstreamRes.headers['content-length']);
          }
          if (upstreamRes.headers['content-range']) {
            res.setHeader('Content-Range', upstreamRes.headers['content-range']);
          }

          const disposition = isDownload ? 'attachment' : 'inline';
          res.setHeader(
            'Content-Disposition',
            `${disposition}; filename="${encodeURIComponent(filename)}"`
          );

          if (req.method === 'HEAD') {
            res.end();
            return resolve();
          }

          upstreamRes.pipe(res);

          res.on('finish', resolve);
          res.on('close', () => {
            upstreamRes.destroy();
            resolve();
          });

          upstreamRes.on('error', (err) => {
            console.error('[Proxy Stream Upstream Stream Error]:', err.message);
            if (!res.headersSent) res.status(502).end();
            resolve();
          });
        }
      );

      req.on('close', () => {
        upstreamReq.destroy();
        resolve();
      });

      upstreamReq.on('timeout', () => {
        upstreamReq.destroy();
        if (!res.headersSent) res.status(504).send('Gateway Timeout');
        resolve();
      });

      upstreamReq.on('error', (err) => {
        console.error('[Proxy Stream Request Error]:', err.message);
        if (!res.headersSent) res.status(502).send(`Proxy Error: ${err.message}`);
        resolve();
      });

      upstreamReq.end();
    } catch (err) {
      console.error('[Proxy Stream URL Error]:', err.message);
      if (!res.headersSent) res.status(400).send(`Invalid URL: ${err.message}`);
      resolve();
    }
  });
};
