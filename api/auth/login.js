const bcrypt = require('bcryptjs');
const { pool, init } = require('../_lib/db');
const { signToken, cors } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await init();
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: '\u7528\u6237\u540d\u548c\u5bc6\u7801\u4e0d\u80fd\u4e3a\u7a7a' });
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(401).json({ error: '\u7528\u6237\u540d\u6216\u5bc6\u7801\u9519\u8bef' });
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: '\u7528\u6237\u540d\u6216\u5bc6\u7801\u9519\u8bef' });
    const token = signToken({ id: user.id, username: user.username });
    res.json({ user: { id: user.id, username: user.username, display_name: user.display_name, tokens: user.tokens, intimacy: user.intimacy }, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'server error' });
  }
};
