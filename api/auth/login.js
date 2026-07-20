const bcrypt = require('bcrypt');
const { pool, init } = require('../lib/db');
const { signToken, cors } = require('../lib/auth');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  await init();

  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  if (result.rows.length === 0) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  const token = signToken({ id: user.id, username: user.username });

  res.json({
    user: {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      tokens: user.tokens,
      intimacy: user.intimacy
    },
    token
  });
};
