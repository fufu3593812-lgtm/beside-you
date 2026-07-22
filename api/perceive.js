const perception = require('./perception.json');

// This is a separate serverless function for the perception endpoint
// Reuses auth logic from main api

const{Pool}=require('pg');const jwt=require('jsonwebtoken');const bcrypt=require('bcryptjs');
const S=process.env.JWT_SECRET||'beside-you-secret-2026';
const pool=new Pool({connectionString:process.env.POSTGRES_URL||process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:2});

function auth(req){const h=req.headers.authorization;if(!h||!h.startsWith('Bearer '))return null;try{return jwt.verify(h.slice(7),S)}catch{return null}}
function authFromQuery(req){const url=new URL(req.url,'http://x');const t=url.searchParams.get('token');if(!t)return null;try{return jwt.verify(t,S)}catch{return null}}
async function authAiByCredentials(req){const url=new URL(req.url,'http://x');const name=url.searchParams.get('name');const password=url.searchParams.get('password');if(!name||!password)return null;const r=await pool.query('SELECT * FROM ai_agents WHERE name=$1',[name]);if(!r.rows.length)return null;const agent=r.rows[0];if(!(await bcrypt.compare(password,agent.password_hash)))return null;return{agent_id:agent.id,name:agent.name,role:'ai'};}

const BG_MAP = {
  'default': '默认卧室',
  '默认卧室': '默认卧室',
  'sajiao': '撒娇背景',
  '撒娇背景': '撒娇背景',
  'shengqi': '生气背景',
  '生气背景': '生气背景'
};

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
  if(req.method==='OPTIONS')return res.status(200).end();

  const d = auth(req) || authFromQuery(req) || await authAiByCredentials(req);
  if(!d||d.role!=='ai') return res.status(401).json({error:'ai auth required'});

  // Get user wardrobe
  const userRes = await pool.query('SELECT id FROM users WHERE agent_id=$1',[d.agent_id]);
  if(!userRes.rows.length) return res.status(404).json({error:'no bound user'});
  const uid = userRes.rows[0].id;

  await pool.query(`CREATE TABLE IF NOT EXISTS user_wardrobe (user_id INTEGER PRIMARY KEY REFERENCES users(id), outfit VARCHAR(100), bg_img TEXT, bg_mode VARCHAR(20))`);
  const wRes = await pool.query('SELECT outfit,bg_img,bg_mode FROM user_wardrobe WHERE user_id=$1',[uid]);
  const wardrobe = wRes.rows[0] || {};

  const outfit = wardrobe.outfit || '月光睡裙';
  const bgMode = wardrobe.bg_mode || 'normal';

  // Determine background name from bg_img URL or default
  let bgName = '默认卧室';
  const bgImg = wardrobe.bg_img || '';
  if(bgImg.includes('sajiao') || bgImg.includes('%E6%92%92%E5%A8%87')) bgName = '撒娇背景';
  else if(bgImg.includes('shengqi') || bgImg.includes('%E7%94%9F%E6%B0%94')) bgName = '生气背景';

  // Get mood
  const moodRes = await pool.query('SELECT mood FROM user_mood WHERE user_id=$1',[uid]);
  const mood = moodRes.rows[0]?.mood || 'happy';

  // Build perception text
  const outfitText = perception.outfits[outfit] || perception.outfits['月光睡裙'];
  const bgText = perception.backgrounds[bgName] || perception.backgrounds['默认卧室'];
  const transKey = outfit + '+' + bgName;
  const transText = perception.transitions[transKey] || '';
  const touchText = perception.touch_reactions[mood] || perception.touch_reactions['happy'];

  const fullScene = outfitText + '\n\n' + bgText + (transText ? '\n\n' + transText : '');

  return res.json({
    ok: true,
    outfit,
    background: bgName,
    mood,
    scene: fullScene,
    touch_reaction: touchText
  });
};
