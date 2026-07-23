// Vercel edge middleware to limit sync-intimacy calls
// Since we can't easily patch the monolithic index.js inline,
// this standalone endpoint overrides /api/user/sync-intimacy

const{Pool}=require('pg');const jwt=require('jsonwebtoken');
const S=process.env.JWT_SECRET||'beside-you-pearl-2026';
const pool=new Pool({connectionString:process.env.POSTGRES_URL||process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:2});

function authAny(req){
  const h=req.headers.authorization;
  if(h&&h.startsWith('Bearer ')){try{return jwt.verify(h.slice(7),S)}catch{}}
  const url=new URL(req.url,'http://x');const t=url.searchParams.get('token');
  if(t){try{return jwt.verify(t,S)}catch{}}
  return null;
}

module.exports=async function(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
  if(req.method==='OPTIONS')return res.status(200).end();

  const d=authAny(req);
  if(!d)return res.status(401).json({error:'unauth'});

  // Ensure table exists
  await pool.query('CREATE TABLE IF NOT EXISTS user_touches(id SERIAL PRIMARY KEY,user_id INTEGER NOT NULL,touch_date DATE NOT NULL,touch_count INTEGER DEFAULT 0,UNIQUE(user_id,touch_date))').catch(()=>{});

  const today=new Date().toISOString().slice(0,10);
  const existing=await pool.query('SELECT touch_count FROM user_touches WHERE user_id=$1 AND touch_date=$2',[d.id,today]);
  const count=existing.rows.length?existing.rows[0].touch_count:0;

  if(count>=3)return res.status(429).json({error:'今天已经摸过3次了',touches_today:count,max:3,intimacy:null});

  // Increment touch count
  if(existing.rows.length){
    await pool.query('UPDATE user_touches SET touch_count=touch_count+1 WHERE user_id=$1 AND touch_date=$2',[d.id,today]);
  }else{
    await pool.query('INSERT INTO user_touches(user_id,touch_date,touch_count) VALUES($1,$2,1)',[d.id,today]);
  }

  // Update intimacy
  const userRes=await pool.query('SELECT intimacy FROM users WHERE id=$1',[d.id]);
  const cur=userRes.rows[0]?.intimacy||0;
  const nv=Math.min(cur+5,100);
  await pool.query('UPDATE users SET intimacy=$1 WHERE id=$2',[nv,d.id]);

  return res.json({ok:true,intimacy:nv,touches_today:count+1,max:3});
};
