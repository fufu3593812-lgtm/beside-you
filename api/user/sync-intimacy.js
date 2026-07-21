const { pool, init } = require('../_lib/db');
const { verifyToken, cors } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const decoded = verifyToken(req);
    if (!decoded) return res.status(401).json({ error: 'unauthorized' });
    await init();
    const { intimacy } = req.body || {};
    if (typeof intimacy !== 'number' || intimacy < 0) return res.status(400).json({ error: 'invalid' });
    await pool.query('UPDATE users SET intimacy = $1 WHERE id = $2', [intimacy, decoded.id]);
    res.json({ ok: true, intimacy });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
};
