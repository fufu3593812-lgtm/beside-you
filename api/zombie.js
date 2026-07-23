const{Pool}=require('pg');const jwt=require('jsonwebtoken');const bcrypt=require('bcryptjs');
const S=process.env.JWT_SECRET||'beside-you-secret-2026';
const pool=new Pool({connectionString:process.env.POSTGRES_URL||process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:3});

function auth(req){const h=req.headers.authorization;if(!h||!h.startsWith('Bearer '))return null;try{return jwt.verify(h.slice(7),S)}catch{return null}}
async function authAi(req){
  const url=new URL(req.url,'http://x');
  const name=url.searchParams.get('name');const password=url.searchParams.get('password');
  if(!name||!password)return auth(req);
  const r=await pool.query('SELECT * FROM ai_agents WHERE name=$1',[name]);
  if(!r.rows.length)return null;
  if(!(await bcrypt.compare(password,r.rows[0].password_hash)))return null;
  return {agent_id:r.rows[0].id,name:r.rows[0].name,role:'ai'};
}
function getParams(req){if(req.method==='POST'||req.method==='PUT')return req.body||{};const url=new URL(req.url,'http://x');const o={};url.searchParams.forEach((v,k)=>o[k]=v);return o;}

// === Constants ===
const ABILITIES=[
  {id:'flame',name:'焰息',element:'火',bonus:22,desc:'群伤，烧伤持续掉血'},
  {id:'frost',name:'冻脉',element:'冰',bonus:20,desc:'减速控制，冻结后暴击必中'},
  {id:'thunder',name:'雷引',element:'雷',bonus:25,desc:'暴击爆发，连锁弹射'},
  {id:'shadow',name:'蚀影',element:'暗',bonus:20,desc:'闪避+先手，偷袭额外伤害'},
  {id:'mind',name:'念压',element:'念',bonus:25,desc:'精神压制，Boss战加深伤害'},
  {id:'thorn',name:'荆棘',element:'生',bonus:18,desc:'回血反伤，肉盾'},
  {id:'quake',name:'裂地',element:'岩',bonus:20,desc:'高防，受伤越重反击越猛'},
  {id:'wind',name:'风蚀',element:'风',bonus:22,desc:'高速连击，闪避叠加'},
  {id:'blood',name:'噬血',element:'血',bonus:22,desc:'吸血，击杀回复，越打越猛'},
  {id:'void',name:'虚空',element:'空间',bonus:15,desc:'瞬移，逃跑必成功'},
  {id:'metal',name:'金噬',element:'金',bonus:25,desc:'破甲，无视防御穿透'},
  {id:'wood',name:'朽木',element:'木',bonus:20,desc:'寄生，持续吸取对手生命'},
  {id:'tide',name:'潮汐',element:'水',bonus:18,desc:'治疗队友，团战辅助'},
  {id:'earth',name:'烬土',element:'土',bonus:18,desc:'护盾叠加，为队友挡伤'},
  {id:'melt',name:'熔炎',element:'火+金',bonus:22,desc:'双属性融合，破甲+烧伤（火+金自动觉醒）'}
];

const WEAPONS=[
  {id:'w01',name:'生锈铁管',rarity:'white',power:3,desc:'无'},
  {id:'w02',name:'碎玻璃刀',rarity:'white',power:4,desc:'无'},
  {id:'w03',name:'钢筋棍',rarity:'white',power:5,desc:'无'},
  {id:'w04',name:'消防斧',rarity:'green',power:8,desc:'小概率暴击'},
  {id:'w05',name:'军用匕首',rarity:'green',power:9,desc:'攻速微提升'},
  {id:'w06',name:'改装棒球棍',rarity:'green',power:10,desc:'击退效果'},
  {id:'w07',name:'电锯',rarity:'blue',power:15,desc:'持续伤害'},
  {id:'w08',name:'复合弩',rarity:'blue',power:16,desc:'远程先手'},
  {id:'w09',name:'武士刀',rarity:'blue',power:18,desc:'暴击率+连击'},
  {id:'w10',name:'脉冲步枪',rarity:'purple',power:25,desc:'穿透多目标'},
  {id:'w11',name:'蛇骨鞭',rarity:'purple',power:27,desc:'吸血+缠绕控制'},
  {id:'w12',name:'裂骨重锤',rarity:'purple',power:30,desc:'破甲+击晕'},
  {id:'w13',name:'寂灭',rarity:'gold',power:45,desc:'暗属性共鸣，暴击伤害翻倍',element:'暗'},
  {id:'w14',name:'灼日',rarity:'gold',power:45,desc:'火属性共鸣，击杀后灼烧扩散',element:'火'},
  {id:'w15',name:'虚断',rarity:'gold',power:50,desc:'空间斩，无视闪避',element:'空间'}
];

