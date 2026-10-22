// The studio's notification page against a synthetic api: the production web server, no database
// and no model calls. Run after `npm run build -w @aihot/web`.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { startWebServer, type WebServer } from "./web-server.ts";

const SESSION = "aihot_admin=studio-alerts-test";
let web: WebServer;

const alerts = {
  items: [
    {
      id: 1,
      kind: "new_event",
      status: "unread",
      reason: "全部更新｜关注品牌：OpenAI 发布新模型",
      createdAt: "2026-05-01T11:00:00.000Z",
      storyId: 42,
      storyPublicId: "11111111-2222-3333-4444-555555555555",
      storyTitle: "OpenAI 发布新模型",
      sourceId: null,
      sourceName: null,
      brandId: "openai",
      brandName: "OpenAI",
      ruleId: 3,
    },
    {
      id: 2,
      kind: "source_error",
      status: "unread",
      reason: "故障信源 连续失败 3 次：HTTP 503",
      createdAt: "2026-05-01T10:00:00.000Z",
      storyId: null,
      storyPublicId: null,
      storyTitle: null,
      sourceId: "rss-broken",
      sourceName: "故障信源",
      brandId: null,
      brandName: null,
      ruleId: null,
    },
  ],
  unread: 2,
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
  if (url.pathname === "/api/studio/alerts") {
    if (!req.headers.cookie?.includes(SESSION)) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ detail: "Sign in to the studio first." }));
    }
    return res.end(JSON.stringify(alerts));
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ code: "not_found" }));
});

before(async () => { web = await startWebServer(api); });
after(() => web.stop());

test("the notification page lists the alerts and links to the event and the source", async () => {
  const response = await fetch(`${web.origin}/studio/alerts`, { headers: { cookie: SESSION } });
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const text of ["通知", "新事件", "采集错误", "OpenAI 发布新模型", "HTTP 503", "标为已读", "静音", "全部标为已读"]) {
    assert.ok(html.includes(text), text);
  }
  assert.ok(html.includes("/studio/events/11111111-2222-3333-4444-555555555555"));
  assert.ok(html.includes("/studio/sources/rss-broken"));
  assert.match(html, /<title>通知 · WeChatHot Studio<\/title>/);
});
