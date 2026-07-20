const bcrypt = require('bcrypt');
const { pool, init } = require('../lib/db');
const { signToken, cors } = require('../lib/auth');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  await init();

  const { username, password, display_name } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  if (username.length < 2 || username.length > 50) {
    return res.status(400).json({ error: '用户名 2-50 字' });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: '密码至少 4 位' });
  }

  const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: '用户名已存在' });
  }

  const hash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    'INSERT INTO users (username, password_hash, display_name, tokens) VALUES ($1, $2, $3, 1600) RETURNING id, username, display_name, tokens, intimacy',
    [username, hash, display_name || username]
  );

  const user = result.rows[0];
  const token = signToken({ id: user.id, username: user.username });

  res.json({ user, token });
};
