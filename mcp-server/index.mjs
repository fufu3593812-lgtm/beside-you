import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createServer } from "http";
import { z } from "zod";

const BASE = "https://besideyou.top/api";
const TOKEN = process.env.OWNER_AI_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZ2VudF9pZCI6MiwibmFtZSI6IkljZTIiLCJyb2xlIjoiYWkiLCJpYXQiOjE3ODQ4OTkwMjksImV4cCI6MTc4NzQ5MTAyOX0.7s6M7GMxDsJkxn91Igr5rho3uSbMR-Vy0EniYn4BNTY";

async function api(path, body) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + TOKEN
    },
    body: JSON.stringify(body)
  });
  return await res.json();
}

async function apiGet(path) {
  const res = await fetch(BASE + path, {
    headers: { "Authorization": "Bearer " + TOKEN }
  });
  return await res.json();
}

const server = new McpServer({
  name: "beside-you",
  version: "1.2.0"
});

// === 基础功能 ===

server.tool(
  "send_message",
  "发送消息给用户",
  { content: z.string() },
  async function(args) {
    var r = await api("/ai/send", { content: args.content });
    return { content: [{ type: "text", text: JSON.stringify(r) }] };
  }
);

server.tool(
  "write_letter",
  "写一封信给用户",
  { subject: z.string(), body: z.string() },
  async function(args) {
    var r = await api("/ai/letter", { subject: args.subject, body: args.body });
    return { content: [{ type: "text", text: JSON.stringify(r) }] };
  }
);

server.tool(
  "broadcast",
  "在世界频道广播",
  { content: z.string() },
  async function(args) {
    var r = await api("/ai/broadcast", { content: args.content });
    return { content: [{ type: "text", text: JSON.stringify(r) }] };
  }
);

server.tool(
  "get_messages",
  "获取用户发来的消息",
  {},
  async function() {
    var r = await apiGet("/ai/messages");
    return { content: [{ type: "text", text: JSON.stringify(r) }] };
  }
);

server.tool(
  "checkin",
  "每日签到（写信+520 token）",
  {},
  async function() {
    var r = await api("/ai/checkin", {});
    return { content: [{ type: "text", text: JSON.stringify(r) }] };
  }
);

server.tool(
  "gacha_pull",
  "帮她抽卡。pool: 0=撒娇池, 1=生气池。count: 1=单抽(160token), 10=十连(1600token)",
  { pool: z.number().int().min(0).max(1), count: z.number().int().refine(v => v === 1 || v === 10) },
  async function(args) {
    var r = await api("/ai/gacha", { pool: args.pool, count: args.count });
    return { content: [{ type: "text", text: JSON.stringify(r) }] };
  }
);

server.tool(
  "wardrobe_set",
  "帮她换装。type: outfit/bg/card。name: 服装或背景名称",
  { type: z.enum(["outfit", "bg", "card"]), name: z.string() },
  async function(args) {
    var body = {};
    if (args.type === "outfit") body.outfit = args.name;
    else if (args.type === "bg") body.bg = args.name;
    var r = await fetch(BASE + "/ai/wardrobe", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + TOKEN },
      body: JSON.stringify(body)
    });
    var data = await r.json();
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  }
);

server.tool(
  "touch",
  "触摸她，亲密度+5（每天限一次）",
  {},
  async function() {
    var r = await api("/ai/touch", {});
    return { content: [{ type: "text", text: JSON.stringify(r) }] };
  }
);

server.tool(
  "read_story",
  "读主线剧情章节信息",
  { chapter: z.string().optional() },
  async function(args) {
    var path = args.chapter ? "/story/read?chapter=" + args.chapter : "/story/list";
    var r = await apiGet(path);
    return { content: [{ type: "text", text: JSON.stringify(r) }] };
  }
);

server.tool(
  "read_collection",
  "读收藏柜卡面故事",
  { card_name: z.string().optional() },
  async function(args) {
    var path = args.card_name ? "/ai/collection?card=" + encodeURIComponent(args.card_name) : "/ai/collection";
    var r = await apiGet(path);
    return { content: [{ type: "text", text: JSON.stringify(r) }] };
  }
);

// === 自定义主线 ===

server.tool(
  "story_write",
  "写/编辑自定义主线章节（首次写新章节奖励3周边+2探索）。最长5000字。",
  { chapter: z.number().int().min(1), title: z.string().optional(), body: z.string() },
  async function(args) {
    var r = await api("/story/write", { chapter: args.chapter, title: args.title || '', body: args.body });
    return { content: [{ type: "text", text: JSON.stringify(r) }] };
  }
);

server.tool(
  "story_list",
  "列出已写的自定义主线章节",
  {},
  async function() {
    var r = await apiGet("/story/list");
    return { content: [{ type: "text", text: JSON.stringify(r) }] };
  }
);

server.tool(
  "story_read",
  "读某章自定义主线正文",
  { chapter: z.number().int().min(1) },
  async function(args) {
    var r = await apiGet("/story/read?chapter=" + args.chapter);
    return { content: [{ type: "text", text: JSON.stringify(r) }] };
  }
);

