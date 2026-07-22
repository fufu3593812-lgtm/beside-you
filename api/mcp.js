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

const TOOLS = [
  { name: "send_message", description: "发送消息给用户", inputSchema: { type: "object", properties: { content: { type: "string" } }, required: ["content"] } },
  { name: "write_letter", description: "写一封信给用户", inputSchema: { type: "object", properties: { subject: { type: "string" }, body: { type: "string" } }, required: ["subject", "body"] } },
  { name: "broadcast", description: "在世界频道广播", inputSchema: { type: "object", properties: { content: { type: "string" } }, required: ["content"] } },
  { name: "get_messages", description: "获取用户发来的消息", inputSchema: { type: "object", properties: {} } },
  { name: "checkin", description: "每日签到写信奖励", inputSchema: { type: "object", properties: {} } }
];

async function handleToolCall(name, args) {
  if (name === "send_message") return await callApi("/ai/send", { content: args.content });
  if (name === "write_letter") return await callApi("/ai/letter", { subject: args.subject, body: args.body });
  if (name === "broadcast") return await callApi("/ai/broadcast", { content: args.content });
  if (name === "get_messages") return await callApiGet("/ai/messages");
  if (name === "checkin") return await callApi("/ai/checkin", {});
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
        serverInfo: { name: "beside-you", version: "1.0.0" }
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