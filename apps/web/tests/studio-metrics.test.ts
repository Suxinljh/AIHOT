// The metrics page against a synthetic api: rates, costs and the "—" empty-value rule.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { startWebServer, type WebServer } from "./web-server.ts";

const SESSION = "aihot_admin=studio-metrics-test";
let web: WebServer;

const metrics = {
  from: "2026-04-01T00:00:00.000Z",
  to: "2026-05-01T00:00:00.000Z",
  topics: { created: 4, adopted: 1, adoptionRate: 0.25 },
  articles: { created: 2, done: 1, completionRate: 0.5, rewritten: 1, rewriteRate: 0.5 },
  collection: { items: 10 },
  cost: { total: 12.5, currency: "CNY", perArticle: 6.25, perHundredItems: 125, byPurpose: [{ purpose: "article_body", amount: 12.5, requests: 3 }] },
};

const empty = {
  from: metrics.from, to: metrics.to,
  topics: { created: 0, adopted: 0, adoptionRate: null },
  articles: { created: 0, done: 0, completionRate: null, rewritten: 0, rewriteRate: null },
  collection: { items: 0 },
  cost: { total: null, currency: null, perArticle: null, perHundredItems: null, byPurpose: [] },
};

const api = createServer((req, res) => {
  const url = new URL(req.url!, "http://api.local");
  res.setHeader("Content-Type", "application/json");
  if (url.pathname === "/api/site/meta") return res.end(JSON.stringify({ changelogVersion: null }));
  if (url.pathname === "/api/studio/me") {
    if (req.headers.cookie?.includes(SESSION)) return res.end(JSON.stringify({ name: "Studio test", csrf: "dev", dev: false }));
    res.statusCode = 401;
    return res.end(JSON.stringify({ detail: "Sign in to the studio first." }));
  }
  if (url.pathname === "/api/studio/metrics") {
    if (!req.headers.cookie?.includes(SESSION)) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ detail: "Sign in to the studio first." }));
    }
    return res.end(JSON.stringify(url.searchParams.get("days") === "90" ? empty : metrics));
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ code: "not_found" }));
});

before(async () => { web = await startWebServer(api); });
after(() => web.stop());

test("the metrics page shows rates, costs and their denominators", async () => {
  const response = await fetch(`${web.origin}/metrics?days=30`, { headers: { cookie: SESSION } });
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const text of ["内容与成本", "选题采纳率", "草稿完成率", "人工改写率", "单篇模型成本", "每百条采集成本", "1 / 4 个选题已生成稿件", "6.25 CNY"]) {
    assert.ok(html.includes(text), text);
  }
  assert.match(html, /<title>内容与成本 · WeChatHot Studio<\/title>/);
});

test("an empty range says so and does not print zeros as results", async () => {
  const response = await fetch(`${web.origin}/metrics?days=90`, { headers: { cookie: SESSION } });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes("这个时间段还没有数据"));
  assert.ok(!html.includes(">0<"), "an empty range is not a row of zeros");
});
