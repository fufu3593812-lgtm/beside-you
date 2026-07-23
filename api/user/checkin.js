// Standalone checkin endpoint - supports GET to avoid CORS preflight issues on mobile
const{Pool}=require('pg');const jwt=require('jsonwebtoken');
const S=process.env.JWT_SECRET||'beside-you-pearl-2026';
const pool=new Pool({connectionString:process.env.POSTGRES_URL||process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:2});

function getUser(req){
  // Support both header and query param
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

  const today=new Date().toISOString().slice(0,10);
  const existing=await pool.query('SELECT id FROM checkins WHERE user_id=$1 AND checked_date=$2',[d.id,today]);
  if(existing.rows.length)return res.status(409).json({error:'already checked in today'});

  await pool.query('INSERT INTO checkins(user_id,checked_date) VALUES($1,$2)',[d.id,today]);
  await pool.query('UPDATE users SET tokens=tokens+160 WHERE id=$1',[d.id]);
  const r=await pool.query('SELECT tokens FROM users WHERE id=$1',[d.id]);
  return res.json({ok:true,tokens:r.rows[0].tokens,date:today});
};
