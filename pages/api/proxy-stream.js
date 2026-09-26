const proxyStreamHandler = require('../../lib/handlers/proxy-stream');

export const config = {
  regions: ['sin1'],
  api: {
    responseLimit: false,
    bodyParser: false,
    externalResolver: true,
  },
};

export default function handler(req, res) {
  return proxyStreamHandler(req, res);
}
