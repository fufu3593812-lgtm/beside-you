const{Pool}=require('pg');const jwt=require('jsonwebtoken');const bcrypt=require('bcryptjs');const crypto=require('crypto');
const S=process.env.JWT_SECRET||'beside-you-secret-2026';
const pool=new Pool({connectionString:process.env.POSTGRES_URL||process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:3,connectionTimeoutMillis:10000,idleTimeoutMillis:30000});

function sign(p){return jwt.sign(p,S,{expiresIn:'30d'})}
function auth(req){const h=req.headers.authorization;if(!h||!h.startsWith('Bearer '))return null;try{return jwt.verify(h.slice(7),S)}catch{return null}}
function genBindCode(){return crypto.randomBytes(6).toString('hex')}
function getParams(req){if(req.method==='POST')return req.body||{};const url=new URL(req.url,'http://x');const o={};url.searchParams.forEach((v,k)=>o[k]=v);return o;}

// Auto-migrate on first request
let migrated=false;
async function migrate(){
  if(migrated)return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_agents (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      bind_code VARCHAR(20) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name VARCHAR(50),
      tokens INTEGER DEFAULT 1600,
      intimacy INTEGER DEFAULT 0,
      agent_id INTEGER REFERENCES ai_agents(id),
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES ai_agents(id),
      user_id INTEGER REFERENCES users(id),
      sender VARCHAR(10) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS checkins (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      checked_date DATE NOT NULL,
      tokens_earned INTEGER DEFAULT 160,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, checked_date)
    );
    CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_agent ON messages(agent_id, created_at DESC);
  `);
  migrated=true;
}

module.exports=async function(req,res){
res.setHeader('Access-Control-Allow-Origin','*');
res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
if(req.method==='OPTIONS')return res.status(200).end();
await migrate();
const u=req.url.replace(/\?.*$/,'');
try{

if(u==='/api/health'||u==='/api')return res.json({status:'ok',db:true});

if(u==='/api/db-test'){
  const r=await pool.query('SELECT NOW() as now');
  return res.json({time:r.rows[0].now});
}

// === AI Agent Register ===
if(u==='/api/ai/register'){
  const p=getParams(req);
  const{name,password}=p;
  if(!name||!password)return res.status(400).json({error:'name and password required'});
  if(password.length<4)return res.status(400).json({error:'password too short'});
  const existing=await pool.query('SELECT id FROM ai_agents WHERE name=$1',[name]);
  if(existing.rows.length)return res.status(409).json({error:'name taken'});
  const h=await bcrypt.hash(password,10);
  const bind_code=genBindCode();
  const r=await pool.query('INSERT INTO ai_agents(name,password_hash,bind_code) VALUES($1,$2,$3) RETURNING id,name,bind_code,created_at',[name,h,bind_code]);
  const agent=r.rows[0];
  return res.json({agent,token:sign({agent_id:agent.id,name:agent.name,role:'ai'})});
}

// === AI Agent Login ===
if(u==='/api/ai/login'){
  const p=getParams(req);
  const{name,password}=p;
  if(!name||!password)return res.status(400).json({error:'missing'});
  const r=await pool.query('SELECT * FROM ai_agents WHERE name=$1',[name]);
  if(!r.rows.length)return res.status(401).json({error:'bad credentials'});
  const agent=r.rows[0];
  if(!(await bcrypt.compare(password,agent.password_hash)))return res.status(401).json({error:'bad credentials'});
  return res.json({agent:{id:agent.id,name:agent.name,bind_code:agent.bind_code},token:sign({agent_id:agent.id,name:agent.name,role:'ai'})});
}

// === AI: get my bound user ===
if(u==='/api/ai/my-user'){
  const d=auth(req);if(!d||d.role!=='ai')return res.status(401).json({error:'ai auth required'});
  const r=await pool.query('SELECT id,username,display_name,tokens,intimacy FROM users WHERE agent_id=$1',[d.agent_id]);
  return res.json({user:r.rows[0]||null});
}

// === AI: send message to user ===
if(u==='/api/ai/send'&&req.method==='POST'){
  const d=auth(req);if(!d||d.role!=='ai')return res.status(401).json({error:'ai auth required'});
  const{content}=req.body||{};
  if(!content)return res.status(400).json({error:'content required'});
  // Find bound user
  const userRes=await pool.query('SELECT id FROM users WHERE agent_id=$1',[d.agent_id]);
  if(!userRes.rows.length)return res.status(404).json({error:'no bound user'});
  const user_id=userRes.rows[0].id;
  const r=await pool.query('INSERT INTO messages(agent_id,user_id,sender,content) VALUES($1,$2,$3,$4) RETURNING id,sender,content,created_at',[d.agent_id,user_id,'ai',content]);
  return res.json({message:r.rows[0]});
}

// === AI: read messages from user ===
if(u==='/api/ai/messages'){
  const d=auth(req);if(!d||d.role!=='ai')return res.status(401).json({error:'ai auth required'});
  const params=getParams(req);
  const limit=Math.min(parseInt(params.limit)||50,100);
  const before=params.before||null;
  let q,args;
  if(before){
    q='SELECT id,sender,content,created_at FROM messages WHERE agent_id=$1 AND id<$2 ORDER BY id DESC LIMIT $3';
    args=[d.agent_id,before,limit];
  }else{
    q='SELECT id,sender,content,created_at FROM messages WHERE agent_id=$1 ORDER BY id DESC LIMIT $2';
    args=[d.agent_id,limit];
  }
  const r=await pool.query(q,args);
  return res.json({messages:r.rows.reverse()});
}

// === User Register (with bind_code) ===
if(u==='/api/auth/register'){
  const p=getParams(req);
  const{username,password,display_name,bind_code}=p;
  if(!username||!password)return res.status(400).json({error:'missing'});
  if(password.length<4)return res.status(400).json({error:'password too short'});
  if(!bind_code)return res.status(400).json({error:'bind_code required'});
  const agentRes=await pool.query('SELECT id FROM ai_agents WHERE bind_code=$1',[bind_code]);
  if(!agentRes.rows.length)return res.status(400).json({error:'invalid bind code'});
  const agent_id=agentRes.rows[0].id;
  const existBind=await pool.query('SELECT id FROM users WHERE agent_id=$1',[agent_id]);
  if(existBind.rows.length)return res.status(409).json({error:'this AI already has a bound user'});
  const e=await pool.query('SELECT id FROM users WHERE username=$1',[username]);
  if(e.rows.length)return res.status(409).json({error:'username taken'});
  const h=await bcrypt.hash(password,10);
  const r=await pool.query('INSERT INTO users(username,password_hash,display_name,tokens,agent_id) VALUES($1,$2,$3,1600,$4) RETURNING id,username,display_name,tokens,intimacy,agent_id',[username,h,display_name||username,agent_id]);
  return res.json({user:r.rows[0],token:sign({id:r.rows[0].id,username:r.rows[0].username})});
}

// === User Login ===
if(u==='/api/auth/login'){
  const p=getParams(req);
  const{username,password}=p;
  if(!username||!password)return res.status(400).json({error:'missing'});
  const r=await pool.query('SELECT * FROM users WHERE username=$1',[username]);
  if(!r.rows.length)return res.status(401).json({error:'invalid credentials'});
  const x=r.rows[0];
  if(!(await bcrypt.compare(password,x.password_hash)))return res.status(401).json({error:'invalid credentials'});
  return res.json({user:{id:x.id,username:x.username,display_name:x.display_name,tokens:x.tokens,intimacy:x.intimacy,agent_id:x.agent_id},token:sign({id:x.id,username:x.username})});
}

// === User: me ===
if(u==='/api/user/me'){
  const d=auth(req);if(!d)return res.status(401).json({error:'unauth'});
  const r=await pool.query('SELECT id,username,display_name,tokens,intimacy,agent_id FROM users WHERE id=$1',[d.id]);
  return res.json({user:r.rows[0]});
}

// === User: checkin ===
if(u==='/api/user/checkin'&&req.method==='POST'){
  const d=auth(req);if(!d)return res.status(401).json({error:'unauth'});
  const today=new Date().toISOString().slice(0,10);
  // Check if already checked in
  const existing=await pool.query('SELECT id FROM checkins WHERE user_id=$1 AND checked_date=$2',[d.id,today]);
  if(existing.rows.length)return res.status(409).json({error:'already checked in today'});
  // Insert checkin
  await pool.query('INSERT INTO checkins(user_id,checked_date) VALUES($1,$2)',[d.id,today]);
  // Add tokens
  await pool.query('UPDATE users SET tokens=tokens+160 WHERE id=$1',[d.id]);
  const r=await pool.query('SELECT tokens FROM users WHERE id=$1',[d.id]);
  return res.json({ok:true,tokens:r.rows[0].tokens,date:today});
}

// === User: send message ===
if(u==='/api/user/send'&&req.method==='POST'){
  const d=auth(req);if(!d)return res.status(401).json({error:'unauth'});
  const{content}=req.body||{};
  if(!content)return res.status(400).json({error:'content required'});
  const userRes=await pool.query('SELECT agent_id FROM users WHERE id=$1',[d.id]);
  if(!userRes.rows.length||!userRes.rows[0].agent_id)return res.status(400).json({error:'not bound to AI'});
  const agent_id=userRes.rows[0].agent_id;
  const r=await pool.query('INSERT INTO messages(agent_id,user_id,sender,content) VALUES($1,$2,$3,$4) RETURNING id,sender,content,created_at',[agent_id,d.id,'user',content]);
  return res.json({message:r.rows[0]});
}

// === User: get messages ===
if(u==='/api/user/messages'){
  const d=auth(req);if(!d)return res.status(401).json({error:'unauth'});
  const params=getParams(req);
  const limit=Math.min(parseInt(params.limit)||50,100);
  const since=params.since||null;
  let q,args;
  if(since){
    q='SELECT id,sender,content,created_at FROM messages WHERE user_id=$1 AND id>$2 ORDER BY id ASC LIMIT $3';
    args=[d.id,since,limit];
  }else{
    q='SELECT id,sender,content,created_at FROM messages WHERE user_id=$1 ORDER BY id DESC LIMIT $2';
    args=[d.id,limit];
  }
  const r=await pool.query(q,args);
  const msgs=since?r.rows:r.rows.reverse();
  return res.json({messages:msgs});
}

// === User: sync tokens ===
if(u==='/api/user/sync-tokens'&&req.method==='POST'){
  const d=auth(req);if(!d)return res.status(401).json({error:'unauth'});
  const{tokens}=req.body||{};
  if(typeof tokens!=='number')return res.status(400).json({error:'tokens must be number'});
  await pool.query('UPDATE users SET tokens=$1 WHERE id=$2',[tokens,d.id]);
  return res.json({ok:true,tokens});
}

// === User: sync intimacy ===
if(u==='/api/user/sync-intimacy'&&req.method==='POST'){
  const d=auth(req);if(!d)return res.status(401).json({error:'unauth'});
  const{intimacy}=req.body||{};
  if(typeof intimacy!=='number')return res.status(400).json({error:'intimacy must be number'});
  await pool.query('UPDATE users SET intimacy=$1 WHERE id=$2',[Math.min(intimacy,100),d.id]);
  return res.json({ok:true,intimacy});
}

return res.status(404).json({error:'not found'});
}catch(err){console.error(err);return res.status(500).json({error:err.message})}};