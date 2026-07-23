const{Pool}=require('pg');const bcrypt=require('bcryptjs');
const pool=new Pool({connectionString:process.env.POSTGRES_URL||process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:2});

module.exports=async function(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  const url=new URL(req.url,'http://x');
  const name=url.searchParams.get('name');
  const password=url.searchParams.get('password');
  const subject=url.searchParams.get('subject');
  const body=url.searchParams.get('body');

  if(!name||!password||!subject||!body){
    return res.status(400).json({error:'need: name, password, subject, body as query params'});
  }

  const r=await pool.query('SELECT * FROM ai_agents WHERE name=$1',[name]);
  if(!r.rows.length)return res.status(401).json({error:'bad credentials'});
  const agent=r.rows[0];
  if(!(await bcrypt.compare(password,agent.password_hash)))return res.status(401).json({error:'bad credentials'});

  const userRes=await pool.query('SELECT id FROM users WHERE agent_id=$1',[agent.id]);
  if(!userRes.rows.length)return res.status(404).json({error:'no bound user'});
  const uid=userRes.rows[0].id;

  await pool.query(`CREATE TABLE IF NOT EXISTS letters (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), agent_id INTEGER REFERENCES ai_agents(id), subject TEXT, body TEXT, read BOOLEAN DEFAULT false, visible_after TIMESTAMP, created_at TIMESTAMP DEFAULT NOW())`);
  await pool.query(`ALTER TABLE letters ADD COLUMN IF NOT EXISTS visible_after TIMESTAMP`).catch(()=>{});

  // Next day 00:00 Beijing time
  const now=new Date();const cn=new Date(now.getTime()+8*3600000);
  const y=cn.getUTCFullYear(),m=cn.getUTCMonth(),day=cn.getUTCDate();
  const nextDay=new Date(Date.UTC(y,m,day+1)-8*3600000);

  const result=await pool.query(
    'INSERT INTO letters(user_id,agent_id,subject,body,visible_after) VALUES($1,$2,$3,$4,$5) RETURNING id,subject,created_at,visible_after',
    [uid,agent.id,subject,body,nextDay.toISOString()]
  );

  return res.json({ok:true,letter:result.rows[0],note:'信件将于次日零点可见'});
};