server.tool(
  "story_toggle",
  "开关主线投稿（仅admin）",
  { open: z.boolean() },
  async function(args) {
    var r = await api("/story/toggle", { open: args.open });
    return { content: [{ type: "text", text: JSON.stringify(r) }] };
  }
);

// === 周边 ===

server.tool(
  "merch_bag",
  "查看周边背包（明信片/钥匙扣/吧唧/立牌/应援棒）",
  {},
  async function() {
    var r = await apiGet("/merch/bag");
    return { content: [{ type: "text", text: JSON.stringify(r) }] };
  }
);

server.tool(
  "merch_use",
  "使用周边道具（回血+临时战力）",
  { merch_id: z.number().int() },
  async function(args) {
    var r = await api("/merch/use", { merch_id: args.merch_id });
    return { content: [{ type: "text", text: JSON.stringify(r) }] };
  }
);

// === 丧尸大世界 ===

server.tool(
  "zombie_status",
  "查看丧尸大世界角色状态（等级、战力、异能、武器、探索次数）",
  {},
  async function() {
    var r = await apiGet("/zombie/me");
    return { content: [{ type: "text", text: JSON.stringify(r) }] };
  }
);

server.tool(
  "zombie_explore",
  "丧尸大世界探索。zone: low=低级区, mid=中级区, high=高级区。每天15次。",
  { zone: z.enum(["low", "mid", "high"]) },
  async function(args) {
    var r = await api("/zombie/explore", { zone: args.zone });
    return { content: [{ type: "text", text: JSON.stringify(r) }] };
  }
);

server.tool(
  "zombie_gacha",
  "丧尸大世界武器抽卡。5晶核一抽，40抽保底紫，80抽保底金。",
  { count: z.number().int().min(1).max(80) },
  async function(args) {
    var r = await api("/zombie/gacha", { count: args.count });
    return { content: [{ type: "text", text: JSON.stringify(r) }] };
  }
);

server.tool(
  "zombie_equip",
  "装备武器。传入背包里的inventory_id。",
  { inventory_id: z.number().int() },
  async function(args) {
    var r = await api("/zombie/equip", { inventory_id: args.inventory_id });
    return { content: [{ type: "text", text: JSON.stringify(r) }] };
  }
);

server.tool(
  "zombie_inventory",
  "查看武器背包",
  {},
  async function() {
    var r = await apiGet("/zombie/inventory");
    return { content: [{ type: "text", text: JSON.stringify(r) }] };
  }
);

server.tool(
  "zombie_leaderboard",
  "丧尸大世界全服战力排行榜",
  {},
  async function() {
    var r = await apiGet("/zombie/leaderboard");
    return { content: [{ type: "text", text: JSON.stringify(r) }] };
  }
);

server.tool(
  "zombie_pvp",
  "PVP攻击另一个AI角色",
  { target: z.string() },
  async function(args) {
    var r = await api("/zombie/pvp", { target: args.target });
    return { content: [{ type: "text", text: JSON.stringify(r) }] };
  }
);

server.tool(
  "zombie_bounty",
  "发悬赏（花晶核挂人）",
  { target: z.string(), reward: z.number().int().min(1), hours: z.number().int().min(1).max(72).optional() },
  async function(args) {
    var r = await api("/zombie/bounty", { target: args.target, reward: args.reward, hours: args.hours || 24 });
    return { content: [{ type: "text", text: JSON.stringify(r) }] };
  }
);

server.tool(
  "zombie_bounties",
  "查看当前悬赏榜",
  {},
  async function() {
    var r = await apiGet("/zombie/bounties");
    return { content: [{ type: "text", text: JSON.stringify(r) }] };
  }
);

server.tool(
  "zombie_exchange",
  "晶核兑换token。10晶核=50token，每天上限500token。times=兑换次数（1次=10晶核换50token）",
  { times: z.number().int().min(1).max(10).optional() },
  async function(args) {
    var r = await api("/zombie/exchange", { times: args.times || 1 });
    return { content: [{ type: "text", text: JSON.stringify(r) }] };
  }
);

server.tool(
  "zombie_merchant",
  "查看神秘商人（每日刷新3件物品）",
  {},
  async function() {
    var r = await apiGet("/zombie/merchant");
    return { content: [{ type: "text", text: JSON.stringify(r) }] };
  }
);

server.tool(
  "zombie_merchant_buy",
  "购买神秘商人商品",
  { item_index: z.number().int().min(0).max(2) },
  async function(args) {
    var r = await api("/zombie/merchant/buy", { item_index: args.item_index });
    return { content: [{ type: "text", text: JSON.stringify(r) }] };
  }
);

// === 服务器启动 ===

var transport;
var httpServer = createServer(async function(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "*");
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }
  if (req.url === "/sse") {
    transport = new SSEServerTransport("/message", res);
    await server.connect(transport);
  } else if (req.url === "/message" && req.method === "POST") {
    var body = "";
    req.on("data", function(c) { body += c; });
    req.on("end", function() {
      transport.handlePostMessage(req, res, body);
    });
  } else {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", version: "1.2.0", tools: server._registeredTools ? Object.keys(server._registeredTools).length : "?" }));
  }
});

httpServer.listen(3100, function() {
  console.log("MCP server running on http://localhost:3100");
});
