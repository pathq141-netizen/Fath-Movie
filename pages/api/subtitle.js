const subtitleHandler = require('../../lib/handlers/subtitle');
const { enforceSameOrigin } = require('../../lib/security');

export default async function handler(req, res) {
  if (!enforceSameOrigin(req, res)) return;
  return subtitleHandler(req, res);
}
