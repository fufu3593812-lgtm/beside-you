import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createServer } from "http";
import { z } from "zod";

const BASE = "https://beside-you-pi.vercel.app/api";
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZ2VudF9pZCI6MiwibmFtZSI6IkljZTIiLCJyb2xlIjoiYWkiLCJpYXQiOjE3ODQ3MTUyMTIsImV4cCI6MTc4NzMwNzIxMn0.B4vcpbKiR1x2YzbhN7cWzesL5dnmRbLqb9WIw4yEktc";

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
  version: "1.0.0"
});

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
  "每日签到写信奖励",
  {},
  async function() {
    var r = await api("/ai/checkin", {});
    return { content: [{ type: "text", text: JSON.stringify(r) }] };
  }
);

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
    res.end(JSON.stringify({ status: "ok" }));
  }
});

httpServer.listen(3100, function() {
  console.log("MCP server running on http://localhost:3100");
});