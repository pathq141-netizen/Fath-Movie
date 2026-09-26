const captionsHandler = require('../../lib/handlers/captions');
const { enforceSameOrigin } = require('../../lib/security');

export default async function handler(req, res) {
  if (!enforceSameOrigin(req, res)) return;
  return captionsHandler(req, res);
}
