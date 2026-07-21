const { cors } = require('./_lib/auth');
module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.json({ status: 'ok', time: new Date().toISOString() });
};
