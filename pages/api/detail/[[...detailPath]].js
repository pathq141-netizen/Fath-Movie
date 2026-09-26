const detailHandler = require('../../../lib/handlers/detail');
const { enforceSameOrigin } = require('../../../lib/security');

export default async function handler(req, res) {
  if (!enforceSameOrigin(req, res)) return;
  const pathParts = req.query.detailPath;
  if (Array.isArray(pathParts) && pathParts.length > 0) {
    req.query.detailPath = pathParts.join('/');
  }
  return detailHandler(req, res);
}
