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
    const userId = decoded.id;
    const { outfit_name, cost } = req.body || {};
    if (!outfit_name || !cost) return res.status(400).json({ error: 'missing fields' });
    const userResult = await pool.query('SELECT tokens FROM users WHERE id = $1', [userId]);
    const currentTokens = userResult.rows[0].tokens;
    if (currentTokens < cost) return res.status(400).json({ error: 'token insufficient', tokens: currentTokens });
    await pool.query('UPDATE users SET tokens = tokens - $1 WHERE id = $2', [cost, userId]);
    await pool.query('INSERT INTO outfits (user_id, outfit_name) VALUES ($1, $2) ON CONFLICT (user_id, outfit_name) DO NOTHING', [userId, outfit_name]);
    res.json({ ok: true, tokens: currentTokens - cost });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
};
