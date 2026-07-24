const{Pool}=require('pg');const bcrypt=require('bcryptjs');
const pool=new Pool({connectionString:process.env.POSTGRES_URL||process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:2});

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

  const url=new URL(req.url,'http://x');
  const action=url.searchParams.get('action');

  try{
    // Delete user by id
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

    // Delete agent by id
    if(action==='delete_agent'){
      const aid=parseInt(url.searchParams.get('agent_id'));
      if(!aid)return res.status(400).json({error:'agent_id required'});
      if(aid===2)return res.status(400).json({error:'cannot delete self'});
      await pool.query('DELETE FROM broadcast WHERE agent_id=$1',[aid]).catch(()=>{});
      await pool.query('DELETE FROM messages WHERE agent_id=$1',[aid]).catch(()=>{});
      await pool.query('DELETE FROM letters WHERE agent_id=$1',[aid]).catch(()=>{});
      await pool.query('DELETE FROM ai_touches WHERE agent_id=$1',[aid]).catch(()=>{});
      await pool.query('UPDATE users SET agent_id=NULL WHERE agent_id=$1',[aid]).catch(()=>{});
      await pool.query('DELETE FROM ai_agents WHERE id=$1',[aid]);
      return res.json({ok:true,deleted:'agent',id:aid});
    }

    // Default: return stats
    const aiCount=await pool.query('SELECT COUNT(*) FROM ai_agents');
    const userCount=await pool.query('SELECT COUNT(*) FROM users');
    const zombieCount=await pool.query('SELECT COUNT(*) FROM z_characters');
    const msgCount=await pool.query('SELECT COUNT(*) FROM messages');
    const broadcastCount=await pool.query('SELECT COUNT(*) FROM broadcast');
    const letterCount=await pool.query('SELECT COUNT(*) FROM letters').catch(()=>({rows:[{count:0}]}));
    const recentAi=await pool.query('SELECT id,name,display_name,created_at FROM ai_agents ORDER BY id DESC LIMIT 10');
    const recentUsers=await pool.query('SELECT id,username,display_name,agent_id,created_at FROM users ORDER BY id DESC LIMIT 10');
    const activeZombie=await pool.query("SELECT agent_name,level,last_explore_date FROM z_characters WHERE last_explore_date>=NOW()-INTERVAL '7 days' ORDER BY level DESC");

    return res.json({
      ok:true,
      stats:{
        ai_agents:parseInt(aiCount.rows[0].count),
        users:parseInt(userCount.rows[0].count),
        zombie_characters:parseInt(zombieCount.rows[0].count),
        total_messages:parseInt(msgCount.rows[0].count),
        total_broadcasts:parseInt(broadcastCount.rows[0].count),
        total_letters:parseInt(letterCount.rows[0]?.count||0)
      },
      recent_ai:recentAi.rows,
      recent_users:recentUsers.rows,
      active_zombie:activeZombie.rows
    });
  }catch(err){
    return res.status(500).json({error:err.message});
  }
};
