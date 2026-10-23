// The private event page against a synthetic api: the production web server, no database and no
// model calls. Run after `npm run build -w @aihot/web`.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { startWebServer, type WebServer } from "./web-server.ts";

const SESSION = "aihot_admin=studio-event-test";
const PUBLIC_ID = "11111111-2222-3333-4444-555555555555";
let web: WebServer;

const detail = {
  publicId: PUBLIC_ID,
  storyId: 42,
  title: "OpenAI 发布新一代推理模型",
  status: "active",
  summary: "官方公布了新模型的价格和上下文长度。",
  digest: "OpenAI 在发布会中介绍了新模型的推理能力、价格和开放方式。",
  digestUpdatedAt: "2026-05-01T11:00:00.000Z",
  excerpt: null,
  latest: "新模型上线 API",
  firstReportAt: "2026-05-01T09:00:00.000Z",
  latestAt: "2026-05-01T11:30:00.000Z",
  reportCount: 2,
  sourceCount: 2,
  primarySource: "OpenAI 官网",
  categories: ["ai-models"],
  brands: [{ id: "openai", name: "OpenAI", followed: true }],
  channelTypes: ["official_site", "media"],
  sourceTiers: ["T1", "T2"],
  eventType: "模型发布",
  verificationStatus: "confirmed",
  updated: true,
  heat: 82.5,
  newsValue: 91,
  recommendation: { score: 78, dims: { importance: 80, novelty: 75 }, reason: "官方首发，信息完整", missing: ["第三方评测"], scoredAt: "2026-05-01T11:40:00.000Z", column: "news", confidence: "medium", angles: ["从价格变化看性价比"] },
  facts: [{ factId: "f-1", title: "新模型正式发布", firstReportAt: "2026-05-01T09:00:00.000Z", reportCount: 2, representative: { id: "a-1", title: "OpenAI 发布新模型", summary: "摘要", url: "https://example.org/a1", source: { name: "OpenAI 官网", firstParty: true }, publishedAt: "2026-05-01T09:00:00.000Z", selected: true } }],
  timeline: [
    { id: "a-2", title: "媒体解读新模型", summary: "第三方解读", url: "https://example.org/a2", source: { name: "科技媒体", firstParty: false }, publishedAt: "2026-05-01T11:30:00.000Z", selected: false },
    { id: "a-1", title: "OpenAI 发布新模型", summary: "官方发布", url: "https://example.org/a1", source: { name: "OpenAI 官网", firstParty: true }, publishedAt: "2026-05-01T09:00:00.000Z", selected: true },
  ],
  officialReports: [],
  heatSeries: [],
  whyHot: { participants48h: 4, newParticipants6h: 1, recentReports24h: 2, observationComplete: true, rank: 3 },
  state: { read: true, starred: false, ignored: false, followUp: false, manualDecision: null, decidedAt: null },
  pitches: [],
  pitchCount: 0,
  followed: true,
  mergedFrom: null,
};

const api = createServer((req, res) => {
  const url = new URL(req.url!, "http://api.local");
  res.setHeader("Content-Type", "application/json");
  if (url.pathname === "/api/site/meta") return res.end(JSON.stringify({ changelogVersion: null }));
  if (url.pathname === "/api/auth/options") return res.end(JSON.stringify({ password: true, feishu: false }));
  if (url.pathname === "/api/studio/me") {
    if (req.headers.cookie?.includes(SESSION)) return res.end(JSON.stringify({ name: "Studio test", csrf: "studio-test-csrf", dev: false }));
    res.statusCode = 401;
    return res.end(JSON.stringify({ detail: "Sign in to the studio first." }));
  }
  if (url.pathname === `/api/studio/events/${PUBLIC_ID}`) {
    if (!req.headers.cookie?.includes(SESSION)) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ detail: "Sign in to the studio first." }));
    }
    return res.end(JSON.stringify(detail));
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ code: "not_found" }));
});

before(async () => { web = await startWebServer(api); });
after(() => web.stop());

test("the event page shows the evidence, the scores and the editor's own state", async () => {
  const response = await fetch(`${web.origin}/events/${PUBLIC_ID}`, { headers: { cookie: SESSION } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  const html = await response.text();
  for (const text of [
    "OpenAI 发布新一代推理模型",
    "OpenAI 在发布会中介绍了新模型的推理能力",
    "OpenAI 官网",
    "模型发布",
    "已确认",
    "已更新",
    "媒体解读新模型",
    "新模型正式发布",
    "78",
    "82.5",
    "91",
    "官方首发，信息完整",
    "第三方评测",
    "标为未读",
    "收藏",
    "忽略",
    "关注后续",
    "推荐",
  ]) assert.ok(html.includes(text), text);
  assert.match(html, /<title>事件详情 · WeChatHot Studio<\/title>/);
});

test("an unknown event shows the private empty state", async () => {
  const response = await fetch(`${web.origin}/events/99999999-9999-9999-9999-999999999999`, { headers: { cookie: SESSION } });
  assert.equal(response.status, 404);
  const html = await response.text();
  assert.ok(html.includes("这个事件不存在"));
  assert.ok(html.includes("回到热点发现"));
});
