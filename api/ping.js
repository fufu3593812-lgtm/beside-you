const { Pool } = require('pg');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    const result = await pool.query('SELECT NOW() as now');
    await pool.end();
    res.json({ status: 'ok', time: result.rows[0].now, env_set: !!process.env.DATABASE_URL });
  } catch (err) {
    res.status(500).json({ error: err.message, code: err.code, env_set: !!process.env.DATABASE_URL });
  }
};
