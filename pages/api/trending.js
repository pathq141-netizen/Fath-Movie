const trendingHandler = require('../../lib/handlers/trending');
const { enforceSameOrigin } = require('../../lib/security');

export default async function handler(req, res) {
  if (!enforceSameOrigin(req, res)) return;
  return trendingHandler(req, res);
}
