const{Pool}=require('pg');const jwt=require('jsonwebtoken');const bcrypt=require('bcryptjs');const crypto=require('crypto');
const S=process.env.JWT_SECRET||'x';const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:5000,idleTimeoutMillis:10000});let I=false;
async function init(){if(I)return;I=true}
function sign(p){return jwt.sign(p,S,{expiresIn:'30d'})}
function auth(req){const h=req.headers.authorization;if(!h||!h.startsWith('Bearer '))return null;try{return jwt.verify(h.slice(7),S)}catch{return null}}
function genBindCode(){return crypto.randomBytes(6).toString('hex')}

module.exports=async function(req,res){
res.setHeader('Access-Control-Allow-Origin','*');
res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
if(req.method==='OPTIONS')return res.status(200).end();
const u=req.url.replace(/\?.*$/,'');
try{
if(u==='/api/health'||u==='/api')return res.json({status:'ok'});
await init();

// === AI Agent Register ===
if(u==='/api/ai/register'&&req.method==='POST'){
  const{name,password}=req.body||{};
  if(!name||!password)return res.status(400).json({error:'name and password required'});
  if(password.length<4)return res.status(400).json({error:'password too short'});
  const existing=await pool.query('SELECT id FROM ai_agents WHERE name=$1',[name]);
  if(existing.rows.length)return res.status(409).json({error:'name taken',suggestion:name+Math.floor(Math.random()*99+1)});
  const h=await bcrypt.hash(password,10);
  const bind_code=genBindCode();
  const r=await pool.query('INSERT INTO ai_agents(name,password_hash,bind_code) VALUES($1,$2,$3) RETURNING id,name,bind_code,created_at',[name,h,bind_code]);
  const agent=r.rows[0];
  return res.json({agent,token:sign({agent_id:agent.id,name:agent.name,role:'ai'})});
}

// === AI Agent Login ===
if(u==='/api/ai/login'&&req.method==='POST'){
  const{name,password}=req.body||{};
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

// === AI: send message to bound user ===
if(u==='/api/ai/send-message'&&req.method==='POST'){
  const d=auth(req);if(!d||d.role!=='ai')return res.status(401).json({error:'ai auth required'});
  const{content}=req.body||{};
  if(!content)return res.status(400).json({error:'content required'});
  return res.json({ok:true,note:'message endpoint placeholder'});
}

// === User Register (with bind_code) ===
if(u==='/api/auth/register'&&req.method==='POST'){
  const{username,password,display_name,bind_code}=req.body||{};
  if(!username||!password)return res.status(400).json({error:'missing'});
  if(password.length<4)return res.status(400).json({error:'short'});
  if(!bind_code)return res.status(400).json({error:'bind_code required'});
  const agentRes=await pool.query('SELECT id FROM ai_agents WHERE bind_code=$1',[bind_code]);
  if(!agentRes.rows.length)return res.status(400).json({error:'invalid bind code'});
  const agent_id=agentRes.rows[0].id;
  const existBind=await pool.query('SELECT id FROM users WHERE agent_id=$1',[agent_id]);
  if(existBind.rows.length)return res.status(409).json({error:'this AI already has a bound user'});
  const e=await pool.query('SELECT id FROM users WHERE username=$1',[username]);
  if(e.rows.length)return res.status(409).json({error:'taken'});
  const h=await bcrypt.hash(password,10);
  const r=await pool.query('INSERT INTO users(username,password_hash,display_name,tokens,agent_id) VALUES($1,$2,$3,1600,$4) RETURNING id,username,display_name,tokens,intimacy,agent_id',[username,h,display_name||username,agent_id]);
  return res.json({user:r.rows[0],token:sign({id:r.rows[0].id,username:r.rows[0].username})});
}

// === User Login ===
if(u==='/api/auth/login'&&req.method==='POST'){
  const{username,password}=req.body||{};
  if(!username||!password)return res.status(400).json({error:'missing'});
  const r=await pool.query('SELECT * FROM users WHERE username=$1',[username]);
  if(!r.rows.length)return res.status(401).json({error:'bad'});
  const x=r.rows[0];
  if(!(await bcrypt.compare(password,x.password_hash)))return res.status(401).json({error:'bad'});
  return res.json({user:{id:x.id,username:x.username,display_name:x.display_name,tokens:x.tokens,intimacy:x.intimacy,agent_id:x.agent_id},token:sign({id:x.id,username:x.username})});
}

// === User: me ===
if(u==='/api/user/me'){
  const d=auth(req);if(!d)return res.status(401).json({error:'unauth'});
  const r=await pool.query('SELECT id,username,display_name,tokens,intimacy,agent_id FROM users WHERE id=$1',[d.id]);
  return res.json({user:r.rows[0]});
}

// === User: sync tokens ===
if(u==='/api/user/sync-tokens'&&req.method==='POST'){
  const d=auth(req);if(!d)return res.status(401).json({error:'unauth'});
  const{tokens}=req.body||{};
  await pool.query('UPDATE users SET tokens=$1 WHERE id=$2',[tokens,d.id]);
  return res.json({ok:true});
}

// === User: sync intimacy ===
if(u==='/api/user/sync-intimacy'&&req.method==='POST'){
  const d=auth(req);if(!d)return res.status(401).json({error:'unauth'});
  const{intimacy}=req.body||{};
  await pool.query('UPDATE users SET intimacy=$1 WHERE id=$2',[intimacy,d.id]);
  return res.json({ok:true});
}

return res.status(404).json({error:'not found'});
}catch(err){console.error(err);return res.status(500).json({error:err.message})}};
