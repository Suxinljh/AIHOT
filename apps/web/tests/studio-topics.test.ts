// The pitch board and a topic's page against a synthetic api: the production web server, no database
// and no model calls. Run after `npm run build -w @aihot/web`.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { startWebServer, type WebServer } from "./web-server.ts";

const SESSION = "aihot_admin=studio-topics-test";
let web: WebServer;

const topic = {
  id: 11,
  storyId: 42,
  publicId: "11111111-2222-3333-4444-555555555555",
  eventTitle: "OpenAI 发布新模型",
  angle: "从开发者视角看这次 API 变更",
  columnType: "insight",
  status: "ready",
  notes: "记得问官方价格",
  snapshot: {
    title: "OpenAI 发布新模型",
    summary: "官方公布了新模型的价格和上下文长度。",
    categories: ["ai-models"],
    brands: ["openai"],
    score: 78,
    capturedAt: "2026-05-01T10:00:00.000Z",
    reports: [{
      id: "a-1",
      title: "OpenAI 发布新模型",
      summary: "官方发布",
      source: "OpenAI 官网",
      url: "https://example.org/a1",
      tier: "T1",
      publishedAt: "2026-05-01T09:00:00.000Z",
    }],
  },
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-01T11:00:00.000Z",
  event: {
    publicId: "11111111-2222-3333-4444-555555555555",
    title: "OpenAI 发布新模型",
    verificationStatus: "confirmed",
    heat: 82.5,
    recommendationScore: 78,
    latestAt: "2026-05-01T11:30:00.000Z",
  },
};

const api = createServer((req, res) => {
  const url = new URL(req.url!, "http://api.local");
  res.setHeader("Content-Type", "application/json");
  if (url.pathname === "/api/site/meta") return res.end(JSON.stringify({ changelogVersion: null }));
  if (url.pathname === "/api/studio/me") {
    if (req.headers.cookie?.includes(SESSION)) return res.end(JSON.stringify({ name: "Studio test", csrf: "studio-test-csrf", dev: false }));
    res.statusCode = 401;
    return res.end(JSON.stringify({ detail: "Sign in to the studio first." }));
  }
  if (url.pathname === "/api/studio/presets") {
    if (!req.headers.cookie?.includes(SESSION)) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ detail: "Sign in to the studio first." }));
    }
    return res.end(JSON.stringify({ writing: [{ id: "writing-insight", kind: "writing", name: "行业洞察", columnType: "insight", targetReader: "科技从业者", wordCount: 2200, tone: "克制", titlePreference: "用判断做标题", forbiddenExpressions: [], format: {}, builtin: true }], format: [] }));
  }
  if (url.pathname === "/api/studio/topics" || url.pathname === `/api/studio/topics/${topic.id}`) {
    if (!req.headers.cookie?.includes(SESSION)) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ detail: "Sign in to the studio first." }));
    }
    if (url.pathname === "/api/studio/topics") return res.end(JSON.stringify({ items: [topic] }));
    return res.end(JSON.stringify(topic));
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ code: "not_found" }));
});

before(async () => { web = await startWebServer(api); });
after(() => web.stop());

test("the board shows the topics in their columns", async () => {
  const response = await fetch(`${web.origin}/topics`, { headers: { cookie: SESSION } });
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const text of ["选题管理", "待评估", "待研究", "待写作", "写作中", "已完成", "从开发者视角看这次 API 变更", "洞察"]) {
    assert.ok(html.includes(text), text);
  }
  assert.match(html, /<title>选题管理 · WeChatHot Studio<\/title>/);
});

test("a topic's page shows the angle, the snapshot and the event", async () => {
  const response = await fetch(`${web.origin}/topics/${topic.id}`, { headers: { cookie: SESSION } });
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const text of ["角度与备注", "来源快照", "OpenAI 官网", "刷新快照", "记得问官方"]) assert.ok(html.includes(text), text);
  assert.match(html, /<title>选题详情 · WeChatHot Studio<\/title>/);
});
