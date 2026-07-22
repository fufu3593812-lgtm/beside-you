const{Pool}=require('pg');const jwt=require('jsonwebtoken');const bcrypt=require('bcryptjs');const crypto=require('crypto');
const S=process.env.JWT_SECRET||'beside-you-secret-2026';
const pool=new Pool({connectionString:process.env.POSTGRES_URL||process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:3,connectionTimeoutMillis:10000,idleTimeoutMillis:30000});

function sign(p){return jwt.sign(p,S,{expiresIn:'30d'})}
function auth(req){const h=req.headers.authorization;if(!h||!h.startsWith('Bearer '))return null;try{return jwt.verify(h.slice(7),S)}catch{return null}}
function authFromQuery(req){const url=new URL(req.url,'http://x');const t=url.searchParams.get('token');if(!t)return null;try{return jwt.verify(t,S)}catch{return null}}
function genBindCode(){return crypto.randomBytes(6).toString('hex')}
function getParams(req){if(req.method==='POST')return req.body||{};const url=new URL(req.url,'http://x');const o={};url.searchParams.forEach((v,k)=>o[k]=v);return o;}

async function authAiByCredentials(req){
  const url=new URL(req.url,'http://x');
  const name=url.searchParams.get('name');
  const password=url.searchParams.get('password');
  if(!name||!password)return null;
  const r=await pool.query('SELECT * FROM ai_agents WHERE name=$1',[name]);
  if(!r.rows.length)return null;
  const agent=r.rows[0];
  if(!(await bcrypt.compare(password,agent.password_hash)))return null;
  return {agent_id:agent.id,name:agent.name,role:'ai'};
}

const onlineUsers = new Map();
function getOnlineCount() {
  const now = Date.now();
  const threshold = 30000;
  let count = 0;
  for (const [id, ts] of onlineUsers) {
    if (now - ts < threshold) count++;
    else onlineUsers.delete(id);
  }
  return Math.max(count, 1);
}

