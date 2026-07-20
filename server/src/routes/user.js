const { pool } = require('../db');

async function userRoutes(fastify) {
  // 获取用户数据（需登录）
  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request) => {
    const userId = request.user.id;

    const userResult = await pool.query(
      'SELECT id, username, display_name, tokens, intimacy, created_at FROM users WHERE id = $1',
      [userId]
    );
    if (userResult.rows.length === 0) {
      return { error: '用户不存在' };
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

    return {
      user: userResult.rows[0],
      collection: collectionResult.rows.map(r => r.card_name),
      bag: bagResult.rows.reduce((acc, r) => { acc[r.item_name] = r.quantity; return acc; }, {}),
      outfits: outfitResult.rows,
      pity: pityResult.rows.reduce((acc, r) => { acc[r.pool_name] = { bg: r.pity_bg, emotion: r.pity_emotion }; return acc; }, {})
    };
  });

  // 同步 token 余额
  fastify.post('/sync-tokens', { preHandler: [fastify.authenticate] }, async (request) => {
    const userId = request.user.id;
    const { tokens } = request.body || {};

    if (typeof tokens !== 'number' || tokens < 0) {
      return { error: 'invalid tokens value' };
    }

    await pool.query('UPDATE users SET tokens = $1 WHERE id = $2', [tokens, userId]);
    return { ok: true, tokens };
  });

  // 同步亲密度
  fastify.post('/sync-intimacy', { preHandler: [fastify.authenticate] }, async (request) => {
    const userId = request.user.id;
    const { intimacy } = request.body || {};

    if (typeof intimacy !== 'number' || intimacy < 0) {
      return { error: 'invalid intimacy value' };
    }

    await pool.query('UPDATE users SET intimacy = $1 WHERE id = $2', [intimacy, userId]);
    return { ok: true, intimacy };
  });
}

module.exports = userRoutes;
