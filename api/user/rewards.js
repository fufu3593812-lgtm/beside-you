// Reward claim API - prevents duplicate reward claims
// Uses a rewards table to track which rewards each user has claimed
const{Pool}=require('pg');const jwt=require('jsonwebtoken');
const S=process.env.JWT_SECRET||'beside-you-pearl-2026';
const pool=new Pool({connectionString:process.env.POSTGRES_URL||process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:2});

function auth(req){const h=req.headers.authorization;if(!h||!h.startsWith('Bearer '))return null;try{return jwt.verify(h.slice(7),S)}catch{return null}}

module.exports=async function(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
  if(req.method==='OPTIONS')return res.status(200).end();

  // Create table if needed
  await pool.query(`CREATE TABLE IF NOT EXISTS user_rewards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    reward_id VARCHAR(100) NOT NULL,
    tokens_granted INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, reward_id)
  )`).catch(()=>{});

  const d=auth(req);
  if(!d)return res.status(401).json({error:'unauth'});

  // GET: list claimed rewards
  if(req.method==='GET'){
    const r=await pool.query('SELECT reward_id FROM user_rewards WHERE user_id=$1',[d.id]);
    return res.json({claimed:r.rows.map(x=>x.reward_id)});
  }

  // POST: claim a reward
  if(req.method==='POST'){
    const{reward_id,tokens}=req.body||{};
    if(!reward_id)return res.status(400).json({error:'reward_id required'});

    // Check if already claimed
    const existing=await pool.query('SELECT id FROM user_rewards WHERE user_id=$1 AND reward_id=$2',[d.id,reward_id]);
    if(existing.rows.length)return res.status(409).json({error:'already claimed',reward_id});

    // Record claim
    const grant=typeof tokens==='number'&&tokens>0?tokens:0;
    await pool.query('INSERT INTO user_rewards(user_id,reward_id,tokens_granted) VALUES($1,$2,$3)',[d.id,reward_id,grant]);

    // Grant tokens if specified
    if(grant>0){
      await pool.query('UPDATE users SET tokens=tokens+$1 WHERE id=$2',[grant,d.id]);
    }

    const r=await pool.query('SELECT tokens FROM users WHERE id=$1',[d.id]);
    return res.json({ok:true,reward_id,tokens_granted:grant,total_tokens:r.rows[0]?.tokens||0});
  }

  return res.status(405).json({error:'method not allowed'});
};
