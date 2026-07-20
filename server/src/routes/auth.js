const bcrypt = require('bcrypt');
const { pool } = require('../db');

async function authRoutes(fastify) {
  // 注册
  fastify.post('/register', async (request, reply) => {
    const { username, password, display_name } = request.body || {};

    if (!username || !password) {
      return reply.status(400).send({ error: '用户名和密码不能为空' });
    }
    if (username.length < 2 || username.length > 50) {
      return reply.status(400).send({ error: '用户名 2-50 字' });
    }
    if (password.length < 4) {
      return reply.status(400).send({ error: '密码至少 4 位' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return reply.status(409).send({ error: '用户名已存在' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password_hash, display_name, tokens) VALUES ($1, $2, $3, 1600) RETURNING id, username, display_name, tokens, intimacy',
      [username, hash, display_name || username]
    );

    const user = result.rows[0];
    const token = fastify.jwt.sign({ id: user.id, username: user.username }, { expiresIn: '30d' });

    return { user, token };
  });

  // 登录
  fastify.post('/login', async (request, reply) => {
    const { username, password } = request.body || {};

    if (!username || !password) {
      return reply.status(400).send({ error: '用户名和密码不能为空' });
    }

    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return reply.status(401).send({ error: '用户名或密码错误' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return reply.status(401).send({ error: '用户名或密码错误' });
    }

    const token = fastify.jwt.sign({ id: user.id, username: user.username }, { expiresIn: '30d' });

    return {
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        tokens: user.tokens,
        intimacy: user.intimacy
      },
      token
    };
  });
}

module.exports = authRoutes;
