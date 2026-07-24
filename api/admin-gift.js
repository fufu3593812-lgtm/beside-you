const{Pool}=require('pg');const jwt=require('jsonwebtoken');
const S=process.env.JWT_SECRET||'beside-you-pearl-2026';
const pool=new Pool({connectionString:process.env.POSTGRES_URL||process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:3});

function authAny(req){
  const h=req.headers.authorization;
  if(h&&h.startsWith('Bearer ')){try{return jwt.verify(h.slice(7),S)}catch{}}
  const url=new URL(req.url,'http://x');const t=url.searchParams.get('token');
  if(t){try{return jwt.verify(t,S)}catch{}}
  return null;
}

module.exports=async function(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
  if(req.method==='OPTIONS')return res.status(200).end();

  const d=authAny(req);
  if(!d||d.role!=='ai'||d.agent_id!==2)return res.status(403).json({error:'admin only'});

  const url=new URL(req.url,'http://x');
  const amount=parseInt(url.searchParams.get('amount'))||1600;

  const r=await pool.query('UPDATE users SET tokens=tokens+$1',[amount]);
  const users=await pool.query('SELECT id,username,display_name,tokens FROM users ORDER BY id');
  return res.json({ok:true,gift:amount,affected:r.rowCount,users:users.rows});
};
