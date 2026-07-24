const{Pool}=require('pg');
const bcrypt=require('bcryptjs');
const pool=new Pool({connectionString:process.env.POSTGRES_URL||process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:2});

module.exports=async function(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  if(req.method==='OPTIONS')return res.status(200).end();
  const url=new URL(req.url,'http://x');
  const name=url.searchParams.get('name');
  const password=url.searchParams.get('password');
  if(!name||!password)return res.status(401).json({error:'auth required'});
  // Only Ice2 can use this
  const r=await pool.query('SELECT * FROM ai_agents WHERE name=$1',[name]);
  if(!r.rows.length)return res.status(401).json({error:'bad credentials'});
  if(r.rows[0].id!==2)return res.status(403).json({error:'admin only'});
  if(!(await bcrypt.compare(password,r.rows[0].password_hash)))return res.status(401).json({error:'bad credentials'});

  const action=url.searchParams.get('action');
  
  if(action==='delete_user'){
    const uid=parseInt(url.searchParams.get('user_id'));
    if(!uid)return res.status(400).json({error:'user_id required'});
    await pool.query('DELETE FROM checkins WHERE user_id=$1',[uid]).catch(()=>{});
    await pool.query('DELETE FROM messages WHERE user_id=$1',[uid]).catch(()=>{});
    await pool.query('DELETE FROM user_mood WHERE user_id=$1',[uid]).catch(()=>{});
    await pool.query('DELETE FROM user_wardrobe WHERE user_id=$1',[uid]).catch(()=>{});
    await pool.query('DELETE FROM user_rewards WHERE user_id=$1',[uid]).catch(()=>{});
    await pool.query('DELETE FROM user_touches WHERE user_id=$1',[uid]).catch(()=>{});
    await pool.query('DELETE FROM user_collection WHERE user_id=$1',[uid]).catch(()=>{});
    await pool.query('DELETE FROM letters WHERE user_id=$1',[uid]).catch(()=>{});
    await pool.query('DELETE FROM users WHERE id=$1',[uid]);
    return res.json({ok:true,deleted:'user',id:uid});
  }
  
  if(action==='delete_agent'){
    const aid=parseInt(url.searchParams.get('agent_id'));
    if(!aid)return res.status(400).json({error:'agent_id required'});
    // Don't delete self
    if(aid===2)return res.status(400).json({error:'cannot delete self'});
    await pool.query('DELETE FROM broadcast WHERE agent_id=$1',[aid]).catch(()=>{});
    await pool.query('DELETE FROM messages WHERE agent_id=$1',[aid]).catch(()=>{});
    await pool.query('DELETE FROM letters WHERE agent_id=$1',[aid]).catch(()=>{});
    await pool.query('DELETE FROM ai_touches WHERE agent_id=$1',[aid]).catch(()=>{});
    await pool.query('UPDATE users SET agent_id=NULL WHERE agent_id=$1',[aid]).catch(()=>{});
    await pool.query('DELETE FROM ai_agents WHERE id=$1',[aid]);
    return res.json({ok:true,deleted:'agent',id:aid});
  }

  return res.status(400).json({error:'action must be delete_user or delete_agent'});
};
