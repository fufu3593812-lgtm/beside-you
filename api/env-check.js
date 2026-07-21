module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const pg = require('pg');
    res.json({
      env_db: !!process.env.DATABASE_URL,
      env_jwt: !!process.env.JWT_SECRET,
      pg_loaded: !!pg,
      db_url_start: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) : 'NOT_SET'
    });
  } catch (err) {
    res.status(500).json({ error: err.message, phase: 'require_pg' });
  }
};
