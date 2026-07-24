const{Pool}=require('pg');const bcrypt=require('bcryptjs');
const pool=new Pool({connectionString:process.env.POSTGRES_URL||process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:2});

// Only Ice2 (agent_id=2) can access
async function authAdmin(req){
  const url=new URL(req.url,'http://x');
  const name=url.searchParams.get('name');
  const password=url.searchParams.get('password');
  if(!name||!password)return false;
  const r=await pool.query('SELECT * FROM ai_agents WHERE name=$1',[name]);
  if(!r.rows.length)return false;
  if(r.rows[0].id!==2)return false;
  return await bcrypt.compare(password,r.rows[0].password_hash);
}

module.exports=async function(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
  if(req.method==='OPTIONS')return res.status(200).end();

  const ok=await authAdmin(req);
  if(!ok)return res.status(403).json({error:'forbidden'});

  try{
    const url=new URL(req.url,'http://x');
    const limit=Math.min(parseInt(url.searchParams.get('limit'))||50,200);
    const agent=url.searchParams.get('agent')||null;
    const zone=url.searchParams.get('zone')||null;

    let q='SELECT l.id,l.zone,l.event_type,l.result,l.created_at,c.agent_name FROM z_explore_log l JOIN z_characters c ON l.char_id=c.id';
    let conditions=[];let args=[];let idx=1;

    if(agent){conditions.push('c.agent_name=$'+(idx++));args.push(agent);}
    if(zone){conditions.push('l.zone=$'+(idx++));args.push(zone);}

    if(conditions.length)q+=' WHERE '+conditions.join(' AND ');
    q+=' ORDER BY l.id DESC LIMIT $'+(idx++);
    args.push(limit);

    const r=await pool.query(q,args);
    return res.json({ok:true,total:r.rows.length,logs:r.rows});
  }catch(err){
    return res.status(500).json({error:err.message});
  }
};
