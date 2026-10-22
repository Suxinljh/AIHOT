// The publishing calendar against a synthetic api: the production web server, no database.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { startWebServer, type WebServer } from "./web-server.ts";

const SESSION = "aihot_admin=studio-calendar-test";
let web: WebServer;

const calendar = {
  month: "2026-05",
  topics: [{
    id: 11, storyId: 42, publicId: null, eventTitle: "OpenAI 发布新模型", angle: "从开发者视角看",
    columnType: "news", status: "ready", notes: null, snapshot: null, writing: null,
    plannedFor: "2026-05-12T01:00:00.000Z", createdAt: "2026-05-01T10:00:00.000Z", updatedAt: "2026-05-01T11:00:00.000Z",
    stylePresetId: null, stylePreset: null, event: null,
  }],
  articles: [{
    id: 5, topicId: 11, type: "news", title: "OpenAI 新模型观察", status: "draft", mode: "step", angle: null,
    outline: [], content: { type: "doc", content: [] }, titleOptions: [], droppedSources: [], stylePresetId: null,
    format: {}, review: { items: [], generatedAt: null }, plannedFor: "2026-05-20T01:00:00.000Z", writingState: null,
    version: 1, createdAt: "2026-05-01T10:00:00.000Z", updatedAt: "2026-05-01T11:00:00.000Z", topic: null,
  }],
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
  if (url.pathname === "/api/studio/calendar") {
    if (!req.headers.cookie?.includes(SESSION)) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ detail: "Sign in to the studio first." }));
    }
    const month = url.searchParams.get("month") ?? calendar.month;
    return res.end(JSON.stringify(month === "2026-05" ? calendar : { month, topics: [], articles: [] }));
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ code: "not_found" }));
});

before(async () => { web = await startWebServer(api); });
after(() => web.stop());

test("the calendar places a topic and a draft on their planned days", async () => {
  const response = await fetch(`${web.origin}/studio/calendar?month=2026-05`, { headers: { cookie: SESSION } });
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const text of ["发布日历", "OpenAI 发布新模型", "OpenAI 新模型观察", "2026-05", "上一月", "下一月"]) {
    assert.ok(html.includes(text), text);
  }
  assert.ok(html.includes('href="/studio/topics/11"'));
  assert.ok(html.includes('href="/studio/articles/5"'));
  assert.match(html, /value="2026-05-12"/);
  assert.match(html, /<title>发布日历 · WeChatHot Studio<\/title>/);
});

test("an empty month says so and keeps the navigation usable", async () => {
  const response = await fetch(`${web.origin}/studio/calendar?month=2026-07`, { headers: { cookie: SESSION } });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes("这个月还没有排期"));
  assert.ok(html.includes("/studio/topics"));
});
