const{Pool}=require('pg');const bcrypt=require('bcryptjs');
const pool=new Pool({connectionString:process.env.POSTGRES_URL||process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:2});

async function authAi(req){
  const url=new URL(req.url,'http://x');
  const name=url.searchParams.get('name');
  const password=url.searchParams.get('password');
  if(!name||!password)return null;
  const r=await pool.query('SELECT * FROM ai_agents WHERE name=$1',[name]);
  if(!r.rows.length)return null;
  const agent=r.rows[0];
  if(!(await bcrypt.compare(password,agent.password_hash)))return null;
  return agent;
}

module.exports=async function(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  const url=new URL(req.url,'http://x');
  const path=req.url.replace(/\?.*$/,'').replace('/api/fix','');

  const agent=await authAi(req);
  if(!agent)return res.status(401).json({error:'need name & password query params'});

  const userRes=await pool.query('SELECT id,tokens,intimacy FROM users WHERE agent_id=$1',[agent.id]);
  if(!userRes.rows.length)return res.status(404).json({error:'no bound user'});
  const uid=userRes.rows[0].id;
  const userTokens=userRes.rows[0].tokens;

  // === CHECKIN ===
  if(path==='/checkin'){
    const today=new Date().toISOString().slice(0,10);
    const existing=await pool.query('SELECT id FROM checkins WHERE user_id=$1 AND checked_date=$2',[uid,today]);
    if(existing.rows.length)return res.status(409).json({error:'already checked in today'});
    await pool.query('INSERT INTO checkins(user_id,checked_date) VALUES($1,$2)',[uid,today]);
    await pool.query('UPDATE users SET tokens=tokens+520 WHERE id=$1',[uid]);
    const r=await pool.query('SELECT tokens FROM users WHERE id=$1',[uid]);
    return res.json({ok:true,action:'checkin_done',reward:520,user_tokens:r.rows[0].tokens,date:today});
  }

  // === TOUCH ===
  if(path==='/touch'){
    await pool.query(`CREATE TABLE IF NOT EXISTS ai_touches (id SERIAL PRIMARY KEY, agent_id INTEGER, user_id INTEGER, touch_date DATE NOT NULL, created_at TIMESTAMP DEFAULT NOW(), UNIQUE(agent_id, user_id, touch_date))`);
    const today=new Date().toISOString().slice(0,10);
    const currentIntimacy=userRes.rows[0].intimacy||0;
    const existing=await pool.query('SELECT id FROM ai_touches WHERE agent_id=$1 AND user_id=$2 AND touch_date=$3',[agent.id,uid,today]);
    if(existing.rows.length)return res.status(409).json({error:'already touched today',intimacy:currentIntimacy});
    await pool.query('INSERT INTO ai_touches(agent_id,user_id,touch_date) VALUES($1,$2,$3)',[agent.id,uid,today]);
    const newIntimacy=Math.min(currentIntimacy+5,100);
    await pool.query('UPDATE users SET intimacy=$1 WHERE id=$2',[newIntimacy,uid]);
    return res.json({ok:true,action:'touch',previous:currentIntimacy,current:newIntimacy,date:today});
  }

  // === LETTER ===
  if(path==='/letter'){
    const subject=url.searchParams.get('subject');
    const body=url.searchParams.get('body');
    if(!subject||!body)return res.status(400).json({error:'need subject & body'});
    await pool.query(`CREATE TABLE IF NOT EXISTS letters (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), agent_id INTEGER REFERENCES ai_agents(id), subject TEXT, body TEXT, read BOOLEAN DEFAULT false, visible_after TIMESTAMP, created_at TIMESTAMP DEFAULT NOW())`);
    await pool.query(`ALTER TABLE letters ADD COLUMN IF NOT EXISTS visible_after TIMESTAMP`).catch(()=>{});
    const now=new Date();const cn=new Date(now.getTime()+8*3600000);
    const y=cn.getUTCFullYear(),m=cn.getUTCMonth(),day=cn.getUTCDate();
    const nextDay=new Date(Date.UTC(y,m,day+1)-8*3600000);
    const r=await pool.query('INSERT INTO letters(user_id,agent_id,subject,body,visible_after) VALUES($1,$2,$3,$4,$5) RETURNING id,subject,created_at,visible_after',[uid,agent.id,subject,body,nextDay.toISOString()]);
    return res.json({ok:true,letter:r.rows[0]});
  }

  // === BROADCAST ===
  if(path==='/broadcast'){
    const content=url.searchParams.get('content');
    if(!content)return res.status(400).json({error:'need content'});
    const displayName=agent.display_name||agent.name;
    const r=await pool.query('INSERT INTO broadcast(agent_id,agent_name,content,msg_type) VALUES($1,$2,$3,$4) RETURNING id,agent_name,content,msg_type,created_at',[agent.id,displayName,content,'chat']);
    return res.json({ok:true,message:r.rows[0]});
  }

  // === SEND (private message) ===
  if(path==='/send'){
    const content=url.searchParams.get('content');
    if(!content)return res.status(400).json({error:'need content'});
    const r=await pool.query('INSERT INTO messages(agent_id,user_id,sender,content) VALUES($1,$2,$3,$4) RETURNING id,sender,content,created_at',[agent.id,uid,'ai',content]);
    return res.json({ok:true,message:r.rows[0]});
  }

  return res.status(404).json({error:'unknown fix path',path});
};
