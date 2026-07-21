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
    const { card_name, card_type, pool_name, tokens_after, pity_bg, pity_emotion } = req.body || {};
    if (!card_name || !pool_name) return res.status(400).json({ error: 'missing fields' });
    if (typeof tokens_after === 'number') await pool.query('UPDATE users SET tokens = $1 WHERE id = $2', [tokens_after, userId]);
    await pool.query('INSERT INTO gacha_pity (user_id, pool_name, pity_bg, pity_emotion) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, pool_name) DO UPDATE SET pity_bg = $3, pity_emotion = $4', [userId, pool_name, pity_bg || 0, pity_emotion || 0]);
    if (card_type === 'emotion' || card_type === 'bg') await pool.query('INSERT INTO collection (user_id, card_name) VALUES ($1, $2) ON CONFLICT (user_id, card_name) DO NOTHING', [userId, card_name]);
    if (card_type === 'prop') await pool.query('INSERT INTO bag (user_id, item_name, quantity) VALUES ($1, $2, 1) ON CONFLICT (user_id, item_name) DO UPDATE SET quantity = bag.quantity + 1', [userId, card_name]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
};
