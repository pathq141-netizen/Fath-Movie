const searchHandler = require('../../lib/handlers/search');
const { enforceSameOrigin } = require('../../lib/security');

export default async function handler(req, res) {
  if (!enforceSameOrigin(req, res)) return;
  return searchHandler(req, res);
}
