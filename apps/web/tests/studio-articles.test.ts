// The drafts list against a synthetic api: the production web server, no database and no model calls.
// Run after `npm run build -w @aihot/web`.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { startWebServer, type WebServer } from "./web-server.ts";

const SESSION = "aihot_admin=studio-articles-test";
let web: WebServer;

const article = {
  id: 5,
  topicId: 11,
  type: "news",
  title: "OpenAI 发布新一代推理模型",
  status: "draft",
  mode: "step",
  angle: "从价格变化看",
  outline: [],
  content: { type: "doc", content: [] },
  titleOptions: [],
  droppedSources: [],
  stylePresetId: null,
  format: {},
  review: { items: [{ id: "r1", kind: "number", text: "10 美元" }], generatedAt: "2026-05-01T10:00:00.000Z" },
  writingState: null,
  version: 2,
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-01T11:00:00.000Z",
  topic: { id: 11, angle: "从价格变化看", publicId: "11111111-2222-3333-4444-555555555555" },
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
  if (url.pathname === "/api/studio/articles") {
    if (!req.headers.cookie?.includes(SESSION)) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ detail: "Sign in to the studio first." }));
    }
    const empty = url.searchParams.get("status") === "done";
    return res.end(JSON.stringify({ items: empty ? [] : [article] }));
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ code: "not_found" }));
});

before(async () => { web = await startWebServer(api); });
after(() => web.stop());

test("the drafts list links to the editor and shows its state", async () => {
  const response = await fetch(`${web.origin}/studio/articles`, { headers: { cookie: SESSION } });
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const text of ["我的文章", "OpenAI 发布新一代推理模型", "从价格变化看"]) {
    assert.ok(html.includes(text), text);
  }
  // React splits dynamic text with comment markers in SSR.
  assert.match(html, /第\s*(?:<!-- -->)?2\s*(?:<!-- -->)?\s*版/);
  assert.match(html, /审核\s*(?:<!-- -->)?1/);
  assert.ok(html.includes('href="/studio/articles/5"'), "the card opens the editor");
  assert.match(html, /<title>我的文章 · WeChatHot Studio<\/title>/);
});

test("an empty filter keeps its own empty state", async () => {
  const response = await fetch(`${web.origin}/studio/articles?status=done`, { headers: { cookie: SESSION } });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes("还没有文章"));
  assert.ok(html.includes("/studio/topics"));
});
