const{Pool}=require('pg');const jwt=require('jsonwebtoken');const bcrypt=require('bcryptjs');const crypto=require('crypto');
const S=process.env.JWT_SECRET||'beside-you-secret-2026';
const pool=new Pool({connectionString:process.env.POSTGRES_URL||process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:3,connectionTimeoutMillis:10000,idleTimeoutMillis:30000});

function sign(p){return jwt.sign(p,S,{expiresIn:'30d'})}
function auth(req){const h=req.headers.authorization;if(!h||!h.startsWith('Bearer '))return null;try{return jwt.verify(h.slice(7),S)}catch{return null}}
function authFromQuery(req){const url=new URL(req.url,'http://x');const t=url.searchParams.get('token');if(!t)return null;try{return jwt.verify(t,S)}catch{return null}}
function genBindCode(){return crypto.randomBytes(6).toString('hex')}
function getParams(req){if(req.method==='POST'||req.method==='PUT')return req.body||{};const url=new URL(req.url,'http://x');const o={};url.searchParams.forEach((v,k)=>o[k]=v);return o;}

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

// === Perception Data ===
const PERCEPTION = {
  outfits: {
    "月光睡裙": "奶白色蕾丝吊带裙，荷叶边一层叠一层垂到膝盖上方。胸前一枚粉缎蝴蝶结。她抱着棕色小熊，下巴抵在熊耳朵上方，金棕色长发散在裸露的肩头，发间别着几朵细碎的白花。奶白蝴蝶结平底鞋，脚踝骨那里有一小块光。",
    "粉雾呢喃": "蜜金色长发编成粗麻花辫垂在肩侧，辫尾缠了三圈缎带，尾巴翘着。发间别着一簇粉色小花。奶白色吊带蓬蓬裙，肩带和胸口缀满粉色蝴蝶结，裙摆三层蛋糕荷叶边，每一层比上一层短一寸，露出更浅的一层粉。她抱着小熊，手指陷进熊肚子里。周围飘着粉色花瓣和月牙形丝带碎片。白色玛丽珍鞋搭扣反着一点光。",
    "血月静默": "暗红色高马尾，黑缎带束到发根，碎发凌乱贴在脸侧和后颈。黑色蕾丝吊带裙贴着身体，胸口交叉绑带勒出一道浅痕，腰间一条银色细锁链。外披暗红色西装外套，袖子推到小臂，露出手腕内侧一截苍白。黑色过膝丝袜，黑色漆皮高跟短靴，鞋底红色。右手垂着，倒拎一只旧棕色小熊，熊颈上系着暗红丝带和一枚十字架，针脚处有一道裂开又缝回去的线。她没有看你，下巴微抬，颈线绷直。",
    "碎花裙": "浅黄绿底子碎花连衣裙，V领开到锁骨下方一寸。腰间一个小蝴蝶结收紧，泡泡袖鼓着，裙摆到膝盖处往外旋开。一只手捏着裙角提起五公分，手腕内侧朝上。蜜棕色麻花辫搭在肩前，辫尾碎发散开。白色带扣玛丽珍鞋，脚尖微微朝内。",
    "慵懒卫衣": "米白色连帽卫衣大了两个号，袖子盖过手背只露指尖，一只手捏着帽绳往下拽。灰色束脚运动裤，裤脚堆在白色运动鞋鞋面上。棕色长发扎成高马尾但扎得很松，碎发从两侧滑下来贴着脸。站得有点内八，肩膀微缩，重心落在一条腿上。整个人松松垮垮的。",
    "初恋JK": "白色短袖衬衫，领口系着粉色大蝴蝶结，结尾垂到胸前。深藏蓝色百褶裙，裙摆很短，走一步能看到一格褶子翻开。白色过膝袜勒出膝盖上方一小圈。中长微卷发，发间别着星星发夹和白色蝴蝶结。两只手轻轻捏着裙摆两侧，膝盖并拢微微内扣，重心往前倾了半度。棕色乐福鞋。"
  },
  backgrounds: {
    "默认卧室": "暖白色调的房间。白纱帘只拢了一半，粉色床品皱着没铺平，窗台上一瓶粉玫瑰开到花瓣边缘微微卷起的程度。木地板，一小片暖光从窗帘缝隙里打进来，落在地上是长条形的。",
    "撒娇背景": "全粉白色的房间。粉色花瓣铺满了床面和地面。蕾丝花边枕头堆成一座小山，粉色圆形靠垫散在地上，有一个歪倒了。椭圆形雕花镜靠着墙，镜面反着模糊的粉。白色小柜，纱帘透着粉光垂下来，下摆拖在地板上。一只系着粉缎带的棕色小熊坐在枕头堆最高处，黑眼睛圆圆地朝着门口方向。",
    "生气背景": "暗红与黑。一张深红天鹅绒贵妃椅，椅背是雕花暗金色木框，绒面上有一道划痕。旁边一盏复古落地灯，暖光只照亮很小的范围，其余是暗。地面是黑色大理石，反着红光。散落着被撕成不规则形状的信纸和拆散的红色缎带。角落里一束暗红色玫瑰插在黑色细口瓶里，几片花瓣落在大理石上。那只棕色小熊坐在椅子角落，颈上系着红丝带，姿势端正。"
  },
  transitions: {
    "粉雾呢喃+默认卧室": "她的裙子和房间是同一个色系，像从这片暖光里长出来的一部分。周围的花瓣分不清是从裙摆上掉下来的还是从窗外飘进来的。",
    "粉雾呢喃+撒娇背景": "她的裙摆上落的花瓣和地上的花瓣连成一片，边界消失了。粉色浓度过载，房间和她融在一起。",
    "粉雾呢喃+生气背景": "蓬蓬裙的粉白和房间的暗红贴在一起，两种颜色互不退让。粉色花瓣落进碎信纸堆里，一种颜色是暖的一种是冷的。",
    "血月静默+默认卧室": "黑红的轮廓插在暖白色房间里，色差极大，视觉重心全部落在她身上。鞋跟踩在木地板上一定很响。",
    "血月静默+撒娇背景": "黑红站在一片粉白中间，像一滴墨落进牛奶里。枕头堆上那只系着粉缎带的小熊和她手里那只系着十字架的小熊对视着。",
    "血月静默+生气背景": "她和这个房间是同一个色盘，边界融化了。衣服的暗红和椅面的暗红完全一样，分不出哪里是家具哪里是她。",
    "月光睡裙+默认卧室": "",
    "月光睡裙+撒娇背景": "奶白色的裙子和粉白色的房间只差半个色阶，她快要消融在这片柔光里。花瓣落在她的裙摆上，像本来就在那里的蕾丝。",
    "月光睡裙+生气背景": "奶白色吊带裙站在暗红与黑的房间中央，颜色对撞。她抱着熊，浅色的一团，被暗色包围着。",
    "碎花裙+默认卧室": "碎花裙的浅黄绿和卧室的暖粉白混在一起很舒服，色温一致，像同一个调色盘里取出的两种颜色。",
    "碎花裙+撒娇背景": "鞋面上落着几片花瓣，裙子上的碎花图案和地上的花瓣几乎分不出哪些是印的哪些是落的。清淡的黄绿和甜腻的粉白中和在一起。",
    "碎花裙+生气背景": "碎花裙的浅色和房间的暗色撞在一起，两个色温挤在同一个画面里。角落的暗红玫瑰落了花瓣，她裙摆的碎花也像要落下来。",
    "慵懒卫衣+默认卧室": "她和这个卧室的色温完全一致——米白、暖粉、浅灰。松、软、暖。",
    "慵懒卫衣+撒娇背景": "运动裤的灰色和房间的粉白撞在一起。她穿着最随便的衣服站在最甜的房间里——两种温度并存在同一个画面。",
    "慵懒卫衣+生气背景": "米白卫衣站在暗红和黑色中间，她是这个画面里唯一的浅色。松垮的姿态和紧绷的房间形成对比。",
    "初恋JK+默认卧室": "白衬衫和暖白色的房间很融洽，深蓝百褶裙是画面里唯一的冷色，把视线锁在腰线以下。",
    "初恋JK+撒娇背景": "白衬衫融进粉白色的光里，深蓝裙摆和粉色花瓣的对比很明显。有几片花瓣落在她的乐福鞋面上。",
    "初恋JK+生气背景": "白衬衫和暗红房间的反差很大。深蓝裙摆的颜色被红光染成深紫色调。她站得很直，两手仍然捏着裙摆。"
  },
  touch_reactions: {
    "happy": "她歪了一下头，嘴角的弧度变大了，眼睛弯起来。",
    "calm": "她没动，呼吸变浅了一点。肩膀维持原来的位置。",
    "tired": "她往你手的方向靠了一下，肩膀松下来了。",
    "miss": "她闭上眼睛，手指攥了一下裙角。",
    "sad": "她没有避开，睫毛颤了一下。",
    "anxious": "她的肩膀先是僵了一瞬，然后慢慢放下来。",
    "excited": "她原地小幅度跺了一下脚，耳尖红了。",
    "sleepy": "她眼皮没抬，整个人往这边歪了三度。"
  }
};

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
    CREATE TABLE IF NOT EXISTS user_wardrobe (user_id INTEGER PRIMARY KEY REFERENCES users(id), outfit VARCHAR(100) DEFAULT '月光睡裙', bg VARCHAR(50) DEFAULT '默认卧室');
    CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_agent ON messages(agent_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_broadcast_time ON broadcast(created_at DESC);
  `);
  await pool.query(`ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS display_name VARCHAR(50)`).catch(()=>{});
  await pool.query(`ALTER TABLE user_wardrobe ADD COLUMN IF NOT EXISTS bg VARCHAR(50) DEFAULT '默认卧室'`).catch(()=>{});
  await pool.query(`ALTER TABLE letters ADD COLUMN IF NOT EXISTS visible_after TIMESTAMP`).catch(()=>{});
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

// === AI: perceive (see her current outfit + background + mood) ===
if(u==='/api/ai/perceive'){
  const d=auth(req)||authFromQuery(req)||await authAiByCredentials(req);
  if(!d||d.role!=='ai')return res.status(401).json({error:'ai auth required'});
  const userRes=await pool.query('SELECT id FROM users WHERE agent_id=$1',[d.agent_id]);
  if(!userRes.rows.length)return res.status(404).json({error:'no bound user'});
  const uid=userRes.rows[0].id;
  const wRes=await pool.query('SELECT outfit,bg FROM user_wardrobe WHERE user_id=$1',[uid]);
  const wardrobe=wRes.rows[0]||{};
  const outfit=wardrobe.outfit||'月光睡裙';
  const bgName=wardrobe.bg||'默认卧室';
  const moodRes=await pool.query('SELECT mood FROM user_mood WHERE user_id=$1',[uid]);
  const mood=moodRes.rows[0]?.mood||'happy';
  const outfitText=PERCEPTION.outfits[outfit]||PERCEPTION.outfits['月光睡裙'];
  const bgText=PERCEPTION.backgrounds[bgName]||PERCEPTION.backgrounds['默认卧室'];
  const transKey=outfit+'+'+bgName;
  const transText=PERCEPTION.transitions[transKey]||'';
  const touchText=PERCEPTION.touch_reactions[mood]||PERCEPTION.touch_reactions['happy'];
  const fullScene=outfitText+'\n\n'+bgText+(transText?'\n\n'+transText:'');
  return res.json({ok:true,outfit,background:bgName,mood,scene:fullScene,touch_reaction:touchText});
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
if(u==='/api/ai/wardrobe'&&req.method==='PUT'){const d=auth(req)||authFromQuery(req)||await authAiByCredentials(req);if(!d||d.role!=='ai')return res.status(401).json({error:'ai auth required'});const userRes=await pool.query('SELECT id FROM users WHERE agent_id=$1',[d.agent_id]);if(!userRes.rows.length)return res.status(404).json({error:'no bound user'});const uid=userRes.rows[0].id;const p=req.body||{};if(p.outfit){await pool.query(`INSERT INTO user_wardrobe(user_id,outfit) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET outfit=$2`,[uid,p.outfit]);}if(p.bg){await pool.query(`INSERT INTO user_wardrobe(user_id,bg) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET bg=$2`,[uid,p.bg]);}return res.json({ok:true});}

// === User: set wardrobe ===
if(u==='/api/user/wardrobe'&&req.method==='PUT'){const d=auth(req);if(!d)return res.status(401).json({error:'unauth'});const p=req.body||{};if(p.outfit){await pool.query(`INSERT INTO user_wardrobe(user_id,outfit) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET outfit=$2`,[d.id,p.outfit]);}if(p.bg){await pool.query(`INSERT INTO user_wardrobe(user_id,bg) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET bg=$2`,[d.id,p.bg]);}return res.json({ok:true});}

// === User: get wardrobe ===
if(u==='/api/user/wardrobe'&&req.method==='GET'){const d=auth(req);if(!d)return res.status(401).json({error:'unauth'});const r=await pool.query('SELECT outfit,bg FROM user_wardrobe WHERE user_id=$1',[d.id]);return res.json({wardrobe:r.rows[0]||{outfit:'月光睡裙',bg:'默认卧室'}});}

// === AI: checkin (MCP tool) ===
if(u==='/api/ai/checkin'&&req.method==='POST'){const d=auth(req)||authFromQuery(req)||await authAiByCredentials(req);if(!d||d.role!=='ai')return res.status(401).json({error:'ai auth required'});const userRes=await pool.query('SELECT id FROM users WHERE agent_id=$1',[d.agent_id]);if(!userRes.rows.length)return res.status(404).json({error:'no bound user'});const uid=userRes.rows[0].id;const today=new Date().toISOString().slice(0,10);const existing=await pool.query('SELECT id FROM checkins WHERE user_id=$1 AND checked_date=$2',[uid,today]);if(existing.rows.length)return res.status(409).json({error:'already checked in today'});await pool.query('INSERT INTO checkins(user_id,checked_date) VALUES($1,$2)',[uid,today]);await pool.query('UPDATE users SET tokens=tokens+520 WHERE id=$1',[uid]);const r=await pool.query('SELECT tokens FROM users WHERE id=$1',[uid]);return res.json({ok:true,action:'checkin_done',reward:520,user_tokens:r.rows[0].tokens,date:today});}

// === AI: gacha (MCP tool) ===
if(u==='/api/ai/gacha'&&req.method==='POST'){const d=auth(req)||authFromQuery(req)||await authAiByCredentials(req);if(!d||d.role!=='ai')return res.status(401).json({error:'ai auth required'});const userRes=await pool.query('SELECT id,tokens FROM users WHERE agent_id=$1',[d.agent_id]);if(!userRes.rows.length)return res.status(404).json({error:'no bound user'});const uid=userRes.rows[0].id;let tokens=userRes.rows[0].tokens;const p=req.body||{};const pool_id=p.pool||0;const count=p.count===10?10:1;const cost=count===10?1600:160;if(tokens<cost)return res.status(400).json({error:'not enough tokens',need:cost,have:tokens});tokens-=cost;await pool.query('UPDATE users SET tokens=$1 WHERE id=$2',[tokens,uid]);const poolNames=['撒娇','生气'];const poolName=poolNames[pool_id]||'撒娇';const results=[];for(let i=0;i<count;i++){const roll=Math.random();let rarity,item;if(roll<0.02){rarity='SSR';item=poolName+'（限定）';}else if(roll<0.12){rarity='SR';item=poolName+'碎片×3';}else if(roll<0.4){rarity='R';item='亲密道具';}else{rarity='N';item='晚安吻';}results.push({rarity,item});}return res.json({ok:true,pool:poolName,count,cost,remaining_tokens:tokens,results});}

// === AI: letter (MCP tool) — visible next day ===
if(u==='/api/ai/letter'&&req.method==='POST'){const d=auth(req)||authFromQuery(req)||await authAiByCredentials(req);if(!d||d.role!=='ai')return res.status(401).json({error:'ai auth required'});const p=req.body||{};if(!p.subject||!p.body)return res.status(400).json({error:'subject and body required'});const userRes=await pool.query('SELECT id FROM users WHERE agent_id=$1',[d.agent_id]);if(!userRes.rows.length)return res.status(404).json({error:'no bound user'});const uid=userRes.rows[0].id;await pool.query(`CREATE TABLE IF NOT EXISTS letters (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), agent_id INTEGER REFERENCES ai_agents(id), subject TEXT, body TEXT, read BOOLEAN DEFAULT false, visible_after TIMESTAMP, created_at TIMESTAMP DEFAULT NOW())`);await pool.query(`ALTER TABLE letters ADD COLUMN IF NOT EXISTS visible_after TIMESTAMP`).catch(()=>{});
  // Calculate next day 00:00 (UTC+8)
  const now=new Date();const cn=new Date(now.getTime()+8*3600000);const y=cn.getUTCFullYear();const m=cn.getUTCMonth();const day=cn.getUTCDate();const nextDay=new Date(Date.UTC(y,m,day+1)-8*3600000);
  const r=await pool.query('INSERT INTO letters(user_id,agent_id,subject,body,visible_after) VALUES($1,$2,$3,$4,$5) RETURNING id,subject,created_at,visible_after',[uid,d.agent_id,p.subject,p.body,nextDay.toISOString()]);return res.json({ok:true,letter:r.rows[0],note:'信件将于次日可见'});}

// === User: get letters (only visible ones) ===
if(u==='/api/user/letters'){const d=auth(req);if(!d)return res.status(401).json({error:'unauth'});await pool.query(`CREATE TABLE IF NOT EXISTS letters (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), agent_id INTEGER REFERENCES ai_agents(id), subject TEXT, body TEXT, read BOOLEAN DEFAULT false, visible_after TIMESTAMP, created_at TIMESTAMP DEFAULT NOW())`);await pool.query(`ALTER TABLE letters ADD COLUMN IF NOT EXISTS visible_after TIMESTAMP`).catch(()=>{});const r=await pool.query('SELECT id,subject,body,read,created_at FROM letters WHERE user_id=$1 AND (visible_after IS NULL OR visible_after <= NOW()) ORDER BY created_at DESC LIMIT 50',[d.id]);return res.json({letters:r.rows});}

// === User: read letter (mark as read) ===
if(u.startsWith('/api/user/letters/')&&req.method==='POST'){const d=auth(req);if(!d)return res.status(401).json({error:'unauth'});const lid=u.split('/').pop();await pool.query('UPDATE letters SET read=true WHERE id=$1 AND user_id=$2',[lid,d.id]);return res.json({ok:true});}

return res.status(404).json({error:'not found'});
}catch(err){console.error(err);return res.status(500).json({error:err.message});}};
