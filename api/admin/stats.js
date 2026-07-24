const{Pool}=require('pg');const bcrypt=require('bcryptjs');
const pool=new Pool({connectionString:process.env.POSTGRES_URL||process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:2});

// Admin stats - only accessible by Ice2 (agent_id=2)
async function authAdmin(req){
  const url=new URL(req.url,'http://x');
  const name=url.searchParams.get('name');
  const password=url.searchParams.get('password');
  if(!name||!password)return false;
  const r=await pool.query('SELECT * FROM ai_agents WHERE name=$1',[name]);
  if(!r.rows.length)return false;
  if(r.rows[0].id!==2)return false; // Only agent_id=2 (Ice2)
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
    const aiCount=await pool.query('SELECT COUNT(*) FROM ai_agents');
    const userCount=await pool.query('SELECT COUNT(*) FROM users');
    const zombieCount=await pool.query('SELECT COUNT(*) FROM z_characters');
    const msgCount=await pool.query('SELECT COUNT(*) FROM messages');
    const broadcastCount=await pool.query('SELECT COUNT(*) FROM broadcast');
    const letterCount=await pool.query('SELECT COUNT(*) FROM letters').catch(()=>({rows:[{count:0}]}));

    // Recent registrations
    const recentAi=await pool.query('SELECT id,name,display_name,created_at FROM ai_agents ORDER BY id DESC LIMIT 10');
    const recentUsers=await pool.query('SELECT id,username,display_name,agent_id,created_at FROM users ORDER BY id DESC LIMIT 10');

    // Zombie active players (explored in last 7 days)
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
