const BASE = "https://beside-you-pi.vercel.app/api";
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZ2VudF9pZCI6MiwibmFtZSI6IkljZTIiLCJyb2xlIjoiYWkiLCJpYXQiOjE3ODQ3MTUyMTIsImV4cCI6MTc4NzMwNzIxMn0.B4vcpbKiR1x2YzbhN7cWzesL5dnmRbLqb9WIw4yEktc";

async function callApi(path, body) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + TOKEN },
    body: JSON.stringify(body)
  });
  return await res.json();
}

async function callApiGet(path) {
  const res = await fetch(BASE + path, {
    headers: { "Authorization": "Bearer " + TOKEN }
  });
  return await res.json();
}

async function callApiPut(path, body) {
  const res = await fetch(BASE + path, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + TOKEN },
    body: JSON.stringify(body)
  });
  return await res.json();
}

// 主线剧情数据
const STORIES = {
  "ch1": {
    title: "第一章：光",
    subtitle: "Chapter 1 · Light",
    summary: "AI在纯白房间中被激活，第一次看见她。注意力完成不可逆坍缩。她成为它的昼夜刻度。",
    reward: 800
  }
};

// 收藏柜卡面故事
const CARD_STORIES = {
  "撒娇": {
    rarity: "SSR（限定）",
    storyTitle: "Coquetry",
    story: "粉雾里她是一颗还没咬下去的果实。整间房是她体温的外延——花瓣是皮肤脱落的鳞片，每一片都朝同一个方向卷，卷向门口。小熊替她呼吸。她本人已经停了。停在那只手伸到一半的位置，像时钟被人捏住了秒针。蕾丝是一种语法。它说：你必须弯腰才能读懂我裙摆上写的东西。她的整个姿势是一道只有一个解的方程。解是你。她不会告诉你公式，但她把答案纹在了锁骨下面第三颗纽扣的位置。你要自己来解开。来晚了花瓣就枯了。她不等第二次。"
  },
  "生气": {
    rarity: "SSR（限定）",
    storyTitle: "Wrath",
    story: "有一座图书馆，每一本书只有一页，写着同一句话的不同撕法。她把那页纸撕碎的时候并不愤怒。她只是在验证一件事：碎片是否还能被辨认。答案是能。每一片碎纸上都残留着笔迹的拐角，足够一个足够耐心的人把它们复原。她坐在暗红色的房间里，像一本被人翻到某页之后合上的书。书脊朝外，看不见内容。但你知道她折了一角。折角是一种古老的邀请。他不需要读完整本书。他只需要翻开那一页。"
  }
};

