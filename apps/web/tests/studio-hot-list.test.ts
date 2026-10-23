// The hot list page against a synthetic api: the production web server, no database and no model
// calls. Run after `npm run build -w @aihot/web`.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { startWebServer, type WebServer } from "./web-server.ts";

const SESSION = "aihot_admin=studio-hot-list-test";
let web: WebServer;
const seen: string[] = [];

const item = {
  storyId: 7,
  publicId: "22222222-3333-4444-5555-666666666666",
  title: "OpenAI 发布新一代推理模型",
  summary: "官方公布了新模型的价格和上下文长度。",
  categories: ["ai-models"],
  brands: [{ id: "openai", name: "OpenAI", followed: true }],
  channelTypes: ["official_site"],
  eventType: "模型发布",
  verificationStatus: "confirmed",
  updated: true,
  firstReportAt: "2026-05-01T09:00:00.000Z",
  latestAt: "2026-05-01T11:30:00.000Z",
  primarySource: "OpenAI 官网",
  reportCount: 3,
  sourceCount: 2,
  heat: 82.5,
  newsValue: 91,
  recommendationScore: 78,
  recommendationReason: "官方首发，信息完整",
  topicCount: 1,
  followed: true,
  state: { read: true, starred: false, ignored: false, followUp: false, manualDecision: null, decidedAt: null },
};

const list = {
  items: [item],
  page: 1,
  pageSize: 20,
  total: 1,
  totalPages: 1,
  scope: "curated",
  sort: "discovered",
  facets: {
    industries: [{ value: "ai-models", label: "AI 大模型", count: 1 }],
    brands: [{ id: "openai", name: "OpenAI", count: 1 }],
    channels: [{ value: "official_site", label: "官方网站", count: 1 }],
    eventTypes: [{ value: "模型发布", label: "模型发布", count: 1 }],
    sourceTiers: [{ value: "T1", label: "T1", count: 1 }],
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
  if (url.pathname === "/api/studio/events") {
    if (!req.headers.cookie?.includes(SESSION)) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ detail: "Sign in to the studio first." }));
    }
    seen.push(url.search);
    if (url.searchParams.get("empty") === "1") {
      return res.end(JSON.stringify({ ...list, items: [], total: 0, totalPages: 1 }));
    }
    if (url.searchParams.get("fail") === "1") {
      res.statusCode = 500;
      return res.end(JSON.stringify({ detail: "api 500" }));
    }
    return res.end(JSON.stringify(list));
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ code: "not_found" }));
});

before(async () => { web = await startWebServer(api); });
after(() => web.stop());

test("the list passes the url's filters to the api and shows the card", async () => {
  seen.length = 0;
  const response = await fetch(`${web.origin}/?industry=ai-models&sort=heat&scope=all&read=false&days=7`, { headers: { cookie: SESSION } });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(seen.some((search) => search.includes("industry=ai-models") && search.includes("sort=heat") && search.includes("scope=all")), seen.join(" | "));
  assert.ok(seen.some((search) => search.includes("read=false")), seen.join(" | "));
  // The page speaks in days; the api receives an absolute time.
  assert.ok(seen.some((search) => search.includes("from=")), seen.join(" | "));

  for (const text of [
    "OpenAI 发布新一代推理模型",
    "官方公布了新模型的价格和上下文长度",
    "OpenAI 官网",
    "模型发布",
    "已确认",
    "已更新",
    "个选题",
    "篇报道",
    "82.5",
    "91",
    "78",
    "全部事件",
    "有编辑价值",
  ]) assert.ok(html.includes(text), text);
  assert.match(html, /<title>热点发现 · WeChatHot Studio<\/title>/);
});

test("an empty result and a failing api both have their own state", async () => {
  const empty = await fetch(`${web.origin}/?empty=1`, { headers: { cookie: SESSION } });
  assert.equal(empty.status, 200);
  const emptyHtml = await empty.text();
  assert.ok(emptyHtml.includes("还没有可用的热点事件"));
  assert.ok(emptyHtml.includes("查看全部已采集事件"));

  const noMatch = await fetch(`${web.origin}/?empty=1&industry=ai-models`, { headers: { cookie: SESSION } });
  assert.equal(noMatch.status, 200);
  const noMatchHtml = await noMatch.text();
  assert.ok(noMatchHtml.includes("没有匹配的事件"));
  assert.ok(noMatchHtml.includes("清除筛选"));

  const failed = await fetch(`${web.origin}/?fail=1`, { headers: { cookie: SESSION } });
  assert.equal(failed.status, 503);
  const failedHtml = await failed.text();
  assert.ok(failedHtml.includes("热点列表加载失败"));
});
