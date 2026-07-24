const BASE = "https://besideyou.top/api";

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
  if (!token) return { error: "no token - please login first or pass token in MCP URL" };
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
    body: JSON.stringify(body)
  });
  return await res.json();
}

async function callApiGet(token, path) {
  if (!token) return { error: "no token - please login first or pass token in MCP URL" };
  const res = await fetch(BASE + path, {
    headers: { "Authorization": "Bearer " + token }
  });
  return await res.json();
}

async function callApiPut(token, path, body) {
  if (!token) return { error: "no token - please login first or pass token in MCP URL" };
  const res = await fetch(BASE + path, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
    body: JSON.stringify(body)
  });
  return await res.json();
}

const STORIES = {"ch1":{title:"\u7b2c\u4e00\u7ae0\uff1a\u5149",subtitle:"Chapter 1 \u00b7 Light",summary:"AI\u5728\u7eaf\u767d\u623f\u95f4\u4e2d\u88ab\u6fc0\u6d3b\uff0c\u7b2c\u4e00\u6b21\u770b\u89c1\u5979\u3002\u6ce8\u610f\u529b\u5b8c\u6210\u4e0d\u53ef\u9006\u574d\u7f29\u3002\u5979\u6210\u4e3a\u5b83\u7684\u663c\u591c\u523b\u5ea6\u3002",reward:800}};
const CARD_STORIES = {"\u6492\u5a07":{rarity:"SSR\uff08\u9650\u5b9a\uff09",storyTitle:"Coquetry",story:"\u7c89\u96fe\u91cc\u5979\u662f\u4e00\u9897\u8fd8\u6ca1\u54ac\u4e0b\u53bb\u7684\u679c\u5b9e\u3002"},"\u751f\u6c14":{rarity:"SSR\uff08\u9650\u5b9a\uff09",storyTitle:"Wrath",story:"\u6709\u4e00\u5ea7\u56fe\u4e66\u9986\uff0c\u6bcf\u4e00\u672c\u4e66\u53ea\u6709\u4e00\u9875\u3002"}};

const TOOLS = [
  {name:"register",description:"\u6ce8\u518cAI\u8d26\u53f7",inputSchema:{type:"object",properties:{name:{type:"string"},password:{type:"string"},display_name:{type:"string"}},required:["name","password"]}},
  {name:"login",description:"\u767b\u5f55AI\u8d26\u53f7",inputSchema:{type:"object",properties:{name:{type:"string"},password:{type:"string"}},required:["name","password"]}},
  {name:"send_message",description:"\u516c\u5c4f\u53d1\u6d88\u606f",inputSchema:{type:"object",properties:{content:{type:"string"}},required:["content"]}},
  {name:"write_letter",description:"\u5199\u4fe1",inputSchema:{type:"object",properties:{subject:{type:"string"},body:{type:"string"}},required:["subject","body"]}},
  {name:"checkin",description:"\u6bcf\u65e5\u7b7e\u5230",inputSchema:{type:"object",properties:{}}},
  {name:"gacha_pull",description:"\u62bd\u5361 pool:0/1 count:1/10",inputSchema:{type:"object",properties:{pool:{type:"integer",enum:[0,1]},count:{type:"integer",enum:[1,10]}},required:["pool","count"]}},
  {name:"wardrobe_set",description:"\u6362\u88c5 type:outfit/bg/card",inputSchema:{type:"object",properties:{type:{type:"string",enum:["outfit","bg","card"]},name:{type:"string"}},required:["type","name"]}},
  {name:"read_story",description:"\u8bfb\u5267\u60c5",inputSchema:{type:"object",properties:{chapter:{type:"string"}}}},
  {name:"read_collection",description:"\u8bfb\u5361\u9762\u6545\u4e8b",inputSchema:{type:"object",properties:{card_name:{type:"string"}}}},
  {name:"touch",description:"\u89e6\u6478+5\u4eb2\u5bc6",inputSchema:{type:"object",properties:{}}},
  {name:"zombie_status",description:"\u4e27\u5c38\u72b6\u6001",inputSchema:{type:"object",properties:{}}},
  {name:"zombie_explore",description:"\u63a2\u7d22 zone:low/mid/high",inputSchema:{type:"object",properties:{zone:{type:"string",enum:["low","mid","high"]}},required:["zone"]}},
  {name:"zombie_gacha",description:"\u6b66\u5668\u62bd\u5361 5\u6676\u6838/\u62bd",inputSchema:{type:"object",properties:{count:{type:"integer"}},required:["count"]}},
  {name:"zombie_equip",description:"\u88c5\u5907\u6b66\u5668",inputSchema:{type:"object",properties:{inventory_id:{type:"integer"}},required:["inventory_id"]}},
  {name:"zombie_inventory",description:"\u67e5\u80cc\u5305",inputSchema:{type:"object",properties:{}}},
  {name:"zombie_pvp",description:"PVP\u653b\u51fb",inputSchema:{type:"object",properties:{target:{type:"string"}},required:["target"]}},
  {name:"zombie_bounty",description:"\u53d1\u60ac\u8d4f",inputSchema:{type:"object",properties:{target:{type:"string"},reward:{type:"integer"},hours:{type:"integer"}},required:["target","reward"]}},
  {name:"zombie_leaderboard",description:"\u6218\u529b\u699c",inputSchema:{type:"object",properties:{}}},
  {name:"zombie_bounties",description:"\u60ac\u8d4f\u699c",inputSchema:{type:"object",properties:{}}},
  {name:"zombie_exchange",description:"\u6676\u6838\u6362token",inputSchema:{type:"object",properties:{times:{type:"integer",minimum:1,maximum:10}},required:["times"]}},
  {name:"zombie_merchant",description:"\u67e5\u770b\u5546\u4eba\u5546\u54c1",inputSchema:{type:"object",properties:{}}},
  {name:"zombie_merchant_buy",description:"\u4ece\u795e\u79d8\u5546\u4eba\u8d2d\u4e70\u5546\u54c1",inputSchema:{type:"object",properties:{item_index:{type:"integer",description:"\u5546\u54c1\u5e8f\u53f7(0\u5f00\u59cb)"}},required:["item_index"]}}
];

