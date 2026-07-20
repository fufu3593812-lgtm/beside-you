const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// 初始化表结构
async function init() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(100),
        tokens INTEGER DEFAULT 1600,
        intimacy INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS collection (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        card_name VARCHAR(100) NOT NULL,
        obtained_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, card_name)
      );

      CREATE TABLE IF NOT EXISTS bag (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        item_name VARCHAR(100) NOT NULL,
        quantity INTEGER DEFAULT 1,
        UNIQUE(user_id, item_name)
      );

      CREATE TABLE IF NOT EXISTS gacha_pity (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        pool_name VARCHAR(50) NOT NULL,
        pity_bg INTEGER DEFAULT 0,
        pity_emotion INTEGER DEFAULT 0,
        UNIQUE(user_id, pool_name)
      );

      CREATE TABLE IF NOT EXISTS outfits (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        outfit_name VARCHAR(100) NOT NULL,
        equipped BOOLEAN DEFAULT FALSE,
        UNIQUE(user_id, outfit_name)
      );

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        room VARCHAR(50) DEFAULT 'public',
        content TEXT NOT NULL,
        sender VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Database tables initialized');
  } finally {
    client.release();
  }
}

module.exports = { pool, init };
