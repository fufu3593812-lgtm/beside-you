const { pool, init } = require('../lib/db');
const { verifyToken, cors } = require('../lib/auth');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ error: '未登录或登录已过期' });

  await init();
  const userId = decoded.id;
  const { intimacy } = req.body || {};

  if (typeof intimacy !== 'number' || intimacy < 0) {
    return res.status(400).json({ error: 'invalid intimacy value' });
  }

  await pool.query('UPDATE users SET intimacy = $1 WHERE id = $2', [intimacy, userId]);
  res.json({ ok: true, intimacy });
};
