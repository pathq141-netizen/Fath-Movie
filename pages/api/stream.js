const streamHandler = require('../../lib/handlers/stream');
const { enforceSameOrigin } = require('../../lib/security');

export default async function handler(req, res) {
  if (!enforceSameOrigin(req, res)) return;
  return streamHandler(req, res);
}
