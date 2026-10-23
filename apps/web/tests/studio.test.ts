// The private studio shell against a synthetic api: the real production web server, no database and no
// model calls. Run after `npm run build -w @aihot/web`.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { startWebServer, type WebServer } from "./web-server.ts";

const SESSION = "aihot_admin=studio-test-session";
let web: WebServer;

const api = createServer((req, res) => {
  const url = new URL(req.url!, "http://api.local");
  res.setHeader("Content-Type", "application/json");
  if (url.pathname === "/api/site/meta") return res.end(JSON.stringify({ changelogVersion: null }));
  if (url.pathname === "/api/auth/options") return res.end(JSON.stringify({ password: true, feishu: false }));
  if (url.pathname === "/api/auth/login") {
    res.statusCode = 302;
    res.setHeader("Location", `/admin/login?return=${encodeURIComponent(url.searchParams.get("return") ?? "/studio")}`);
    return res.end();
  }
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
    return res.end(JSON.stringify({
      writing: [{
        id: "writing-news",
        kind: "writing",
        name: "科技快讯",
        columnType: "news",
        targetReader: "关注科技行业的公众号读者",
        wordCount: 1200,
        tone: "冷静、直接",
        titlePreference: "事实在前",
        forbiddenExpressions: ["震惊"],
        format: {},
        builtin: true,
      }],
      format: [{
        id: "format-wechat-default",
        kind: "format",
        name: "公众号默认",
        columnType: null,
        targetReader: null,
        wordCount: null,
        tone: null,
        titlePreference: null,
        forbiddenExpressions: [],
        format: {
          title: { fontSize: 22, fontWeight: 700, lineHeight: 1.35, marginBottom: 18, color: "#1a1a1a" },
          body: { fontSize: 16, lineHeight: 1.85, color: "#333333", letterSpacing: 0.5, paragraphSpacing: 16, align: "justify" },
          image: { borderRadius: 4 },
        },
        builtin: true,
      }],
    }));
  }
  if (url.pathname === "/api/studio/notify/settings") {
    if (!req.headers.cookie?.includes(SESSION)) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ detail: "Sign in to the studio first." }));
    }
    return res.end(JSON.stringify({
      settings: { immediate: true, digestHour: 9, minScore: null, eventTypes: [], channelTypes: [], feishu: false, email: false },
      targets: [{ key: "feishu-alerts", enabled: false }, { key: "email-alerts", enabled: false }],
    }));
  }
  if (url.pathname === "/api/studio/events") {
    if (!req.headers.cookie?.includes(SESSION)) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ detail: "Sign in to the studio first." }));
    }
    return res.end(JSON.stringify({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 1,
      scope: "curated",
      sort: "discovered",
      facets: { industries: [], brands: [], channels: [], eventTypes: [], sourceTiers: [] },
    }));
  }
  if (url.pathname === "/api/studio/topics") {
    if (!req.headers.cookie?.includes(SESSION)) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ detail: "Sign in to the studio first." }));
    }
    return res.end(JSON.stringify({ items: [] }));
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ code: "not_found" }));
});

before(async () => { web = await startWebServer(api); });
after(() => web.stop());

test("old /studio addresses redirect to the root routes", async () => {
  const old = await fetch(`${web.origin}/studio/topics?tab=research`, { redirect: "manual" });
  assert.equal(old.status, 302);
  assert.equal(old.headers.get("location"), "/topics?tab=research");
  await old.text();
  const entry = await fetch(`${web.origin}/studio`, { redirect: "manual" });
  assert.equal(entry.status, 302);
  assert.equal(entry.headers.get("location"), "/");
  await entry.text();
});

test("a guest is sent to sign in and comes back to the requested studio page", async () => {
  for (const path of ["/", "/topics?tab=research", "/sources"]) {
    const studio = await fetch(`${web.origin}${path}`, { redirect: "manual" });
    assert.equal(studio.status, 302, path);
    assert.match(studio.headers.get("location") ?? "", /^\/api\/auth\/login\?return=/);
    await studio.text();
  }

  const gate = await fetch(`${web.origin}/api/auth/login?return=%2Ftopics`, { redirect: "manual" });
  assert.equal(gate.status, 302);
  assert.equal(gate.headers.get("location"), "/admin/login?return=%2Ftopics");
  await gate.text();

  const login = await fetch(`${web.origin}/admin/login?return=%2Ftopics`);
  assert.equal(login.status, 200);
  assert.equal(login.headers.get("Cache-Control"), "private, no-store");
  assert.equal(login.headers.get("X-Robots-Tag"), "noindex, nofollow");
  const html = await login.text();
  assert.match(html, /name="return" value="\/topics"/);
});

test("signed-in studio pages are private and carry the workbench navigation", async () => {
  const studio = await fetch(`${web.origin}/`, { headers: { cookie: SESSION } });
  assert.equal(studio.status, 200);
  assert.equal(studio.headers.get("Cache-Control"), "private, no-store");
  assert.equal(studio.headers.get("X-Robots-Tag"), "noindex, nofollow");
  const html = await studio.text();
  assert.match(html, /<meta name="robots" content="noindex, nofollow"\/>/);
  for (const label of ["热点发现", "选题管理", "我的文章", "关注与信源", "设置", "还没有可用的热点事件"]) assert.ok(html.includes(label), label);
  assert.ok(html.includes('href="/alerts"'), "the top bar links to the notifications");

  const topics = await fetch(`${web.origin}/topics`, { headers: { cookie: SESSION } });
  assert.equal(topics.status, 200);
  assert.match(await topics.text(), /<title>选题管理 · WeChatHot Studio<\/title>/);
});

test("signed-in settings reads the built-in writing and formatting presets", async () => {
  const settings = await fetch(`${web.origin}/settings`, { headers: { cookie: SESSION } });
  assert.equal(settings.status, 200);
  assert.equal(settings.headers.get("Cache-Control"), "private, no-store");
  const html = await settings.text();
  for (const label of ["写作风格", "排版预设", "科技快讯", "公众号默认", "震惊"]) assert.ok(html.includes(label), label);
});