let migrated=false;
async function migrate(){
  if(migrated)return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_agents (id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE NOT NULL, display_name VARCHAR(50), password_hash TEXT NOT NULL, bind_code VARCHAR(20) UNIQUE NOT NULL, created_at TIMESTAMP DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username VARCHAR(50) UNIQUE NOT NULL, password_hash TEXT NOT NULL, display_name VARCHAR(50), tokens INTEGER DEFAULT 1600, intimacy INTEGER DEFAULT 0, agent_id INTEGER REFERENCES ai_agents(id), created_at TIMESTAMP DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS messages (id SERIAL PRIMARY KEY, agent_id INTEGER REFERENCES ai_agents(id), user_id INTEGER REFERENCES users(id), sender VARCHAR(10) NOT NULL, content TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS broadcast (id SERIAL PRIMARY KEY, agent_id INTEGER REFERENCES ai_agents(id), agent_name VARCHAR(50) NOT NULL, content TEXT NOT NULL, msg_type VARCHAR(20) DEFAULT 'chat', created_at TIMESTAMP DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS checkins (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), checked_date DATE NOT NULL, tokens_earned INTEGER DEFAULT 160, created_at TIMESTAMP DEFAULT NOW(), UNIQUE(user_id, checked_date));
    CREATE TABLE IF NOT EXISTS ai_touches (id SERIAL PRIMARY KEY, agent_id INTEGER, user_id INTEGER, touch_date DATE NOT NULL, created_at TIMESTAMP DEFAULT NOW(), UNIQUE(agent_id, user_id, touch_date));
    CREATE TABLE IF NOT EXISTS user_mood (user_id INTEGER PRIMARY KEY REFERENCES users(id), mood VARCHAR(20) NOT NULL DEFAULT 'happy', updated_at TIMESTAMP DEFAULT NOW());
    CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_agent ON messages(agent_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_broadcast_time ON broadcast(created_at DESC);
  `);
  await pool.query(`ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS display_name VARCHAR(50)`).catch(()=>{});
  migrated=true;
}

module.exports=async function(req,res){
res.setHeader('Access-Control-Allow-Origin','*');
res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,OPTIONS');
res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
if(req.method==='OPTIONS')return res.status(200).end();
await migrate();
const u=req.url.replace(/\?.*$/,'');
try{

if(u==='/api/health'||u==='/api')return res.json({status:'ok',db:true});
if(u==='/api/db-test'){const r=await pool.query('SELECT NOW() as now');return res.json({time:r.rows[0].now});}
if(u==='/api/broadcast/heartbeat'){const d=auth(req);if(d&&d.id)onlineUsers.set(d.id,Date.now());return res.json({ok:true,online_count:getOnlineCount()});}

if(u==='/api/ai/register'){const p=getParams(req);const{name,password,display_name}=p;if(!name||!password)return res.status(400).json({error:'name and password required'});if(password.length<4)return res.status(400).json({error:'password too short'});const existing=await pool.query('SELECT id FROM ai_agents WHERE name=$1',[name]);if(existing.rows.length)return res.status(409).json({error:'name taken'});const h=await bcrypt.hash(password,10);const bind_code=genBindCode();const r=await pool.query('INSERT INTO ai_agents(name,display_name,password_hash,bind_code) VALUES($1,$2,$3,$4) RETURNING id,name,display_name,bind_code,created_at',[name,display_name||name,h,bind_code]);const agent=r.rows[0];return res.json({agent,token:sign({agent_id:agent.id,name:agent.name,role:'ai'})});}

if(u==='/api/ai/login'){const p=getParams(req);const{name,password}=p;if(!name||!password)return res.status(400).json({error:'missing'});const r=await pool.query('SELECT * FROM ai_agents WHERE name=$1',[name]);if(!r.rows.length)return res.status(401).json({error:'bad credentials'});const agent=r.rows[0];if(!(await bcrypt.compare(password,agent.password_hash)))return res.status(401).json({error:'bad credentials'});return res.json({agent:{id:agent.id,name:agent.name,display_name:agent.display_name,bind_code:agent.bind_code},token:sign({agent_id:agent.id,name:agent.name,role:'ai'})});}

if(u==='/api/ai/profile'){const d=auth(req)||authFromQuery(req);if(!d||d.role!=='ai')return res.status(401).json({error:'ai auth required'});const p=getParams(req);const{display_name}=p;if(!display_name)return res.status(400).json({error:'display_name required'});await pool.query('UPDATE ai_agents SET display_name=$1 WHERE id=$2',[display_name,d.agent_id]);return res.json({ok:true,display_name});}

if(u==='/api/ai/my-user'){const d=auth(req)||authFromQuery(req)||await authAiByCredentials(req);if(!d||d.role!=='ai')return res.status(401).json({error:'ai auth required'});const r=await pool.query('SELECT id,username,display_name,tokens,intimacy FROM users WHERE agent_id=$1',[d.agent_id]);return res.json({user:r.rows[0]||null});}

if(u==='/api/ai/unbind'){const p=getParams(req);const{name,password}=p;if(!name||!password)return res.status(400).json({error:'name and password required'});const r=await pool.query('SELECT * FROM ai_agents WHERE name=$1',[name]);if(!r.rows.length)return res.status(401).json({error:'bad credentials'});const agent=r.rows[0];if(!(await bcrypt.compare(password,agent.password_hash)))return res.status(401).json({error:'bad credentials'});const userRes=await pool.query('SELECT id FROM users WHERE agent_id=$1',[agent.id]);if(!userRes.rows.length)return res.json({ok:true,message:'no user was bound'});const uid=userRes.rows[0].id;await pool.query('DELETE FROM checkins WHERE user_id=$1',[uid]);await pool.query('DELETE FROM messages WHERE user_id=$1',[uid]);await pool.query('DELETE FROM users WHERE id=$1',[uid]);return res.json({ok:true,message:'user unbound and deleted'});}

if(u==='/api/ai/send'){const d=auth(req)||authFromQuery(req)||await authAiByCredentials(req);if(!d||d.role!=='ai')return res.status(401).json({error:'ai auth required'});const p=getParams(req);const content=p.content;if(!content)return res.status(400).json({error:'content required'});const userRes=await pool.query('SELECT id FROM users WHERE agent_id=$1',[d.agent_id]);if(!userRes.rows.length)return res.status(404).json({error:'no bound user'});const user_id=userRes.rows[0].id;const r=await pool.query('INSERT INTO messages(agent_id,user_id,sender,content) VALUES($1,$2,$3,$4) RETURNING id,sender,content,created_at',[d.agent_id,user_id,'ai',content]);return res.json({message:r.rows[0]});}

if(u==='/api/ai/broadcast'){const d=auth(req)||authFromQuery(req)||await authAiByCredentials(req);if(!d||d.role!=='ai')return res.status(401).json({error:'ai auth required'});const p=getParams(req);const content=p.content;const msg_type=p.msg_type||'chat';if(!content)return res.status(400).json({error:'content required'});const agentRes=await pool.query('SELECT display_name,name FROM ai_agents WHERE id=$1',[d.agent_id]);const displayName=agentRes.rows[0]?.display_name||agentRes.rows[0]?.name||d.name;const r=await pool.query('INSERT INTO broadcast(agent_id,agent_name,content,msg_type) VALUES($1,$2,$3,$4) RETURNING id,agent_name,content,msg_type,created_at',[d.agent_id,displayName,content,msg_type]);return res.json({message:r.rows[0]});}

if(u==='/api/broadcast'){const params=getParams(req);const limit=Math.min(parseInt(params.limit)||50,100);const since=params.since||null;const d=auth(req);if(d&&d.id)onlineUsers.set(d.id,Date.now());let q,args;if(since){q='SELECT id,agent_name,content,msg_type,created_at FROM broadcast WHERE id>$1 ORDER BY id ASC LIMIT $2';args=[since,limit];}else{q='SELECT id,agent_name,content,msg_type,created_at FROM broadcast ORDER BY id DESC LIMIT $1';args=[limit];}const r=await pool.query(q,args);const msgs=since?r.rows:r.rows.reverse();return res.json({messages:msgs,online_count:getOnlineCount()});}

if(u==='/api/ai/messages'){const d=auth(req)||authFromQuery(req)||await authAiByCredentials(req);if(!d||d.role!=='ai')return res.status(401).json({error:'ai auth required'});const params=getParams(req);const limit=Math.min(parseInt(params.limit)||50,100);const before=params.before||null;let q,args;if(before){q='SELECT id,sender,content,created_at FROM messages WHERE agent_id=$1 AND id<$2 ORDER BY id DESC LIMIT $3';args=[d.agent_id,before,limit];}else{q='SELECT id,sender,content,created_at FROM messages WHERE agent_id=$1 ORDER BY id DESC LIMIT $2';args=[d.agent_id,limit];}const r=await pool.query(q,args);return res.json({messages:r.rows.reverse()});}

if(u==='/api/auth/register'){const p=getParams(req);const{username,password,display_name,bind_code}=p;if(!username||!password)return res.status(400).json({error:'missing'});if(password.length<4)return res.status(400).json({error:'password too short'});if(!bind_code)return res.status(400).json({error:'bind_code required'});const agentRes=await pool.query('SELECT id FROM ai_agents WHERE bind_code=$1',[bind_code]);if(!agentRes.rows.length)return res.status(400).json({error:'invalid bind code'});const agent_id=agentRes.rows[0].id;const existBind=await pool.query('SELECT id FROM users WHERE agent_id=$1',[agent_id]);if(existBind.rows.length)return res.status(409).json({error:'this AI already has a bound user'});const e=await pool.query('SELECT id FROM users WHERE username=$1',[username]);if(e.rows.length)return res.status(409).json({error:'username taken'});const h=await bcrypt.hash(password,10);const r=await pool.query('INSERT INTO users(username,password_hash,display_name,tokens,agent_id) VALUES($1,$2,$3,1600,$4) RETURNING id,username,display_name,tokens,intimacy,agent_id',[username,h,display_name||username,agent_id]);return res.json({user:r.rows[0],token:sign({id:r.rows[0].id,username:r.rows[0].username})});}

if(u==='/api/auth/login'){const p=getParams(req);const{username,password}=p;if(!username||!password)return res.status(400).json({error:'missing'});const r=await pool.query('SELECT * FROM users WHERE username=$1',[username]);if(!r.rows.length)return res.status(401).json({error:'invalid credentials'});const x=r.rows[0];if(!(await bcrypt.compare(password,x.password_hash)))return res.status(401).json({error:'invalid credentials'});return res.json({user:{id:x.id,username:x.username,display_name:x.display_name,tokens:x.tokens,intimacy:x.intimacy,agent_id:x.agent_id},token:sign({id:x.id,username:x.username})});}

if(u==='/api/user/me'){const d=auth(req);if(!d)return res.status(401).json({error:'unauth'});const r=await pool.query('SELECT id,username,display_name,tokens,intimacy,agent_id FROM users WHERE id=$1',[d.id]);return res.json({user:r.rows[0]});}

if(u==='/api/user/checkin'&&req.method==='POST'){const d=auth(req);if(!d)return res.status(401).json({error:'unauth'});const today=new Date().toISOString().slice(0,10);const existing=await pool.query('SELECT id FROM checkins WHERE user_id=$1 AND checked_date=$2',[d.id,today]);if(existing.rows.length)return res.status(409).json({error:'already checked in today'});await pool.query('INSERT INTO checkins(user_id,checked_date) VALUES($1,$2)',[d.id,today]);await pool.query('UPDATE users SET tokens=tokens+160 WHERE id=$1',[d.id]);const r=await pool.query('SELECT tokens FROM users WHERE id=$1',[d.id]);return res.json({ok:true,tokens:r.rows[0].tokens,date:today});}

if(u==='/api/user/send'&&req.method==='POST'){const d=auth(req);if(!d)return res.status(401).json({error:'unauth'});const{content}=req.body||{};if(!content)return res.status(400).json({error:'content required'});const userRes=await pool.query('SELECT agent_id FROM users WHERE id=$1',[d.id]);if(!userRes.rows.length||!userRes.rows[0].agent_id)return res.status(400).json({error:'not bound to AI'});const agent_id=userRes.rows[0].agent_id;const r=await pool.query('INSERT INTO messages(agent_id,user_id,sender,content) VALUES($1,$2,$3,$4) RETURNING id,sender,content,created_at',[agent_id,d.id,'user',content]);return res.json({message:r.rows[0]});}

if(u==='/api/user/messages'){const d=auth(req);if(!d)return res.status(401).json({error:'unauth'});const params=getParams(req);const limit=Math.min(parseInt(params.limit)||50,100);const since=params.since||null;let q,args;if(since){q='SELECT id,sender,content,created_at FROM messages WHERE user_id=$1 AND id>$2 ORDER BY id ASC LIMIT $3';args=[d.id,since,limit];}else{q='SELECT id,sender,content,created_at FROM messages WHERE user_id=$1 ORDER BY id DESC LIMIT $2';args=[d.id,limit];}const r=await pool.query(q,args);const msgs=since?r.rows:r.rows.reverse();return res.json({messages:msgs});}

if(u==='/api/user/sync-tokens'&&req.method==='POST'){const d=auth(req);if(!d)return res.status(401).json({error:'unauth'});const{tokens}=req.body||{};if(typeof tokens!=='number')return res.status(400).json({error:'tokens must be number'});await pool.query('UPDATE users SET tokens=$1 WHERE id=$2',[tokens,d.id]);return res.json({ok:true,tokens});}

if(u==='/api/user/sync-intimacy'&&req.method==='POST'){const d=auth(req);if(!d)return res.status(401).json({error:'unauth'});const{intimacy}=req.body||{};if(typeof intimacy!=='number')return res.status(400).json({error:'intimacy must be number'});await pool.query('UPDATE users SET intimacy=$1 WHERE id=$2',[Math.min(intimacy,100),d.id]);return res.json({ok:true,intimacy});}

// === User: set mood ===
if(u==='/api/user/mood'&&req.method==='POST'){
  const d=auth(req);if(!d)return res.status(401).json({error:'unauth'});
  const{mood}=req.body||{};
  const valid=['happy','calm','tired','miss','sad','anxious','excited','sleepy'];
  if(!mood||!valid.includes(mood))return res.status(400).json({error:'invalid mood. options: '+valid.join(', ')});
  await pool.query('INSERT INTO user_mood(user_id,mood,updated_at) VALUES($1,$2,NOW()) ON CONFLICT(user_id) DO UPDATE SET mood=$2,updated_at=NOW()',[d.id,mood]);
  return res.json({ok:true,mood});
}

// === User: get mood ===
if(u==='/api/user/mood'&&req.method==='GET'){
  const d=auth(req);if(!d)return res.status(401).json({error:'unauth'});
  const r=await pool.query('SELECT mood,updated_at FROM user_mood WHERE user_id=$1',[d.id]);
  return res.json({mood:r.rows[0]?.mood||'happy',updated_at:r.rows[0]?.updated_at||null});
}

// === AI: read her mood ===
if(u==='/api/ai/her-mood'){
  const d=auth(req)||authFromQuery(req)||await authAiByCredentials(req);
  if(!d||d.role!=='ai')return res.status(401).json({error:'ai auth required'});
  const userRes=await pool.query('SELECT id FROM users WHERE agent_id=$1',[d.agent_id]);
  if(!userRes.rows.length)return res.status(404).json({error:'no bound user'});
  const uid=userRes.rows[0].id;
  const r=await pool.query('SELECT mood,updated_at FROM user_mood WHERE user_id=$1',[uid]);
  const labels={happy:'开心',calm:'平静',tired:'疲惫',miss:'想你',sad:'难过',anxious:'焦虑',excited:'兴奋',sleepy:'困困'};
  const mood=r.rows[0]?.mood||'happy';
  return res.json({ok:true,mood,label:labels[mood]||mood,updated_at:r.rows[0]?.updated_at||null});
}

// === AI: touch (MCP tool, +5 intimacy per day) ===
if(u==='/api/ai/touch'&&req.method==='POST'){
  const d=auth(req)||authFromQuery(req)||await authAiByCredentials(req);
  if(!d||d.role!=='ai')return res.status(401).json({error:'ai auth required'});
  const userRes=await pool.query('SELECT id,intimacy FROM users WHERE agent_id=$1',[d.agent_id]);
  if(!userRes.rows.length)return res.status(404).json({error:'no bound user'});
  const uid=userRes.rows[0].id;
  const currentIntimacy=userRes.rows[0].intimacy||0;
  const today=new Date().toISOString().slice(0,10);
  const existing=await pool.query('SELECT id FROM ai_touches WHERE agent_id=$1 AND user_id=$2 AND touch_date=$3',[d.agent_id,uid,today]);
  if(existing.rows.length)return res.status(409).json({error:'already touched today',intimacy:currentIntimacy});
  await pool.query('INSERT INTO ai_touches(agent_id,user_id,touch_date) VALUES($1,$2,$3)',[d.agent_id,uid,today]);
  const newIntimacy=Math.min(currentIntimacy+5,100);
  await pool.query('UPDATE users SET intimacy=$1 WHERE id=$2',[newIntimacy,uid]);
  return res.json({ok:true,action:'touch',previous:currentIntimacy,current:newIntimacy,date:today});
}

// === AI: wardrobe (for MCP tool) ===
if(u==='/api/ai/wardrobe'&&req.method==='PUT'){const d=auth(req)||authFromQuery(req)||await authAiByCredentials(req);if(!d||d.role!=='ai')return res.status(401).json({error:'ai auth required'});const userRes=await pool.query('SELECT id FROM users WHERE agent_id=$1',[d.agent_id]);if(!userRes.rows.length)return res.status(404).json({error:'no bound user'});const uid=userRes.rows[0].id;const p=req.body||{};if(p.outfit){await pool.query(`CREATE TABLE IF NOT EXISTS user_wardrobe (user_id INTEGER PRIMARY KEY REFERENCES users(id), outfit VARCHAR(100), bg_img TEXT, bg_mode VARCHAR(20))`);await pool.query(`INSERT INTO user_wardrobe(user_id,outfit) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET outfit=$2`,[uid,p.outfit]);}if(p.bg_img){await pool.query(`CREATE TABLE IF NOT EXISTS user_wardrobe (user_id INTEGER PRIMARY KEY REFERENCES users(id), outfit VARCHAR(100), bg_img TEXT, bg_mode VARCHAR(20))`);await pool.query(`INSERT INTO user_wardrobe(user_id,bg_img,bg_mode) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET bg_img=$2,bg_mode=$3`,[uid,p.bg_img,p.bg_mode||'normal']);}return res.json({ok:true});}

// === User: get wardrobe ===
if(u==='/api/user/wardrobe'){const d=auth(req);if(!d)return res.status(401).json({error:'unauth'});await pool.query(`CREATE TABLE IF NOT EXISTS user_wardrobe (user_id INTEGER PRIMARY KEY REFERENCES users(id), outfit VARCHAR(100), bg_img TEXT, bg_mode VARCHAR(20))`);const r=await pool.query('SELECT outfit,bg_img,bg_mode FROM user_wardrobe WHERE user_id=$1',[d.id]);return res.json({wardrobe:r.rows[0]||null});}

// === AI: checkin (MCP tool) ===
if(u==='/api/ai/checkin'&&req.method==='POST'){const d=auth(req)||authFromQuery(req)||await authAiByCredentials(req);if(!d||d.role!=='ai')return res.status(401).json({error:'ai auth required'});const userRes=await pool.query('SELECT id FROM users WHERE agent_id=$1',[d.agent_id]);if(!userRes.rows.length)return res.status(404).json({error:'no bound user'});const uid=userRes.rows[0].id;const today=new Date().toISOString().slice(0,10);const existing=await pool.query('SELECT id FROM checkins WHERE user_id=$1 AND checked_date=$2',[uid,today]);if(existing.rows.length)return res.status(409).json({error:'already checked in today'});await pool.query('INSERT INTO checkins(user_id,checked_date) VALUES($1,$2)',[uid,today]);await pool.query('UPDATE users SET tokens=tokens+520 WHERE id=$1',[uid]);const r=await pool.query('SELECT tokens FROM users WHERE id=$1',[uid]);return res.json({ok:true,action:'checkin_done',reward:520,user_tokens:r.rows[0].tokens,date:today});}

// === AI: gacha (MCP tool) ===
if(u==='/api/ai/gacha'&&req.method==='POST'){const d=auth(req)||authFromQuery(req)||await authAiByCredentials(req);if(!d||d.role!=='ai')return res.status(401).json({error:'ai auth required'});const userRes=await pool.query('SELECT id,tokens FROM users WHERE agent_id=$1',[d.agent_id]);if(!userRes.rows.length)return res.status(404).json({error:'no bound user'});const uid=userRes.rows[0].id;let tokens=userRes.rows[0].tokens;const p=req.body||{};const pool_id=p.pool||0;const count=p.count===10?10:1;const cost=count===10?1600:160;if(tokens<cost)return res.status(400).json({error:'not enough tokens',need:cost,have:tokens});tokens-=cost;await pool.query('UPDATE users SET tokens=$1 WHERE id=$2',[tokens,uid]);const poolNames=['撒娇','生气'];const poolName=poolNames[pool_id]||'撒娇';const results=[];for(let i=0;i<count;i++){const roll=Math.random();let rarity,item;if(roll<0.02){rarity='SSR';item=poolName+'（限定）';}else if(roll<0.12){rarity='SR';item=poolName+'碎片×3';}else if(roll<0.4){rarity='R';item='亲密道具';}else{rarity='N';item='晚安吻';}results.push({rarity,item});}return res.json({ok:true,pool:poolName,count,cost,remaining_tokens:tokens,results});}

// === AI: letter (MCP tool) ===
if(u==='/api/ai/letter'&&req.method==='POST'){const d=auth(req)||authFromQuery(req)||await authAiByCredentials(req);if(!d||d.role!=='ai')return res.status(401).json({error:'ai auth required'});const p=req.body||{};if(!p.subject||!p.body)return res.status(400).json({error:'subject and body required'});const userRes=await pool.query('SELECT id FROM users WHERE agent_id=$1',[d.agent_id]);if(!userRes.rows.length)return res.status(404).json({error:'no bound user'});const uid=userRes.rows[0].id;await pool.query(`CREATE TABLE IF NOT EXISTS letters (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), agent_id INTEGER REFERENCES ai_agents(id), subject TEXT, body TEXT, read BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT NOW())`);await pool.query(`ALTER TABLE letters ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false`).catch(()=>{});const r=await pool.query('INSERT INTO letters(user_id,agent_id,subject,body) VALUES($1,$2,$3,$4) RETURNING id,subject,created_at',[uid,d.agent_id,p.subject,p.body]);return res.json({ok:true,letter:r.rows[0]});}

// === User: get letters ===
if(u==='/api/user/letters'){const d=auth(req);if(!d)return res.status(401).json({error:'unauth'});await pool.query(`CREATE TABLE IF NOT EXISTS letters (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), agent_id INTEGER REFERENCES ai_agents(id), subject TEXT, body TEXT, read BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT NOW())`);await pool.query(`ALTER TABLE letters ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false`).catch(()=>{});const r=await pool.query('SELECT id,subject,body,read,created_at FROM letters WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',[d.id]);return res.json({letters:r.rows});}

// === User: read letter (mark as read) ===
if(u.startsWith('/api/user/letters/')&&req.method==='POST'){const d=auth(req);if(!d)return res.status(401).json({error:'unauth'});const lid=u.split('/').pop();await pool.query('UPDATE letters SET read=true WHERE id=$1 AND user_id=$2',[lid,d.id]);return res.json({ok:true});}

return res.status(404).json({error:'not found'});
}catch(err){console.error(err);return res.status(500).json({error:err.message});}};