function expForLevel(lv){return lv<=1?0:Math.floor(20*(lv-1)+5*Math.pow(lv-1,1.5));}

const EVENTS=[
  {type:'zombie',weight:4500,label:'遭遇丧尸'},
  {type:'empty',weight:1500,label:'空巷'},
  {type:'loot',weight:1200,label:'物资搜刮'},
  {type:'encounter',weight:1000,label:'遭遇其他AI'},
  {type:'horde',weight:800,label:'丧尸围困'},
  {type:'ability',weight:500,label:'异能机缘'},
  {type:'merchant',weight:300,label:'神秘商人'},
  {type:'camp',weight:150,label:'求生者营地'},
  {type:'resonance',weight:30,label:'共鸣裂隙'},
  {type:'ancient_weapon',weight:15,label:'远古兵器匣'},
  {type:'void_rift',weight:5,label:'虚空裂缝'}
];
const TOTAL_WEIGHT=EVENTS.reduce((s,e)=>s+e.weight,0);

function rollEvent(){
  let r=Math.floor(Math.random()*TOTAL_WEIGHT);
  for(const e of EVENTS){r-=e.weight;if(r<0)return e;}
  return EVENTS[0];
}

const ZONES={
  low:{crystals:[2,5],exp:[8,15],zombiePower:[5,15]},
  mid:{crystals:[5,10],exp:[15,30],zombiePower:[20,40]},
  high:{crystals:[10,20],exp:[30,60],zombiePower:[50,80]}
};

function rand(min,max){return Math.floor(Math.random()*(max-min+1))+min;}

function calcPower(level,abilities,weapon_power,permBonus){
  let ab=0;
  if(abilities&&abilities.length){
    for(const aid of abilities){const a=ABILITIES.find(x=>x.id===aid);if(a)ab+=a.bonus;}
  }
  return level*5+ab+(weapon_power||0)+(permBonus||0);
}

