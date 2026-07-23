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

  const d=getUser(req);
  if(!d||!d.id)return res.status(401).json({error:'unauth'});

  await pool.query(`CREATE TABLE IF NOT EXISTS user_rewards(id SERIAL PRIMARY KEY,user_id INTEGER NOT NULL,reward_id VARCHAR(200) NOT NULL,claimed_at TIMESTAMP DEFAULT NOW(),UNIQUE(user_id,reward_id))`);

  const r=await pool.query('SELECT reward_id FROM user_rewards WHERE user_id=$1',[d.id]);
  return res.json({claimed:r.rows.map(function(row){return row.reward_id})});
};
