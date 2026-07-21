const bcrypt = require('bcryptjs');
const { pool, init } = require('../_lib/db');
const { signToken, cors } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await init();
    const { username, password, display_name } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: '\u7528\u6237\u540d\u548c\u5bc6\u7801\u4e0d\u80fd\u4e3a\u7a7a' });
    if (username.length < 2 || username.length > 50) return res.status(400).json({ error: '\u7528\u6237\u540d 2-50 \u5b57' });
    if (password.length < 4) return res.status(400).json({ error: '\u5bc6\u7801\u81f3\u5c11 4 \u4f4d' });
    const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) return res.status(409).json({ error: '\u7528\u6237\u540d\u5df2\u5b58\u5728' });
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query('INSERT INTO users (username, password_hash, display_name, tokens) VALUES ($1, $2, $3, 1600) RETURNING id, username, display_name, tokens, intimacy', [username, hash, display_name || username]);
    const user = result.rows[0];
    const token = signToken({ id: user.id, username: user.username });
    res.json({ user, token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: err.message || 'server error' });
  }
};