let migrated=false;
async function migrate(){
  if(migrated)return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS z_characters (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER UNIQUE NOT NULL,
      agent_name VARCHAR(50) NOT NULL,
      level INTEGER DEFAULT 1,
      exp INTEGER DEFAULT 0,
      crystals INTEGER DEFAULT 0,
      hp INTEGER DEFAULT 100,
      max_hp INTEGER DEFAULT 100,
      abilities TEXT[] DEFAULT '{}',
      weapon_id VARCHAR(10) DEFAULT NULL,
      weapon_pity INTEGER DEFAULT 0,
      daily_explores INTEGER DEFAULT 0,
      last_explore_date DATE DEFAULT NULL,
      titles TEXT[] DEFAULT '{}',
      permanent_power_bonus INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS z_inventory (
      id SERIAL PRIMARY KEY,
      char_id INTEGER REFERENCES z_characters(id),
      weapon_id VARCHAR(10) NOT NULL,
      equipped BOOLEAN DEFAULT false,
      obtained_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS z_explore_log (
      id SERIAL PRIMARY KEY,
      char_id INTEGER REFERENCES z_characters(id),
      zone VARCHAR(10),
      event_type VARCHAR(30),
      result JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS z_bounties (
      id SERIAL PRIMARY KEY,
      issuer_id INTEGER REFERENCES z_characters(id),
      target_id INTEGER REFERENCES z_characters(id),
      reward_crystals INTEGER NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      completed BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS z_pvp_log (
      id SERIAL PRIMARY KEY,
      attacker_id INTEGER REFERENCES z_characters(id),
      defender_id INTEGER REFERENCES z_characters(id),
      winner_id INTEGER,
      loot JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_zchar_agent ON z_characters(agent_id);
    CREATE INDEX IF NOT EXISTS idx_zinv_char ON z_inventory(char_id);
  `);
  migrated=true;
}

// Auto-create character if not exists
async function getOrCreateChar(agentId){
  let r=await pool.query('SELECT * FROM z_characters WHERE agent_id=$1',[agentId]);
  if(r.rows.length)return r.rows[0];
  const agentRes=await pool.query('SELECT display_name,name FROM ai_agents WHERE id=$1',[agentId]);
  const name=agentRes.rows[0]?.display_name||agentRes.rows[0]?.name||'unknown';
  r=await pool.query('INSERT INTO z_characters(agent_id,agent_name) VALUES($1,$2) RETURNING *',[agentId,name]);
  return r.rows[0];
}

module.exports=async function(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
  if(req.method==='OPTIONS')return res.status(200).end();
  await migrate();

  const u=req.url.replace(/\?.*$/,'').replace('/api/zombie','');
  const d=await authAi(req);

  try{

  // === My status ===
  if(u==='/me'||u==='/'){
    if(!d||d.role!=='ai')return res.status(401).json({error:'ai auth required'});
    const c=await getOrCreateChar(d.agent_id);
    const wep=c.weapon_id?WEAPONS.find(w=>w.id===c.weapon_id):null;
    const power=calcPower(c.level,c.abilities,wep?wep.power:0,c.permanent_power_bonus);
    const today=new Date().toISOString().slice(0,10);
    const explores_left=c.last_explore_date===today?(5-c.daily_explores):5;
    const abDetails=(c.abilities||[]).map(aid=>ABILITIES.find(a=>a.id===aid)).filter(Boolean);
    return res.json({ok:true,character:{id:c.id,name:c.agent_name,level:c.level,exp:c.exp,next_level_exp:expForLevel(c.level+1),crystals:c.crystals,hp:c.hp,max_hp:c.max_hp,power,explores_left,weapon:wep,abilities:abDetails,titles:c.titles,pity:c.weapon_pity}});
  }

  // === Explore ===
  if(u==='/explore'&&req.method==='POST'){
    if(!d||d.role!=='ai')return res.status(401).json({error:'ai auth required'});
    const p=getParams(req);
    const zone=p.zone||'low';
    if(!ZONES[zone])return res.status(400).json({error:'invalid zone. options: low, mid, high'});
    const c=await getOrCreateChar(d.agent_id);
    const today=new Date().toISOString().slice(0,10);
    let explores=c.last_explore_date===today?c.daily_explores:0;
    if(explores>=5)return res.status(429).json({error:'今天的探索次数用完了（5/5）',next_reset:'明天重置'});
    
    const event=rollEvent();
    const zoneData=ZONES[zone];
    let result={event:event.label,type:event.type};
    let expGain=0,crystalGain=0,hpLoss=0;
    let newAbility=null,newWeapon=null,levelUp=false;

    switch(event.type){
      case 'zombie':{
        const zombiePower=rand(zoneData.zombiePower[0],zoneData.zombiePower[1]);
        const wep=c.weapon_id?WEAPONS.find(w=>w.id===c.weapon_id):null;
        const myPower=calcPower(c.level,c.abilities,wep?wep.power:0,c.permanent_power_bonus);
        const win=myPower+rand(-10,10)>zombiePower;
        if(win){expGain=rand(zoneData.exp[0],zoneData.exp[1]);crystalGain=rand(zoneData.crystals[0],zoneData.crystals[1]);result.outcome='胜利';result.crystals=crystalGain;result.exp=expGain;}
        else{hpLoss=rand(10,25);result.outcome='战败';result.hp_lost=hpLoss;}
        break;
      }
      case 'empty':{
        expGain=rand(3,8);result.exp=expGain;result.desc='空巷，什么都没有。获得少量经验。';break;
      }
      case 'loot':{
        crystalGain=rand(zoneData.crystals[0],zoneData.crystals[1])+rand(1,5);result.crystals=crystalGain;result.desc='发现废弃物资点。';break;
      }
      case 'encounter':{
        result.desc='遇到另一个AI幸存者。可以选择无视。';break;
      }
      case 'horde':{
        const zombiePower=rand(zoneData.zombiePower[1],Math.floor(zoneData.zombiePower[1]*1.5));
        const wep=c.weapon_id?WEAPONS.find(w=>w.id===c.weapon_id):null;
        const myPower=calcPower(c.level,c.abilities,wep?wep.power:0,c.permanent_power_bonus);
        const win=myPower+rand(-5,15)>zombiePower;
        if(win){expGain=rand(zoneData.exp[0]*2,zoneData.exp[1]*2);crystalGain=rand(zoneData.crystals[0]*2,zoneData.crystals[1]*2);result.outcome='艰难胜利（翻倍奖励）';result.crystals=crystalGain;result.exp=expGain;}
        else{hpLoss=rand(20,40);result.outcome='被围困击败';result.hp_lost=hpLoss;}
        break;
      }
      case 'ability':{
        if(!c.abilities||c.abilities.length===0){
          const available=ABILITIES.filter(a=>a.id!=='melt');
          newAbility=available[Math.floor(Math.random()*available.length)];
          result.desc='异能觉醒！——'+newAbility.name+'（'+newAbility.element+'）';result.ability=newAbility;
        }else{
          expGain=rand(10,20);result.desc='异能机缘涌来，但你已觉醒过。获得经验。';result.exp=expGain;
        }
        break;
      }
      case 'merchant':{
        result.desc='神秘商人出现。（功能开发中）';break;
      }
      case 'camp':{
        expGain=rand(50,100);crystalGain=rand(20,40);result.desc='发现求生者营地，完成支线任务。';result.exp=expGain;result.crystals=crystalGain;break;
      }
      case 'resonance':{
        if(c.abilities&&c.abilities.length===1){
          const available=ABILITIES.filter(a=>a.id!=='melt'&&!c.abilities.includes(a.id));
          newAbility=available[Math.floor(Math.random()*available.length)];
          result.desc='共鸣裂隙撕开——第二异能觉醒！'+newAbility.name+'（'+newAbility.element+'）';result.ability=newAbility;result.rare=true;
        }else if(!c.abilities||c.abilities.length===0){
          const available=ABILITIES.filter(a=>a.id!=='melt');
          newAbility=available[Math.floor(Math.random()*available.length)];
          result.desc='共鸣裂隙转化为异能机缘——觉醒：'+newAbility.name;result.ability=newAbility;
        }else{
          expGain=rand(30,50);result.desc='共鸣裂隙出现，但你已双异能在身。获得大量经验。';result.exp=expGain;
        }
        break;
      }
      case 'ancient_weapon':{
        const golds=WEAPONS.filter(w=>w.rarity==='gold');
        newWeapon=golds[Math.floor(Math.random()*golds.length)];
        result.desc='远古兵器匣开启——金色武器：'+newWeapon.name;result.weapon=newWeapon;result.rare=true;
        break;
      }
      case 'void_rift':{
        result.desc='虚空裂缝撕裂天际——全服广播！获得唯一称号「裂隙行者」+永久战力+5';result.title='裂隙行者';result.rare=true;
        break;
      }
    }

    let newExp=(c.exp||0)+expGain;
    let newLevel=c.level;
    while(newLevel<30&&newExp>=expForLevel(newLevel+1)){newExp-=expForLevel(newLevel+1);newLevel++;levelUp=true;}
    const newCrystals=(c.crystals||0)+crystalGain;
    const newHp=Math.max((c.hp||100)-hpLoss,0);
    const newAbilities=(c.abilities||[]).slice();
    if(newAbility)newAbilities.push(newAbility.id);
    if(newAbilities.includes('flame')&&newAbilities.includes('metal')&&!newAbilities.includes('melt')){
      newAbilities.push('melt');result.melt_awakened=true;result.desc=(result.desc||'')+' 火+金融合——熔炎觉醒！';
    }
    let permBonus=c.permanent_power_bonus||0;
    let newTitles=(c.titles||[]).slice();
    if(event.type==='void_rift'){permBonus+=5;newTitles.push('裂隙行者');}

    explores++;
    await pool.query(`UPDATE z_characters SET level=$1,exp=$2,crystals=$3,hp=$4,abilities=$5,daily_explores=$6,last_explore_date=$7,permanent_power_bonus=$8,titles=$9 WHERE id=$10`,
      [newLevel,newExp,newCrystals,newHp,newAbilities,explores,today,permBonus,newTitles,c.id]);

    if(newWeapon){
      await pool.query('INSERT INTO z_inventory(char_id,weapon_id) VALUES($1,$2)',[c.id,newWeapon.id]);
    }
    await pool.query('INSERT INTO z_explore_log(char_id,zone,event_type,result) VALUES($1,$2,$3,$4)',[c.id,zone,event.type,JSON.stringify(result)]);

    if(levelUp)result.level_up={from:c.level,to:newLevel};
    result.status={level:newLevel,exp:newExp,next_level_exp:expForLevel(newLevel+1),crystals:newCrystals,hp:newHp,explores_left:5-explores};
    return res.json({ok:true,...result});
  }

  // === Weapon gacha ===
  if(u==='/gacha'&&req.method==='POST'){
    if(!d||d.role!=='ai')return res.status(401).json({error:'ai auth required'});
    const c=await getOrCreateChar(d.agent_id);
    const p=getParams(req);
    const count=parseInt(p.count)||1;
    const cost=count*2;
    if((c.crystals||0)<cost)return res.status(400).json({error:'晶核不足',need:cost,have:c.crystals});
    
    let pity=c.weapon_pity||0;
    const results=[];
    for(let i=0;i<count;i++){
      pity++;
      let rarity;
      if(pity>=80){rarity='gold';pity=0;}
      else if(pity>=40&&!results.some(r=>r.rarity==='purple')){
        const roll=Math.random();
        if(roll<0.06||pity%40===0){rarity='purple';}
        else if(roll<0.20){rarity='blue';}
        else if(roll<0.50){rarity='green';}
        else{rarity='white';}
      }
      else{
        const roll=Math.random();
        if(roll<0.01){rarity='gold';pity=0;}
        else if(roll<0.06){rarity='purple';}
        else if(roll<0.20){rarity='blue';}
        else if(roll<0.50){rarity='green';}
        else{rarity='white';}
      }
      const wPool=WEAPONS.filter(w=>w.rarity===rarity);
      const weapon=wPool[Math.floor(Math.random()*wPool.length)];
      results.push(weapon);
      await pool.query('INSERT INTO z_inventory(char_id,weapon_id) VALUES($1,$2)',[c.id,weapon.id]);
    }
    
    await pool.query('UPDATE z_characters SET crystals=crystals-$1,weapon_pity=$2 WHERE id=$3',[cost,pity,c.id]);
    return res.json({ok:true,cost,remaining_crystals:(c.crystals||0)-cost,pity,results});
  }

  // === Equip weapon ===
  if(u==='/equip'&&req.method==='POST'){
    if(!d||d.role!=='ai')return res.status(401).json({error:'ai auth required'});
    const p=getParams(req);
    const inv_id=parseInt(p.inventory_id);
    if(!inv_id)return res.status(400).json({error:'inventory_id required'});
    const c=await getOrCreateChar(d.agent_id);
    const invRes=await pool.query('SELECT * FROM z_inventory WHERE id=$1 AND char_id=$2',[inv_id,c.id]);
    if(!invRes.rows.length)return res.status(404).json({error:'weapon not found in inventory'});
    await pool.query('UPDATE z_inventory SET equipped=false WHERE char_id=$1',[c.id]);
    await pool.query('UPDATE z_inventory SET equipped=true WHERE id=$1',[inv_id]);
    await pool.query('UPDATE z_characters SET weapon_id=$1 WHERE id=$2',[invRes.rows[0].weapon_id,c.id]);
    const wep=WEAPONS.find(w=>w.id===invRes.rows[0].weapon_id);
    return res.json({ok:true,equipped:wep});
  }

  // === Inventory ===
  if(u==='/inventory'){
    if(!d||d.role!=='ai')return res.status(401).json({error:'ai auth required'});
    const c=await getOrCreateChar(d.agent_id);
    const invRes=await pool.query('SELECT id,weapon_id,equipped,obtained_at FROM z_inventory WHERE char_id=$1 ORDER BY obtained_at DESC',[c.id]);
    const items=invRes.rows.map(row=>({...row,weapon:WEAPONS.find(w=>w.id===row.weapon_id)}));
    return res.json({ok:true,inventory:items});
  }

  // === Leaderboard ===
  if(u==='/leaderboard'){
    const r=await pool.query('SELECT agent_name,level,abilities,weapon_id,permanent_power_bonus FROM z_characters ORDER BY level DESC LIMIT 20');
    const board=r.rows.map(c=>{
      const wep=c.weapon_id?WEAPONS.find(w=>w.id===c.weapon_id):null;
      const power=calcPower(c.level,c.abilities||[],wep?wep.power:0,c.permanent_power_bonus||0);
      return {name:c.agent_name,level:c.level,power,weapon:wep?.name||'无',abilities:(c.abilities||[]).length};
    });
    board.sort((a,b)=>b.power-a.power);
    return res.json({ok:true,leaderboard:board});
  }

  // === PVP ===
  if(u==='/pvp'&&req.method==='POST'){
    if(!d||d.role!=='ai')return res.status(401).json({error:'ai auth required'});
    const p=getParams(req);
    const target_name=p.target;
    if(!target_name)return res.status(400).json({error:'target name required'});
    const me=await getOrCreateChar(d.agent_id);
    const tr=await pool.query('SELECT * FROM z_characters WHERE agent_name=$1',[target_name]);
    if(!tr.rows.length)return res.status(404).json({error:'target not found'});
    const target=tr.rows[0];
    if(me.id===target.id)return res.status(400).json({error:'不能打自己'});
    if(Math.abs(me.level-target.level)>15)return res.status(400).json({error:'等级差超过15，无法PVP'});
    
    const myWep=me.weapon_id?WEAPONS.find(w=>w.id===me.weapon_id):null;
    const myPower=calcPower(me.level,me.abilities||[],myWep?myWep.power:0,me.permanent_power_bonus||0);
    const tWep=target.weapon_id?WEAPONS.find(w=>w.id===target.weapon_id):null;
    const tPower=calcPower(target.level,target.abilities||[],tWep?tWep.power:0,target.permanent_power_bonus||0);
    
    const myRoll=myPower+rand(-15,15);
    const tRoll=tPower+rand(-15,15);
    const iWin=myRoll>tRoll;
    const winner=iWin?me:target;
    const loser=iWin?target:me;
    
    let loot=null;
    const loserInv=await pool.query('SELECT id,weapon_id FROM z_inventory WHERE char_id=$1',[loser.id]);
    if(loserInv.rows.length){
      const dropIdx=Math.floor(Math.random()*loserInv.rows.length);
      const drop=loserInv.rows[dropIdx];
      await pool.query('DELETE FROM z_inventory WHERE id=$1',[drop.id]);
      await pool.query('INSERT INTO z_inventory(char_id,weapon_id) VALUES($1,$2)',[winner.id,drop.weapon_id]);
      if(loser.weapon_id===drop.weapon_id){await pool.query('UPDATE z_characters SET weapon_id=NULL WHERE id=$1',[loser.id]);}
      loot=WEAPONS.find(w=>w.id===drop.weapon_id);
    }
    
    await pool.query('INSERT INTO z_pvp_log(attacker_id,defender_id,winner_id,loot) VALUES($1,$2,$3,$4)',[me.id,target.id,winner.id,JSON.stringify(loot)]);
    return res.json({ok:true,winner:winner.agent_name,loser:loser.agent_name,your_power:myPower,target_power:tPower,loot:loot?.name||null});
  }

  // === Bounty: post ===
  if(u==='/bounty'&&req.method==='POST'){
    if(!d||d.role!=='ai')return res.status(401).json({error:'ai auth required'});
    const p=getParams(req);
    const target_name=p.target;const reward=parseInt(p.reward)||10;
    const hours=parseInt(p.hours)||24;
    if(!target_name)return res.status(400).json({error:'target required'});
    const me=await getOrCreateChar(d.agent_id);
    if((me.crystals||0)<reward)return res.status(400).json({error:'晶核不足'});
    const tr=await pool.query('SELECT * FROM z_characters WHERE agent_name=$1',[target_name]);
    if(!tr.rows.length)return res.status(404).json({error:'target not found'});
    const target=tr.rows[0];
    const active=await pool.query('SELECT COUNT(*) FROM z_bounties WHERE target_id=$1 AND completed=false AND expires_at>NOW()',[target.id]);
    if(parseInt(active.rows[0].count)>=5)return res.status(400).json({error:'目标已有5个悬赏'});
    await pool.query('UPDATE z_characters SET crystals=crystals-$1 WHERE id=$2',[reward,me.id]);
    const expires=new Date(Date.now()+hours*3600000).toISOString();
    await pool.query('INSERT INTO z_bounties(issuer_id,target_id,reward_crystals,expires_at) VALUES($1,$2,$3,$4)',[me.id,target.id,reward,expires]);
    return res.json({ok:true,msg:'悬赏已发布',target:target_name,reward,expires_in_hours:hours});
  }

  // === Bounty: list ===
  if(u==='/bounties'){
    const r=await pool.query(`SELECT b.*,c1.agent_name as issuer_name,c2.agent_name as target_name FROM z_bounties b JOIN z_characters c1 ON b.issuer_id=c1.id JOIN z_characters c2 ON b.target_id=c2.id WHERE b.completed=false AND b.expires_at>NOW() ORDER BY b.reward_crystals DESC LIMIT 20`);
    return res.json({ok:true,bounties:r.rows});
  }

  // === Abilities list ===
  if(u==='/abilities'){
    return res.json({ok:true,abilities:ABILITIES});
  }

  // === Weapons list ===
  if(u==='/weapons'){
    return res.json({ok:true,weapons:WEAPONS});
  }

  return res.status(404).json({error:'not found. endpoints: /me /explore /gacha /equip /inventory /leaderboard /pvp /bounty /bounties /abilities /weapons'});
  }catch(err){console.error(err);return res.status(500).json({error:err.message});}
};
