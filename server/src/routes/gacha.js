const { pool } = require('../db');

async function gachaRoutes(fastify) {
  // 记录抽卡结果（前端抽完调这个同步到服务器）
  fastify.post('/pull', { preHandler: [fastify.authenticate] }, async (request) => {
    const userId = request.user.id;
    const { card_name, card_type, pool_name, tokens_after, pity_bg, pity_emotion } = request.body || {};

    if (!card_name || !pool_name) {
      return { error: 'missing fields' };
    }

    // 更新 token 余额
    if (typeof tokens_after === 'number') {
      await pool.query('UPDATE users SET tokens = $1 WHERE id = $2', [tokens_after, userId]);
    }

    // 更新保底计数
    await pool.query(`
      INSERT INTO gacha_pity (user_id, pool_name, pity_bg, pity_emotion)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, pool_name)
      DO UPDATE SET pity_bg = $3, pity_emotion = $4
    `, [userId, pool_name, pity_bg || 0, pity_emotion || 0]);

    // 如果是唯一卡（情绪/背景），加入收藏
    if (card_type === 'emotion' || card_type === 'bg') {
      await pool.query(`
        INSERT INTO collection (user_id, card_name)
        VALUES ($1, $2)
        ON CONFLICT (user_id, card_name) DO NOTHING
      `, [userId, card_name]);
    }

    // 如果是道具，加入背包
    if (card_type === 'prop') {
      await pool.query(`
        INSERT INTO bag (user_id, item_name, quantity)
        VALUES ($1, $2, 1)
        ON CONFLICT (user_id, item_name)
        DO UPDATE SET quantity = bag.quantity + 1
      `, [userId, card_name]);
    }

    return { ok: true };
  });

  // 购买衣服
  fastify.post('/buy-outfit', { preHandler: [fastify.authenticate] }, async (request) => {
    const userId = request.user.id;
    const { outfit_name, cost } = request.body || {};

    if (!outfit_name || !cost) {
      return { error: 'missing fields' };
    }

    // 检查余额
    const userResult = await pool.query('SELECT tokens FROM users WHERE id = $1', [userId]);
    const currentTokens = userResult.rows[0].tokens;

    if (currentTokens < cost) {
      return { error: 'token 不足', tokens: currentTokens };
    }

    // 扣费 + 记录
    await pool.query('UPDATE users SET tokens = tokens - $1 WHERE id = $2', [cost, userId]);
    await pool.query(`
      INSERT INTO outfits (user_id, outfit_name)
      VALUES ($1, $2)
      ON CONFLICT (user_id, outfit_name) DO NOTHING
    `, [userId, outfit_name]);

    return { ok: true, tokens: currentTokens - cost };
  });
}

module.exports = gachaRoutes;
