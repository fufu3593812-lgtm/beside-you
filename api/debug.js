const { pool, init } = require('../lib/db');
const { cors } = require('../lib/auth');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await init();
    const result = await pool.query('SELECT NOW() as now');
    res.json({ status: 'db_ok', time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
};