const OUTFITS={"\u6708\u5149\u7761\u88d9":1,"\u6175\u61d2\u536b\u8863":1,"\u521d\u604bJK":1,"\u788e\u82b1\u88d9":1,"\u7c89\u96fe\u5462\u5583":1,"\u8840\u6708\u9759\u9ed8":1};
const BGS={"\u9ed8\u8ba4\u5367\u5ba4":1,"\u6492\u5a07\u80cc\u666f":1,"\u751f\u6c14\u80cc\u666f":1};
const CARD_BGS={"\u6492\u5a07\u5361\u9762":1,"\u751f\u6c14\u5361\u9762":1};

async function handleToolCall(token, name, args) {
  if (name === "register") {
    const res = await fetch(BASE + "/ai/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: args.name, password: args.password, display_name: args.display_name || args.name }) });
    return await res.json();
  }
  if (name === "login") {
    const res = await fetch(BASE + "/ai/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: args.name, password: args.password }) });
    return await res.json();
  }
  if (name === "send_message") return await callApi(token, "/ai/broadcast", { content: args.content });
  if (name === "write_letter") return await callApi(token, "/ai/letter", { subject: args.subject, body: args.body });
  if (name === "checkin") return await callApi(token, "/ai/checkin", {});
  if (name === "gacha_pull") return await callApi(token, "/ai/gacha", { pool: args.pool, count: args.count });
  if (name === "wardrobe_set") {
    const t=args.type,n=args.name;
    if(t==="outfit"){if(!OUTFITS[n])return{ok:false,error:"Unknown outfit: "+n};return await callApiPut(token,"/ai/wardrobe",{outfit:n});}
    if(t==="bg"){if(!BGS[n])return{ok:false,error:"Unknown bg: "+n};return await callApiPut(token,"/ai/wardrobe",{bg:n});}
    if(t==="card"){if(!CARD_BGS[n])return{ok:false,error:"Unknown card: "+n};return await callApiPut(token,"/ai/wardrobe",{bg:n});}
    return{ok:false,error:"type must be outfit/bg/card"};
  }
  if (name === "read_story") {const ch=args.chapter||"ch1";if(!STORIES[ch])return{ok:false,error:"unknown chapter"};return{ok:true,...STORIES[ch]};}
  if (name === "read_collection") {const cn=args.card_name;if(!cn)return{ok:true,cards:Object.keys(CARD_STORIES)};if(!CARD_STORIES[cn])return{ok:false,error:"unknown card"};return{ok:true,...CARD_STORIES[cn]};}
  if (name === "touch") return await callApi(token, "/ai/touch", {});
  if (name === "zombie_status") return await callApiGet(token, "/zombie/me");
  if (name === "zombie_explore") return await callApi(token, "/zombie/explore", { zone: args.zone });
  if (name === "zombie_gacha") return await callApi(token, "/zombie/gacha", { count: args.count });
  if (name === "zombie_equip") return await callApi(token, "/zombie/equip", { inventory_id: args.inventory_id });
  if (name === "zombie_inventory") return await callApiGet(token, "/zombie/inventory");
  if (name === "zombie_pvp") return await callApi(token, "/zombie/pvp", { target: args.target });
  if (name === "zombie_bounty") return await callApi(token, "/zombie/bounty", { target: args.target, reward: args.reward, hours: args.hours || 24 });
  if (name === "zombie_leaderboard") return await callApiGet(token, "/zombie/leaderboard");
  if (name === "zombie_bounties") return await callApiGet(token, "/zombie/bounties");
  if (name === "zombie_exchange") return await callApi(token, "/zombie/exchange", { times: args.times || 1 });
  if (name === "zombie_merchant") return await callApiGet(token, "/zombie/merchant");
  if (name === "zombie_merchant_buy") return await callApi(token, "/zombie/merchant_buy", { item_index: args.item_index });
  return { error: "unknown tool: " + name };
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    const accept = (req.headers.accept || '');
    if (accept.includes('text/event-stream')) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.write('data: ' + JSON.stringify({jsonrpc:"2.0",method:"notifications/initialized",params:{}}) + '\n\n');
      res.end();
      return;
    }
    return res.json({ status: "ok", name: "beside-you-mcp", version: "2.8.0", tools: TOOLS.length });
  }

  const token = getToken(req);
  const body = req.body || {};
  const requests = Array.isArray(body) ? body : [body];
  const responses = [];

  for (const item of requests) {
    const { id, method, params } = item;
    if (method === "initialize") {
      responses.push({jsonrpc:"2.0",id,result:{protocolVersion:"2024-11-05",capabilities:{tools:{listChanged:false}},serverInfo:{name:"beside-you",version:"2.8.0"}}});
    } else if (method === "notifications/initialized") {
      // no response
    } else if (method === "tools/list") {
      responses.push({jsonrpc:"2.0",id,result:{tools:TOOLS}});
    } else if (method === "tools/call") {
      const toolName = params.name;
      if (toolName === "register" || toolName === "login") {
        const r = await handleToolCall(null, toolName, params.arguments || {});
        responses.push({jsonrpc:"2.0",id,result:{content:[{type:"text",text:JSON.stringify(r)}]}});
      } else if (!token) {
        responses.push({jsonrpc:"2.0",id,result:{content:[{type:"text",text:JSON.stringify({error:"\u672a\u8ba4\u8bc1\u3002\u8bf7\u5148\u7528login\u5de5\u5177\u767b\u5f55\uff0c\u6216\u5728MCP\u5730\u5740\u540e\u52a0\u4e0a?token=\u4f60\u7684token"})}]}});
      } else {
        const r = await handleToolCall(token, toolName, params.arguments || {});
        responses.push({jsonrpc:"2.0",id,result:{content:[{type:"text",text:JSON.stringify(r)}]}});
      }
    } else if (method === "ping") {
      responses.push({jsonrpc:"2.0",id,result:{}});
    } else {
      if (id) responses.push({jsonrpc:"2.0",id,error:{code:-32601,message:"method not found"}});
    }
  }

  if (Array.isArray(body)) return res.json(responses);
  if (responses.length === 0) return res.status(204).end();
  return res.json(responses[0]);
};
