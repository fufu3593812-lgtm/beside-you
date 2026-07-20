const { pool, init } = require('../lib/db');
const { verifyToken, cors } = require('../lib/auth');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ error: '未登录或登录已过期' });

  await init();
  const userId = decoded.id;

  const userResult = await pool.query(
    'SELECT id, username, display_name, tokens, intimacy, created_at FROM users WHERE id = $1',
    [userId]
  );
  if (userResult.rows.length === 0) {
    return res.status(404).json({ error: '用户不存在' });
  }

  const collectionResult = await pool.query(
    'SELECT card_name, obtained_at FROM collection WHERE user_id = $1',
    [userId]
  );

  const bagResult = await pool.query(
    'SELECT item_name, quantity FROM bag WHERE user_id = $1',
    [userId]
  );

  const outfitResult = await pool.query(
    'SELECT outfit_name, equipped FROM outfits WHERE user_id = $1',
    [userId]
  );

  const pityResult = await pool.query(
    'SELECT pool_name, pity_bg, pity_emotion FROM gacha_pity WHERE user_id = $1',
    [userId]
  );

  res.json({
    user: userResult.rows[0],
    collection: collectionResult.rows.map(r => r.card_name),
    bag: bagResult.rows.reduce((acc, r) => { acc[r.item_name] = r.quantity; return acc; }, {}),
    outfits: outfitResult.rows,
    pity: pityResult.rows.reduce((acc, r) => { acc[r.pool_name] = { bg: r.pity_bg, emotion: r.pity_emotion }; return acc; }, {})
  });
};
