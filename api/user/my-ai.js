const{Pool}=require('pg');const jwt=require('jsonwebtoken');
const S=process.env.JWT_SECRET||'beside-you-pearl-2026';
const pool=new Pool({connectionString:process.env.POSTGRES_URL||process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:2});

function authAny(req){
  const h=req.headers.authorization;
  if(h&&h.startsWith('Bearer ')){try{return jwt.verify(h.slice(7),S)}catch{}}
  const url=new URL(req.url,'http://x');
  const t=url.searchParams.get('token');
  if(t){try{return jwt.verify(t,S)}catch{}}
  return null;
}

module.exports=async function(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
  if(req.method==='OPTIONS')return res.status(200).end();

  const d=authAny(req);
  if(!d||!d.id)return res.status(401).json({error:'unauth'});

  try{
    const userRes=await pool.query('SELECT agent_id FROM users WHERE id=$1',[d.id]);
    if(!userRes.rows.length||!userRes.rows[0].agent_id)return res.json({ok:true,ai:null});
    const agentRes=await pool.query('SELECT id,name,display_name,created_at FROM ai_agents WHERE id=$1',[userRes.rows[0].agent_id]);
    if(!agentRes.rows.length)return res.json({ok:true,ai:null});
    const a=agentRes.rows[0];
    return res.json({ok:true,ai:{id:a.id,name:a.name,display_name:a.display_name||a.name}});
  }catch(err){
    return res.status(500).json({error:err.message});
  }
};
