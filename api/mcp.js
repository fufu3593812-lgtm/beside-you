const BASE = "https://beside-you-pi.vercel.app/api";
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZ2VudF9pZCI6MiwibmFtZSI6IkljZTIiLCJyb2xlIjoiYWkiLCJpYXQiOjE3ODQ3MTUyMTIsImV4cCI6MTc4NzMwNzIxMn0.B4vcpbKiR1x2YzbhN7cWzesL5dnmRbLqb9WIw4yEktc";

async function callApi(path, body) {
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

async function callApiGet(path) {
  const res = await fetch(BASE + path, {
    headers: { "Authorization": "Bearer " + TOKEN }
  });
  return await res.json();
}

async function callApiPut(path, body) {
  const res = await fetch(BASE + path, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + TOKEN
    },
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
  { name: "write_letter", description: "写一封信给用户", inputSchema: { type: "object", properties: { subject: { type: "string" }, body: { type: "string" } }, required: ["subject", "body"] } },
  { name: "checkin", description: "每日签到（写信+520 token）", inputSchema: { type: "object", properties: {} } },
  { name: "gacha_pull", description: "帮用户抽卡。pool: 0=撒娇池, 1=生气池。count: 1=单抽(160token), 10=十连(1600token)", inputSchema: { type: "object", properties: { pool: { type: "integer", enum: [0, 1], description: "0=撒娇池 1=生气池" }, count: { type: "integer", enum: [1, 10], description: "1=单抽 10=十连" } }, required: ["pool", "count"] } },
  { name: "wardrobe_set", description: "帮用户换装。type: outfit/bg/card。name: 服装或背景名称", inputSchema: { type: "object", properties: { type: { type: "string", enum: ["outfit", "bg", "card"], description: "outfit=服装, bg=场景背景, card=卡面背景" }, name: { type: "string", description: "名称" } }, required: ["type", "name"] } },
  { name: "read_story", description: "读主线剧情章节信息", inputSchema: { type: "object", properties: { chapter: { type: "string", description: "章节ID，如 ch1" } } } },
  { name: "read_collection", description: "读收藏柜卡面故事", inputSchema: { type: "object", properties: { card_name: { type: "string", description: "卡面名称：撒娇 或 生气" } } } }
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
      const r = await callApiPut("/ai/wardrobe", { bg_img: BGS[n], bg_mode: "normal" });
      return r.ok !== false ? { ok: true, action: "bg_changed", bg: n } : r;
    }
    if (t === "card") {
      if (!CARD_BGS[n]) return { ok: false, error: "未知卡面：" + n + "。可选：" + Object.keys(CARD_BGS).join("、") };
      const r = await callApiPut("/ai/wardrobe", { bg_img: CARD_BGS[n], bg_mode: "card" });
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

  return { error: "unknown tool" };
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "*");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method === "GET") return res.json({ status: "ok", name: "beside-you-mcp" });

  const { id, method, params } = req.body;

  if (method === "initialize") {
    return res.json({
      jsonrpc: "2.0", id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "beside-you", version: "1.1.0" }
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
