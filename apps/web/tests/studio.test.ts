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
  res.statusCode = 404;
  res.end(JSON.stringify({ code: "not_found" }));
});

before(async () => { web = await startWebServer(api); });
after(() => web.stop());

test("the product entry redirects to the studio", async () => {
  const home = await fetch(`${web.origin}/`, { redirect: "manual" });
  assert.equal(home.status, 302);
  assert.equal(home.headers.get("location"), "/studio");
  await home.text();
});

test("a guest is sent to sign in and comes back to the requested studio page", async () => {
  for (const path of ["/studio", "/studio/topics?tab=research", "/studio/sources"]) {
    const studio = await fetch(`${web.origin}${path}`, { redirect: "manual" });
    assert.equal(studio.status, 302, path);
    assert.match(studio.headers.get("location") ?? "", /^\/api\/auth\/login\?return=/);
    await studio.text();
  }

  const gate = await fetch(`${web.origin}/api/auth/login?return=%2Fstudio%2Ftopics`, { redirect: "manual" });
  assert.equal(gate.status, 302);
  assert.equal(gate.headers.get("location"), "/admin/login?return=%2Fstudio%2Ftopics");
  await gate.text();

  const login = await fetch(`${web.origin}/admin/login?return=%2Fstudio%2Ftopics`);
  assert.equal(login.status, 200);
  assert.equal(login.headers.get("Cache-Control"), "private, no-store");
  assert.equal(login.headers.get("X-Robots-Tag"), "noindex, nofollow");
  const html = await login.text();
  assert.match(html, /name="return" value="\/studio\/topics"/);
});

test("signed-in studio pages are private and carry the workbench navigation", async () => {
  const studio = await fetch(`${web.origin}/studio`, { headers: { cookie: SESSION } });
  assert.equal(studio.status, 200);
  assert.equal(studio.headers.get("Cache-Control"), "private, no-store");
  assert.equal(studio.headers.get("X-Robots-Tag"), "noindex, nofollow");
  const html = await studio.text();
  assert.match(html, /<meta name="robots" content="noindex, nofollow"\/>/);
  for (const label of ["热点发现", "选题管理", "我的文章", "关注与信源", "设置", "还没有可用的热点事件"]) assert.ok(html.includes(label), label);

  const topics = await fetch(`${web.origin}/studio/topics`, { headers: { cookie: SESSION } });
  assert.equal(topics.status, 200);
  assert.match(await topics.text(), /<title>选题管理 · WeChatHot Studio<\/title>/);
});
