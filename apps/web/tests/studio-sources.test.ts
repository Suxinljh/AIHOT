// The studio's source page against a synthetic api: the production web server, no database and no
// model calls. Run after `npm run build -w @aihot/web`.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { startWebServer, type WebServer } from "./web-server.ts";

const SESSION = "aihot_admin=studio-sources-test";
let web: WebServer;

const row = {
  id: "openai-news",
  name: "OpenAI News",
  kind: "rss",
  tier: "T1",
  participation_mode: "editorial",
  enabled: true,
  health: "ok",
  fail_count: 0,
  interval_minutes: 30,
  last_ok_at: "2026-05-01T09:00:00.000Z",
  last_fetch_at: "2026-05-01T09:00:00.000Z",
  last_error: null,
  first_party: true,
  next_fetch_at: "2026-05-01T09:30:00.000Z",
  items_7d: 12,
  selected_30d: 4,
  updated_at: "2026-05-01T08:00:00.000Z",
};

const mpRow = {
  ...row,
  id: "mp-account",
  name: "公众号",
  kind: "mp_account",
  tier: "T2",
  first_party: false,
  health: "failing",
  fail_count: 3,
  last_error: "极致了接口返回 429，触发限流",
  updated_at: "2026-05-01T08:00:00.000Z",
};

const list = {
  page: 1,
  rows: [mpRow, row],
  totals: { total: 2, enabled: 2, failing: 1, degraded: 0 },
};

const detail = {
  source: { ...row, config: { feedUrl: "https://openai.com/news/rss.xml" }, tags: [], owner_entity_id: "openai", signal_group_id: null, site_fulltext: false, syndicate_fulltext: false, updated_at: row.updated_at },
  runs: [{ id: 1, started_at: "2026-05-01T09:00:00.000Z", finished_at: "2026-05-01T09:00:05.000Z", status: "ok", found_count: 3, new_count: 1, error: null, detail: null }],
  items: [{ id: "a-1", title: "OpenAI 发布新模型", url: "https://example.org/a1", discovered_at: "2026-05-01T09:00:00.000Z", published_at: "2026-05-01T08:00:00.000Z", processing_state: "done", selected: true, visibility: "public", title_zh: "OpenAI 发布新模型" }],
  stats: { total: 120, last7d: 12, selected: 4 },
  history: [],
  republish: null,
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
  if (url.pathname === "/api/admin/sources" || url.pathname === "/api/admin/sources/") {
    if (!req.headers.cookie?.includes(SESSION)) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ detail: "Sign in to the studio first." }));
    }
    return res.end(JSON.stringify(list));
  }
  if (url.pathname === `/api/admin/sources/${row.id}`) {
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

test("the source list shows health, errors and the paid and limited states", async () => {
  const response = await fetch(`${web.origin}/studio/sources`, { headers: { cookie: SESSION } });
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const text of [
    "关注与信源",
    "OpenAI News",
    "正常",
    "上次成功",
    "上次抓取",
    "7 天条目",
    "按请求计费",
    "极致了接口返回 429，触发限流",
    "失败",
    "次",
    "重试抓取",
    "立即抓取",
    "打开品牌库",
  ]) assert.ok(html.includes(text), text);
});

test("a source's own page shows its runs and its items", async () => {
  const response = await fetch(`${web.origin}/studio/sources/${row.id}`, { headers: { cookie: SESSION } });
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const text of ["信源详情", "最近抓取记录", "最近条目", "OpenAI 发布新模型", "发现", "新增"]) assert.ok(html.includes(text), text);
  assert.match(html, /<title>信源详情 · WeChatHot Studio<\/title>/);
});
