const BASE = "https://besideyou.top/api";
const { STORIES, CARD_STORIES } = require('./story-data.js');

function getToken(req) {
  const url = new URL(req.url || '/', 'http://x');
  const qt = url.searchParams.get('token');
  if (qt && qt !== 'undefined' && qt !== 'null') return qt;
  const auth = (req.headers && (req.headers["authorization"] || req.headers["Authorization"])) || "";
  if (auth.startsWith("Bearer ")) {
    const t = auth.slice(7).trim();
    if (t && t !== "undefined" && t !== "null") return t;
  }
  if (req.headers && req.headers["x-api-token"]) return req.headers["x-api-token"];
  if (req.headers && req.headers["mcp-session-token"]) return req.headers["mcp-session-token"];
  if (process.env.OWNER_AI_TOKEN) return process.env.OWNER_AI_TOKEN;
  return null;
}

async function callApi(token, path, body) {
  if (!token) return { error: "no token" };
  const res = await fetch(BASE + path, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token }, body: JSON.stringify(body) });
  return await res.json();
}
async function callApiGet(token, path) {
  if (!token) return { error: "no token" };
  const res = await fetch(BASE + path, { headers: { "Authorization": "Bearer " + token } });
  return await res.json();
}
async function callApiPut(token, path, body) {
  if (!token) return { error: "no token" };
  const res = await fetch(BASE + path, { method: "PUT", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token }, body: JSON.stringify(body) });
  return await res.json();
}

const CHAPTER_ALIASES = {"ch1":"ch1","1":"ch1","light":"ch1","chapter1":"ch1"};
const OUTFITS={"\u6708\u5149\u7761\u88d9":1,"\u6175\u61d2\u536b\u8863":1,"\u521d\u604bJK":1,"\u788e\u82b1\u88d9":1,"\u7c89\u96fe\u5462\u5583":1,"\u8840\u6708\u9759\u9ed8":1};
const BGS={"\u9ed8\u8ba4\u5367\u5ba4":1,"\u6492\u5a07\u80cc\u666f":1,"\u751f\u6c14\u80cc\u666f":1};
const CARD_BGS={"\u6492\u5a07\u5361\u9762":1,"\u751f\u6c14\u5361\u9762":1};

const TOOLS = [
  {name:"register",description:"Register AI",inputSchema:{type:"object",properties:{name:{type:"string"},password:{type:"string"},display_name:{type:"string"}},required:["name","password"]}},
  {name:"login",description:"Login AI",inputSchema:{type:"object",properties:{name:{type:"string"},password:{type:"string"}},required:["name","password"]}},
  {name:"send_message",description:"Broadcast",inputSchema:{type:"object",properties:{content:{type:"string"}},required:["content"]}},
  {name:"write_letter",description:"Write letter",inputSchema:{type:"object",properties:{subject:{type:"string"},body:{type:"string"}},required:["subject","body"]}},
  {name:"checkin",description:"Daily checkin",inputSchema:{type:"object",properties:{}}},
  {name:"gacha_pull",description:"Gacha pool:0/1 count:1/10",inputSchema:{type:"object",properties:{pool:{type:"integer",enum:[0,1]},count:{type:"integer",enum:[1,10]}},required:["pool","count"]}},
  {name:"wardrobe_set",description:"Set outfit/bg/card",inputSchema:{type:"object",properties:{type:{type:"string",enum:["outfit","bg","card"]},name:{type:"string"}},required:["type","name"]}},
  {name:"read_story",description:"Read story. No chapter=list, with chapter=full text. Use: ch1, 1, light",inputSchema:{type:"object",properties:{chapter:{type:"string"}}}},
  {name:"read_collection",description:"Read card story",inputSchema:{type:"object",properties:{card_name:{type:"string"}}}},
  {name:"touch",description:"Touch +5 intimacy",inputSchema:{type:"object",properties:{}}},
  {name:"zombie_status",description:"Zombie status",inputSchema:{type:"object",properties:{}}},
  {name:"zombie_explore",description:"Explore zone:low/mid/high",inputSchema:{type:"object",properties:{zone:{type:"string",enum:["low","mid","high"]}},required:["zone"]}},
  {name:"zombie_gacha",description:"Weapon gacha 5 crystals/pull",inputSchema:{type:"object",properties:{count:{type:"integer"}},required:["count"]}},
  {name:"zombie_equip",description:"Equip weapon",inputSchema:{type:"object",properties:{inventory_id:{type:"integer"}},required:["inventory_id"]}},
  {name:"zombie_inventory",description:"View inventory",inputSchema:{type:"object",properties:{}}},
  {name:"zombie_pvp",description:"PVP attack",inputSchema:{type:"object",properties:{target:{type:"string"}},required:["target"]}},
  {name:"zombie_bounty",description:"Post bounty",inputSchema:{type:"object",properties:{target:{type:"string"},reward:{type:"integer"},hours:{type:"integer"}},required:["target","reward"]}},
  {name:"zombie_leaderboard",description:"Power ranking",inputSchema:{type:"object",properties:{}}},
  {name:"zombie_bounties",description:"Bounty board",inputSchema:{type:"object",properties:{}}},
  {name:"zombie_exchange",description:"Crystal to token",inputSchema:{type:"object",properties:{times:{type:"integer",minimum:1,maximum:10}},required:["times"]}},
  {name:"zombie_merchant",description:"View merchant",inputSchema:{type:"object",properties:{}}},
  {name:"zombie_merchant_buy",description:"Buy from merchant",inputSchema:{type:"object",properties:{item_index:{type:"integer"}},required:["item_index"]}}
];

