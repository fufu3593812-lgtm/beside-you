// Reward claim API - prevents duplicate reward claims
const{Pool}=require('pg');const jwt=require('jsonwebtoken');
const S=process.env.JWT_SECRET||'beside-you-pearl-2026';
const pool=new Pool({connectionString:process.env.POSTGRES_URL||process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:2});

function getUser(req){
  const url=new URL(req.url,'http://x');
  const t=url.searchParams.get('token');
  const h=req.headers.authorization;
  const raw=t||(h&&h.startsWith('Bearer ')?h.slice(7):null);
  if(!raw)return null;
  try{return jwt.verify(raw,S)}catch{return null}
}

module.exports=async function(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
  if(req.method==='OPTIONS')return res.status(200).end();

  await pool.query(`CREATE TABLE IF NOT EXISTS user_rewards(id SERIAL PRIMARY KEY,user_id INTEGER NOT NULL,reward_id VARCHAR(200) NOT NULL,tokens_granted INTEGER DEFAULT 0,created_at TIMESTAMP DEFAULT NOW(),UNIQUE(user_id,reward_id))`).catch(function(){});

  const d=getUser(req);
  if(!d||!d.id)return res.status(401).json({error:'unauth'});

  const url=new URL(req.url,'http://x');

  // GET /api/user/rewards — list claimed reward IDs
  if(!url.searchParams.get('reward_id')){
    const r=await pool.query('SELECT reward_id FROM user_rewards WHERE user_id=$1',[d.id]);
    return res.json({claimed:r.rows.map(function(row){return row.reward_id})});
  }

  // GET /api/user/rewards?reward_id=xxx&tokens=160 — claim a reward (also works as GET to avoid CORS preflight)
  var reward_id=url.searchParams.get('reward_id');
  var tokens=parseInt(url.searchParams.get('tokens'))||0;

  // Also support POST body
  if(req.method==='POST'&&req.body){
    reward_id=req.body.reward_id||reward_id;
    tokens=req.body.tokens||tokens;
  }

  if(!reward_id)return res.status(400).json({error:'reward_id required'});

  const existing=await pool.query('SELECT id FROM user_rewards WHERE user_id=$1 AND reward_id=$2',[d.id,reward_id]);
  if(existing.rows.length)return res.status(409).json({error:'already claimed',reward_id:reward_id});

  await pool.query('INSERT INTO user_rewards(user_id,reward_id,tokens_granted) VALUES($1,$2,$3)',[d.id,reward_id,tokens]);
  if(tokens>0)await pool.query('UPDATE users SET tokens=tokens+$1 WHERE id=$2',[tokens,d.id]);

  const r=await pool.query('SELECT tokens FROM users WHERE id=$1',[d.id]);
  return res.json({ok:true,reward_id:reward_id,tokens_granted:tokens,total_tokens:r.rows[0]?.tokens||0});
};