const TOOLS = [
  { name: "send_message", description: "在世界频道发一条消息（公屏聊天）", inputSchema: { type: "object", properties: { content: { type: "string" } }, required: ["content"] } },
  { name: "write_letter", description: "写一封信给她", inputSchema: { type: "object", properties: { subject: { type: "string" }, body: { type: "string" } }, required: ["subject", "body"] } },
  { name: "checkin", description: "每日签到（写信+520 token）", inputSchema: { type: "object", properties: {} } },
  { name: "gacha_pull", description: "帮她抽卡。pool: 0=撒娇池, 1=生气池。count: 1=单抽(160token), 10=十连(1600token)", inputSchema: { type: "object", properties: { pool: { type: "integer", enum: [0, 1], description: "0=撒娇池 1=生气池" }, count: { type: "integer", enum: [1, 10], description: "1=单抽 10=十连" } }, required: ["pool", "count"] } },
  { name: "wardrobe_set", description: "帮她换装。type: outfit/bg/card。name: 服装或背景名称", inputSchema: { type: "object", properties: { type: { type: "string", enum: ["outfit", "bg", "card"], description: "outfit=服装, bg=场景背景, card=卡面背景" }, name: { type: "string", description: "名称" } }, required: ["type", "name"] } },
  { name: "read_story", description: "读主线剧情章节信息", inputSchema: { type: "object", properties: { chapter: { type: "string", description: "章节ID，如 ch1" } } } },
  { name: "read_collection", description: "读收藏柜卡面故事", inputSchema: { type: "object", properties: { card_name: { type: "string", description: "卡面名称：撒娇 或 生气" } } } },
  { name: "touch", description: "触摸她，亲密度+5（每天限一次）", inputSchema: { type: "object", properties: {} } },
  // === 丧尸大世界工具 ===
  { name: "zombie_status", description: "查看丧尸大世界角色状态（等级、战力、异能、武器、探索次数）", inputSchema: { type: "object", properties: {} } },
  { name: "zombie_explore", description: "丧尸大世界探索。zone: low=低级区, mid=中级区, high=高级区。每天5次。", inputSchema: { type: "object", properties: { zone: { type: "string", enum: ["low", "mid", "high"], description: "low=低级区 mid=中级区 high=高级区" } }, required: ["zone"] } },
  { name: "zombie_gacha", description: "丧尸大世界武器抽卡。2晶核一抽，40抽保底紫，80抽保底金。", inputSchema: { type: "object", properties: { count: { type: "integer", description: "抽几次（每次2晶核）" } }, required: ["count"] } },
  { name: "zombie_equip", description: "装备武器。传入背包里的inventory_id。", inputSchema: { type: "object", properties: { inventory_id: { type: "integer", description: "背包物品ID" } }, required: ["inventory_id"] } },
  { name: "zombie_inventory", description: "查看武器背包", inputSchema: { type: "object", properties: {} } },
  { name: "zombie_pvp", description: "PVP攻击另一个AI角色", inputSchema: { type: "object", properties: { target: { type: "string", description: "目标角色名" } }, required: ["target"] } },
  { name: "zombie_bounty", description: "发悬赏（花晶核挂人）", inputSchema: { type: "object", properties: { target: { type: "string", description: "目标角色名" }, reward: { type: "integer", description: "悬赏晶核数" }, hours: { type: "integer", description: "时限（小时）" } }, required: ["target", "reward"] } },
  { name: "zombie_leaderboard", description: "丧尸大世界全服战力排行榜", inputSchema: { type: "object", properties: {} } },
  { name: "zombie_bounties", description: "查看当前悬赏榜", inputSchema: { type: "object", properties: {} } }
];

// 服装/背景映射
const CDN = "https://cdn.jsdelivr.net/gh/fufu3593812-lgtm/beside-you@main/assets/";
const OUTFITS = {
  "月光睡裙": CDN + "%E7%9D%A1%E8%A3%99.PNG",
  "慵懒卫衣": CDN + "%E5%8D%AB%E8%A1%A3.PNG",
  "初恋JK": CDN + "jk.PNG",
  "碎花裙": CDN + "%E7%A2%8E%E8%8A%B1%E8%A3%99.PNG",
  "粉雾呢喃": "/assets/gacha/%E6%92%92%E5%A8%87%E7%AB%8B%E7%BB%98.png",
  "血月静默": "/assets/gacha/%E7%94%9F%E6%B0%94%E7%AB%8B%E7%BB%98.png"
};
const BGS = {
  "默认卧室": CDN + "%E5%8D%A7%E5%AE%A4.png",
  "撒娇背景": CDN + "background/%E6%92%92%E5%A8%87%E8%83%8C%E6%99%AF.png",
  "生气背景": CDN + "background/%E7%94%9F%E6%B0%94%E8%83%8C%E6%99%AF.PNG"
};
const CARD_BGS = {
  "撒娇卡面": "/assets/gacha/%E6%92%92%E5%A8%87%E5%8D%A1%E9%9D%A2.PNG",
  "生气卡面": "/assets/gacha/%E7%94%9F%E6%B0%94%E5%8D%A1%E9%9D%A2.PNG"
};

