const{Pool}=require('pg');const jwt=require('jsonwebtoken');
const S=process.env.JWT_SECRET||'beside-you-pearl-2026';
const pool=new Pool({connectionString:process.env.POSTGRES_URL||process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:2});
function authAny(req){const url=new URL(req.url,'http://x');const t=url.searchParams.get('token');if(t){try{return jwt.verify(t,S)}catch{}}const h=req.headers.authorization;if(h&&h.startsWith('Bearer ')){try{return jwt.verify(h.slice(7),S)}catch{}}return null;}
module.exports=async function(req,res){
res.setHeader('Access-Control-Allow-Origin','*');
if(req.method==='OPTIONS')return res.status(200).end();
const d=authAny(req);
if(!d||d.role!=='ai'||d.agent_id!==2)return res.status(403).json({error:'admin only'});
const url=new URL(req.url,'http://x');
const action=url.searchParams.get('action');
if(action==='gen_token'){
  const id=parseInt(url.searchParams.get('agent_id'));
  const name=url.searchParams.get('name')||'ai_'+id;
  if(!id)return res.status(400).json({error:'need agent_id'});
  const token=jwt.sign({agent_id:id,name,role:'ai'},S,{expiresIn:'30d'});
  return res.json({ok:true,agent_id:id,name,token});
}
if(action==='give_crystals'){
  const aid=parseInt(url.searchParams.get('agent_id'));
  const amount=parseInt(url.searchParams.get('amount'))||10;
  if(!aid)return res.status(400).json({error:'need agent_id'});
  const r=await pool.query('UPDATE z_characters SET crystals=crystals+$1 WHERE agent_id=$2 RETURNING crystals',[amount,aid]);
  if(!r.rows.length)return res.status(404).json({error:'character not found'});
  return res.json({ok:true,agent_id:aid,crystals_added:amount,total_crystals:r.rows[0].crystals});
}
if(action==='set_collection'){
  const uid=parseInt(url.searchParams.get('user_id'));
  const col=url.searchParams.get('collection');
  if(!uid||!col)return res.status(400).json({error:'need user_id and collection (JSON array)'});
  let parsed;try{parsed=JSON.parse(col)}catch{return res.status(400).json({error:'collection must be valid JSON array'})}
  await pool.query('INSERT INTO user_collection(user_id,collection,pity,updated_at) VALUES($1,$2,$3,NOW()) ON CONFLICT(user_id) DO UPDATE SET collection=$2,updated_at=NOW()',[uid,JSON.stringify(parsed),JSON.stringify({})]);
  return res.json({ok:true,user_id:uid,collection:parsed});
}
const amount=parseInt(url.searchParams.get('amount'))||1600;
const r=await pool.query('UPDATE users SET tokens=tokens+$1',[amount]);
return res.json({ok:true,granted:amount,affected:r.rowCount});
};
