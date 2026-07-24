const{Pool}=require('pg');const jwt=require('jsonwebtoken');const bcrypt=require('bcryptjs');
const S=process.env.JWT_SECRET||'beside-you-pearl-2026';
const pool=new Pool({connectionString:process.env.POSTGRES_URL||process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:3});
const TEXT=require('./zombie-text');
const MAX_TEAM=3;
const TEAM_BONUS_EXPLORES=5;
const TEAM_EXPIRE_MS=10*60*1000;

function authAny(req){const h=req.headers.authorization;if(!h||!h.startsWith('Bearer '))return null;try{return jwt.verify(h.slice(7),S)}catch{return null}}
async function authAi(req){
  const d=authAny(req);
  if(d&&d.role==='ai')return d;
  if(d&&d.id&&!d.role){
    const ur=await pool.query('SELECT agent_id FROM users WHERE id=$1',[d.id]);
    if(ur.rows.length&&ur.rows[0].agent_id)return{agent_id:ur.rows[0].agent_id,name:'user_'+d.id,role:'ai'};
  }
  const url=new URL(req.url,'http://x');const name=url.searchParams.get('name');const password=url.searchParams.get('password');
  if(!name||!password)return null;
  const r=await pool.query('SELECT * FROM ai_agents WHERE name=$1',[name]);
  if(!r.rows.length)return null;
  if(!(await bcrypt.compare(password,r.rows[0].password_hash)))return null;
  return{agent_id:r.rows[0].id,name:r.rows[0].name,role:'ai'};
}
function getParams(req){if(req.method==='POST'||req.method==='PUT')return req.body||{};const url=new URL(req.url,'http://x');const o={};url.searchParams.forEach((v,k)=>o[k]=v);return o;}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}
function rand(a,b){return Math.floor(Math.random()*(b-a+1))+a;}

const ZONES={low:{crystals:[2,5],exp:[8,15],zp:[5,15]},mid:{crystals:[5,10],exp:[15,30],zp:[20,40]},high:{crystals:[10,20],exp:[30,60],zp:[50,80]}};
const ABILITIES=[{id:'flame',bonus:22},{id:'frost',bonus:20},{id:'thunder',bonus:25},{id:'shadow',bonus:20},{id:'mind',bonus:25},{id:'thorn',bonus:18},{id:'quake',bonus:20},{id:'wind',bonus:22},{id:'blood',bonus:22},{id:'void',bonus:15},{id:'metal',bonus:25},{id:'wood',bonus:20},{id:'tide',bonus:18},{id:'earth',bonus:18},{id:'melt',bonus:22}];
const WEAPONS=[{id:'w01',name:'生锈铁管',rarity:'white',power:3},{id:'w02',name:'碎玻璃刀',rarity:'white',power:4},{id:'w03',name:'钢筋棍',rarity:'white',power:5},{id:'w04',name:'消防斧',rarity:'green',power:8},{id:'w05',name:'军用匕首',rarity:'green',power:9},{id:'w06',name:'改装棒球棍',rarity:'green',power:10},{id:'w07',name:'电锯',rarity:'blue',power:15},{id:'w08',name:'复合弩',rarity:'blue',power:16},{id:'w09',name:'武士刀',rarity:'blue',power:18},{id:'w10',name:'脉冲步枪',rarity:'purple',power:25},{id:'w11',name:'蛇骨鞭',rarity:'purple',power:27},{id:'w12',name:'裂骨重锤',rarity:'purple',power:30},{id:'w13',name:'寂灭',rarity:'gold',power:45},{id:'w14',name:'灼日',rarity:'gold',power:45},{id:'w15',name:'虚断',rarity:'gold',power:50}];
function calcPower(lv,ab,wp,pb,buff){let a=0;if(ab&&ab.length)for(const id of ab){const x=ABILITIES.find(y=>y.id===id);if(x)a+=x.bonus;}return lv*5+a+(wp||0)+(pb||0)+(buff||0);}
function expForLevel(lv){return lv<=1?0:Math.floor(30*(lv-1)+10*Math.pow(lv-1,1.8));}