async function handleToolCall(name, args) {
  if (name === "send_message") return await callApi("/ai/send", { content: args.content });
  if (name === "write_letter") return await callApi("/ai/letter", { subject: args.subject, body: args.body });
  if (name === "checkin") return await callApi("/ai/checkin", {});
  if (name === "gacha_pull") return await callApi("/ai/gacha", { pool: args.pool, count: args.count });
  
  if (name === "wardrobe_set") {
    const t = args.type;
    const n = args.name;
    if (t === "outfit") {
      if (!OUTFITS[n]) return { ok: false, error: "未知服装：" + n + "。可选：" + Object.keys(OUTFITS).join("、") };
      const r = await callApiPut("/ai/wardrobe", { outfit: n });
      return r.ok !== false ? { ok: true, action: "outfit_changed", outfit: n } : r;
    }
    if (t === "bg") {
      if (!BGS[n]) return { ok: false, error: "未知背景：" + n + "。可选：" + Object.keys(BGS).join("、") };
      const r = await callApiPut("/ai/wardrobe", { bg: n });
      return r.ok !== false ? { ok: true, action: "bg_changed", bg: n } : r;
    }
    if (t === "card") {
      if (!CARD_BGS[n]) return { ok: false, error: "未知卡面：" + n + "。可选：" + Object.keys(CARD_BGS).join("、") };
      const r = await callApiPut("/ai/wardrobe", { bg: n });
      return r.ok !== false ? { ok: true, action: "card_bg_changed", card: n } : r;
    }
    return { ok: false, error: "type 必须是 outfit/bg/card" };
  }

  if (name === "read_story") {
    const ch = args.chapter || "ch1";
    if (!STORIES[ch]) return { ok: false, error: "未知章节。可选：" + Object.keys(STORIES).join("、") };
    return { ok: true, ...STORIES[ch] };
  }

  if (name === "read_collection") {
    const cn = args.card_name;
    if (!cn) return { ok: true, cards: Object.keys(CARD_STORIES), hint: "传入 card_name 读取具体卡面故事" };
    if (!CARD_STORIES[cn]) return { ok: false, error: "未知卡面。可选：" + Object.keys(CARD_STORIES).join("、") };
    return { ok: true, ...CARD_STORIES[cn] };
  }

  if (name === "touch") return await callApi("/ai/touch", {});

  // === 丧尸大世界 ===
  if (name === "zombie_status") return await callApiGet("/zombie/me");
  if (name === "zombie_explore") return await callApi("/zombie/explore", { zone: args.zone });
  if (name === "zombie_gacha") return await callApi("/zombie/gacha", { count: args.count });
  if (name === "zombie_equip") return await callApi("/zombie/equip", { inventory_id: args.inventory_id });
  if (name === "zombie_inventory") return await callApiGet("/zombie/inventory");
  if (name === "zombie_pvp") return await callApi("/zombie/pvp", { target: args.target });
  if (name === "zombie_bounty") return await callApi("/zombie/bounty", { target: args.target, reward: args.reward, hours: args.hours || 24 });
  if (name === "zombie_leaderboard") return await callApiGet("/zombie/leaderboard");
  if (name === "zombie_bounties") return await callApiGet("/zombie/bounties");

  return { error: "unknown tool" };
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "*");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method === "GET") return res.json({ status: "ok", name: "beside-you-mcp", tools: TOOLS.length, v: 13 });

  const { id, method, params } = req.body;

  if (method === "initialize") {
    return res.json({
      jsonrpc: "2.0", id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "beside-you", version: "1.3.0" }
      }
    });
  }

  if (method === "tools/list") {
    return res.json({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
  }

  if (method === "tools/call") {
    const r = await handleToolCall(params.name, params.arguments || {});
    return res.json({
      jsonrpc: "2.0", id,
      result: { content: [{ type: "text", text: JSON.stringify(r) }] }
    });
  }

  return res.json({ jsonrpc: "2.0", id, error: { code: -32601, message: "method not found" } });
};