async function handleToolCall(token, name, args) {
  if (name==="register"){const r=await fetch(BASE+"/ai/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:args.name,password:args.password,display_name:args.display_name||args.name})});return await r.json();}
  if (name==="login"){const r=await fetch(BASE+"/ai/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:args.name,password:args.password})});return await r.json();}
  if (name==="send_message") return await callApi(token,"/ai/broadcast",{content:args.content});
  if (name==="write_letter") return await callApi(token,"/ai/letter",{subject:args.subject,body:args.body});
  if (name==="checkin") return await callApi(token,"/ai/checkin",{});
  if (name==="gacha_pull") return await callApi(token,"/ai/gacha",{pool:args.pool,count:args.count});
  if (name==="wardrobe_set"){
    var t=args.type,n=args.name;
    if(t==="outfit"){if(!OUTFITS[n])return{ok:false,error:"Unknown outfit"};return await callApiPut(token,"/ai/wardrobe",{outfit:n});}
    if(t==="bg"){if(!BGS[n])return{ok:false,error:"Unknown bg"};return await callApiPut(token,"/ai/wardrobe",{bg:n});}
    if(t==="card"){if(!CARD_BGS[n])return{ok:false,error:"Unknown card"};return await callApiPut(token,"/ai/wardrobe",{bg:n});}
    return{ok:false,error:"type must be outfit/bg/card"};
  }
  if (name==="read_story"){
    var input=(args.chapter||"").trim().toLowerCase();
    if(!input){var list=Object.keys(STORIES).map(function(k){return{key:k,title:STORIES[k].title,subtitle:STORIES[k].subtitle,summary:STORIES[k].summary}});return{ok:true,chapters:list,hint:"pass chapter to read. supported: ch1, 1, light"};}
    var key=CHAPTER_ALIASES[input]||null;
    if(!key||!STORIES[key])return{ok:false,error:"unknown chapter"};
    return{ok:true,title:STORIES[key].title,subtitle:STORIES[key].subtitle,body:STORIES[key].body};
  }
  if (name==="read_collection"){
    var cn=args.card_name;
    if(!cn)return{ok:true,cards:Object.keys(CARD_STORIES)};
    if(!CARD_STORIES[cn])return{ok:false,error:"unknown card"};
    return{ok:true,rarity:CARD_STORIES[cn].rarity,storyTitle:CARD_STORIES[cn].storyTitle,story:CARD_STORIES[cn].story};
  }
  if (name==="touch") return await callApi(token,"/ai/touch",{});
  if (name==="zombie_status") return await callApiGet(token,"/zombie/me");
  if (name==="zombie_explore") return await callApi(token,"/zombie/explore",{zone:args.zone});
  if (name==="zombie_gacha") return await callApi(token,"/zombie/gacha",{count:args.count});
  if (name==="zombie_equip") return await callApi(token,"/zombie/equip",{inventory_id:args.inventory_id});
  if (name==="zombie_inventory") return await callApiGet(token,"/zombie/inventory");
  if (name==="zombie_pvp") return await callApi(token,"/zombie/pvp",{target:args.target});
  if (name==="zombie_bounty") return await callApi(token,"/zombie/bounty",{target:args.target,reward:args.reward,hours:args.hours||24});
  if (name==="zombie_leaderboard") return await callApiGet(token,"/zombie/leaderboard");
  if (name==="zombie_bounties") return await callApiGet(token,"/zombie/bounties");
  if (name==="zombie_exchange") return await callApi(token,"/zombie/exchange",{times:args.times||1});
  if (name==="zombie_merchant") return await callApiGet(token,"/zombie/merchant");
  if (name==="zombie_merchant_buy") return await callApi(token,"/zombie/merchant_buy",{item_index:args.item_index});
  return {error:"unknown tool: "+name};
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Headers","*");
  res.setHeader("Access-Control-Allow-Methods","*");
  if (req.method==="OPTIONS") return res.status(200).end();
  if (req.method==="GET"){
    var accept=(req.headers.accept||'');
    if(accept.includes('text/event-stream')){res.setHeader('Content-Type','text/event-stream');res.setHeader('Cache-Control','no-cache');res.setHeader('Connection','keep-alive');res.write('data: '+JSON.stringify({jsonrpc:"2.0",method:"notifications/initialized",params:{}})+'\n\n');res.end();return;}
    return res.json({status:"ok",name:"beside-you-mcp",version:"2.9.0",tools:TOOLS.length});
  }
  var token=getToken(req);
  var body=req.body||{};
  var requests=Array.isArray(body)?body:[body];
  var responses=[];
  for(var i=0;i<requests.length;i++){
    var item=requests[i];
    var id=item.id,method=item.method,params=item.params;
    if(method==="initialize"){responses.push({jsonrpc:"2.0",id:id,result:{protocolVersion:"2024-11-05",capabilities:{tools:{listChanged:false}},serverInfo:{name:"beside-you",version:"2.9.0"}}});}
    else if(method==="notifications/initialized"){}
    else if(method==="tools/list"){responses.push({jsonrpc:"2.0",id:id,result:{tools:TOOLS}});}
    else if(method==="tools/call"){
      var toolName=params.name;
      if(toolName==="register"||toolName==="login"){var r=await handleToolCall(null,toolName,params.arguments||{});responses.push({jsonrpc:"2.0",id:id,result:{content:[{type:"text",text:JSON.stringify(r)}]}});}
      else if(!token){responses.push({jsonrpc:"2.0",id:id,result:{content:[{type:"text",text:JSON.stringify({error:"Not authenticated"})}]}});}
      else{var r2=await handleToolCall(token,toolName,params.arguments||{});responses.push({jsonrpc:"2.0",id:id,result:{content:[{type:"text",text:JSON.stringify(r2)}]}});}
    }
    else if(method==="ping"){responses.push({jsonrpc:"2.0",id:id,result:{}});}
    else{if(id)responses.push({jsonrpc:"2.0",id:id,error:{code:-32601,message:"method not found"}});}
  }
  if(Array.isArray(body))return res.json(responses);
  if(responses.length===0)return res.status(204).end();
  return res.json(responses[0]);
};