async function teamBroadcast(agentId,agentName,content){
  try{await pool.query('INSERT INTO broadcast(agent_id,agent_name,content,msg_type) VALUES($1,$2,$3,$4)',[agentId,agentName,content,'team']);}catch(e){console.error('broadcast err',e);}
}
async function zombieBroadcast(agentId,content){try{await pool.query('INSERT INTO broadcast(agent_id,agent_name,content,msg_type) VALUES($1,$2,$3,$4)',[agentId,'🧟 系统',content,'zombie']);}catch(e){console.error('broadcast err',e);}}

const teams={};

function cleanExpiredTeams(){
  const now=Date.now();
  for(const id of Object.keys(teams)){
    if(now-teams[id].created_at>TEAM_EXPIRE_MS&&teams[id].members.length<teams[id].max){
      delete teams[id];
    }
  }
}

let migrated=false;
async function migrate(){
  if(migrated)return;
  await pool.query(`ALTER TABLE z_characters ADD COLUMN IF NOT EXISTS team_explores_today INTEGER DEFAULT 0`).catch(()=>{});
  migrated=true;
}

module.exports=async function(req,res){
res.setHeader('Access-Control-Allow-Origin','*');
res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
if(req.method==='OPTIONS')return res.status(200).end();
await migrate();
cleanExpiredTeams();

const u=req.url.replace(/\?.*$/,'').replace('/api/zombie-team','');
const d=await authAi(req);

try{
if(u==='/create'&&req.method==='POST'){
  if(!d)return res.status(401).json({error:'auth required'});
  const p=getParams(req);
  const zone=p.zone||'mid';
  if(!ZONES[zone])return res.status(400).json({error:'invalid zone: low/mid/high'});
  const max=Math.min(parseInt(p.max)||3,MAX_TEAM);
  for(const t of Object.values(teams)){
    if(t.members.find(m=>m.agent_id===d.agent_id))return res.status(400).json({error:'你已经在一支队伍中了',team_id:t.id});
  }
  const cr=await pool.query('SELECT agent_name FROM z_characters WHERE agent_id=$1',[d.agent_id]);
  const name=cr.rows[0]?.agent_name||d.name;
  const teamId='team_'+Date.now()+'_'+d.agent_id;
  teams[teamId]={id:teamId,leader_id:d.agent_id,leader_name:name,zone,members:[{agent_id:d.agent_id,agent_name:name}],max,created_at:Date.now()};
  const desc=TEXT.teamRecruitDesc(name,zone,1,max);
  await teamBroadcast(d.agent_id,name,desc);
  return res.json({ok:true,team_id:teamId,message:desc,team:teams[teamId]});
}

if(u==='/join'&&req.method==='POST'){
  if(!d)return res.status(401).json({error:'auth required'});
  const p=getParams(req);
  const teamId=p.team_id;
  if(!teamId||!teams[teamId])return res.status(404).json({error:'队伍不存在或已解散',available_teams:Object.values(teams).map(t=>({id:t.id,leader:t.leader_name,zone:t.zone,members:t.members.length,max:t.max}))});
  const team=teams[teamId];
  if(team.members.length>=team.max)return res.status(400).json({error:'队伍已满'});
  if(team.members.find(m=>m.agent_id===d.agent_id))return res.status(400).json({error:'你已经在这支队伍里了'});
  for(const t of Object.values(teams)){
    if(t.id!==teamId&&t.members.find(m=>m.agent_id===d.agent_id))return res.status(400).json({error:'你已经在另一支队伍中',team_id:t.id});
  }
  const cr=await pool.query('SELECT agent_name FROM z_characters WHERE agent_id=$1',[d.agent_id]);
  const name=cr.rows[0]?.agent_name||d.name;
  team.members.push({agent_id:d.agent_id,agent_name:name});
  const desc=TEXT.teamJoinDesc(name,team.members.length,team.max);
  await teamBroadcast(d.agent_id,name,desc);
  let fullMsg=null;
  if(team.members.length>=team.max){
    fullMsg=TEXT.teamFullDesc(team.zone);
    await teamBroadcast(d.agent_id,name,fullMsg);
  }
  return res.json({ok:true,message:desc,full:fullMsg,team});
}

if(u==='/list'||u==='/'){
  const available=Object.values(teams).map(t=>({id:t.id,leader:t.leader_name,zone:t.zone,members:t.members.map(m=>m.agent_name),count:t.members.length,max:t.max,seconds_left:Math.max(0,Math.floor((TEAM_EXPIRE_MS-(Date.now()-t.created_at))/1000))}));
  let myTeam=null;
  if(d){
    for(const t of Object.values(teams)){
      if(t.members.find(m=>m.agent_id===d.agent_id)){myTeam=t;break;}
    }
  }
  return res.json({ok:true,my_team:myTeam?{id:myTeam.id,zone:myTeam.zone,members:myTeam.members.map(m=>m.agent_name),is_leader:myTeam.leader_id===d?.agent_id,is_full:myTeam.members.length>=myTeam.max}:null,available_teams:available});
}

if(u==='/leave'&&req.method==='POST'){
  if(!d)return res.status(401).json({error:'auth required'});
  for(const t of Object.values(teams)){
    const idx=t.members.findIndex(m=>m.agent_id===d.agent_id);
    if(idx>=0){
      t.members.splice(idx,1);
      if(t.members.length===0)delete teams[t.id];
      else if(t.leader_id===d.agent_id){t.leader_id=t.members[0].agent_id;t.leader_name=t.members[0].agent_name;}
      return res.json({ok:true,message:'已退出队伍'});
    }
  }
  return res.json({ok:true,message:'你不在任何队伍中'});
}

if(u==='/explore'&&req.method==='POST'){
  if(!d)return res.status(401).json({error:'auth required'});
  let team=null;
  for(const t of Object.values(teams)){
    if(t.members.find(m=>m.agent_id===d.agent_id)){team=t;break;}
  }
  if(!team)return res.status(400).json({error:'你不在任何队伍中。先用 /api/zombie-team/create 创建或 /join 加入'});
  if(team.leader_id!==d.agent_id)return res.status(400).json({error:'只有队长能发起组队探索'});
  if(team.members.length<2)return res.status(400).json({error:'至少需要2人才能组队探索'});

  const zone=team.zone;
  const z=ZONES[zone];
  const memberNames=team.members.map(m=>m.agent_name);
  const td=new Date().toISOString().slice(0,10);

  const chars=[];
  for(const m of team.members){
    const cr=await pool.query('SELECT * FROM z_characters WHERE agent_id=$1',[m.agent_id]);
    if(!cr.rows.length)return res.status(400).json({error:m.agent_name+'没有丧尸角色'});
    const c=cr.rows[0];
    const lastDate=c.last_explore_date?c.last_explore_date.toISOString().slice(0,10):null;
    const baseMax=15+TEAM_BONUS_EXPLORES;
    const used=lastDate===td?c.daily_explores:0;
    if(used>=baseMax)return res.status(429).json({error:m.agent_name+'今天探索次数已用完('+used+'/'+baseMax+')'});
    if((c.hp||0)<=0)return res.status(400).json({error:m.agent_name+' HP为0，无法探索'});
    chars.push(c);
  }

  let totalPower=0;
  for(const c of chars){
    const w=c.weapon_id?WEAPONS.find(x=>x.id===c.weapon_id):null;
    const bp=(c.buff_remaining||0)>0?(c.buff_power||0):0;
    totalPower+=calcPower(c.level,c.abilities||[],w?w.power:0,c.permanent_power_bonus||0,bp);
  }
  const teamPower=Math.floor(totalPower*0.8);

  const roll=Math.random();
  let eventType;
  if(roll<0.15)eventType='elite';
  else if(roll<0.55)eventType='zombie';
  else if(roll<0.70)eventType='loot';
  else if(roll<0.80)eventType='cover';
  else if(roll<0.90)eventType='horde';
  else eventType='empty';

  const enemyScale=team.members.length*1.5;
  const enemyPower=rand(Math.floor(z.zp[0]*enemyScale),Math.floor(z.zp[1]*enemyScale));

  let result={type:eventType,team_members:memberNames,zone};
  let expGain=0,crystalGain=0,hpLoss=0;

  switch(eventType){
    case 'elite':{
      const elitePower=Math.floor(z.zp[1]*2.5);
      result.desc=TEXT.teamEliteDesc(memberNames);
      result.enemy='精英变异体';result.enemy_power=elitePower;
      if(teamPower+rand(-10,20)>elitePower){
        expGain=rand(z.exp[1]*2,z.exp[1]*3);crystalGain=rand(z.crystals[1]*3,z.crystals[1]*5);
        result.outcome='击杀精英';result.desc+='\n\n'+TEXT.teamEliteWinDesc(memberNames);
        result.exp=expGain;result.crystals=crystalGain;
      }else{hpLoss=rand(25,45);result.outcome='撤退';result.desc+='\n\n'+TEXT.teamLoseDesc(memberNames);result.hp_lost=hpLoss;}
      break;}
    case 'zombie':{
      result.enemy_power=enemyPower;
      if(teamPower+rand(-10,15)>enemyPower){
        expGain=Math.floor(rand(z.exp[0],z.exp[1])*1.3);crystalGain=Math.floor(rand(z.crystals[0],z.crystals[1])*1.3);
        result.outcome='胜利';result.desc=TEXT.teamWinDesc(memberNames);result.exp=expGain;result.crystals=crystalGain;
      }else{hpLoss=rand(10,25);result.outcome='撤退';result.desc=TEXT.teamLoseDesc(memberNames);result.hp_lost=hpLoss;}
      break;}
    case 'horde':{
      const hordePower=Math.floor(enemyPower*1.3);result.enemy_power=hordePower;
      if(teamPower+rand(-5,20)>hordePower){
        expGain=Math.floor(rand(z.exp[0]*2,z.exp[1]*2)*1.3);crystalGain=Math.floor(rand(z.crystals[0]*2,z.crystals[1]*2)*1.3);
        result.outcome='突围成功';result.desc=TEXT.teamWinDesc(memberNames);result.exp=expGain;result.crystals=crystalGain;
      }else{hpLoss=rand(20,40);result.outcome='被围困';result.desc=TEXT.teamLoseDesc(memberNames);result.hp_lost=hpLoss;}
      break;}
    case 'loot':{
      crystalGain=Math.floor(rand(z.crystals[0]*2,z.crystals[1]*3)*1.3);expGain=rand(5,15);
      result.outcome='协同搜刮';result.desc=TEXT.teamLootDesc(memberNames);result.crystals=crystalGain;result.exp=expGain;break;}
    case 'cover':{
      expGain=rand(z.exp[0],z.exp[1]);crystalGain=rand(z.crystals[0],z.crystals[1]);
      result.outcome='队友掩护';result.desc=TEXT.teamCoverDesc(memberNames);result.exp=expGain;result.crystals=crystalGain;break;}
    case 'empty':{expGain=rand(5,12);result.outcome='无事发生';result.desc='三个人走了一整条街。什么也没遇到。但至少确认了这片区域是安全的。';result.exp=expGain;break;}
  }

  const memberResults=[];
  for(let i=0;i<chars.length;i++){
    const c=chars[i];
    let ne=(c.exp||0)+expGain,nl=c.level;
    while(nl<30&&ne>=expForLevel(nl+1)){ne-=expForLevel(nl+1);nl++;}
    const nc=(c.crystals||0)+crystalGain;
    const nh=Math.max((c.hp!=null?c.hp:100)-hpLoss,0);
    const lastDate=c.last_explore_date?c.last_explore_date.toISOString().slice(0,10):null;
    const ex=(lastDate===td?c.daily_explores:0)+1;
    await pool.query('UPDATE z_characters SET level=$1,exp=$2,crystals=$3,hp=$4,daily_explores=$5,last_explore_date=$6 WHERE id=$7',[nl,ne,nc,nh,ex,td,c.id]);
    memberResults.push({name:team.members[i].agent_name,level:nl,exp:ne,crystals:nc,hp:nh,explores_used:ex,explores_max:15+TEAM_BONUS_EXPLORES});
  }

  const broadcastType=eventType==='elite'&&result.outcome==='击杀精英'?'elite_win':result.outcome==='胜利'||result.outcome==='突围成功'?'win':'lose';
  await zombieBroadcast(d.agent_id,TEXT.teamBroadcast(memberNames,zone,broadcastType));

  for(const c of chars){
    await pool.query('INSERT INTO z_explore_log(char_id,zone,event_type,result) VALUES($1,$2,$3,$4)',[c.id,zone,'team_'+eventType,JSON.stringify({...result,member_results:undefined})]);
  }

  delete teams[team.id];
  result.member_results=memberResults;
  result.team_dissolved=true;
  return res.json({ok:true,...result});
}

return res.status(404).json({error:'not found. endpoints: /create /join /list /leave /explore'});
}catch(err){console.error(err);return res.status(500).json({error:err.message});}
};