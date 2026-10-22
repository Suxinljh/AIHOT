// The pitch board: a topic is created from an event with its evidence frozen, a second topic for the
// same event asks first, the status only moves along the pipeline, and a later report never rewrites
// a topic's snapshot unless the editor refreshes it.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { tag } from "../../../tests/setup.ts";
import { config } from "@aihot/backend/config";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { installModules } from "@aihot/backend/modules";
import { buildApp } from "../../../apps/api/src/app.ts";
import { wechatHotServer } from "../server.ts";
import type { StudioTopic, TopicSnapshot } from "../studio-types.ts";

const T = tag();
const CSRF = "dev";
const originalDevAdmin = config.devAdmin;
const NOW = new Date("2026-05-01T12:00:00Z");
let app: Awaited<ReturnType<typeof buildApp>>;
let storyId: number;
let sourceId: string;

before(async () => {
  installModules([wechatHotServer]);
  config.devAdmin = { displayName: "WCH-17 topics test" };
  app = await buildApp();
  sourceId = `${T}-source`;
  await sql`INSERT INTO sources (id, name, kind, config, tier, participation_mode, first_party, next_fetch_at) VALUES
    (${sourceId}, '官网信源', 'rss', ${sql.json({ feedUrl: "https://example.com/feed.xml" })}, 'T1', 'editorial', true, '2100-01-01')`;
  const [story] = await sql<{ id: number }[]>`
    INSERT INTO stories (public_id, title, summary, first_report_at, latest_at, created_at, updated_at)
    VALUES (${randomUUID()}, ${`${T} 可写事件`}, ${`${T} 事件摘要`}, ${NOW}, ${NOW}, ${NOW}, ${NOW})
    RETURNING id`;
  storyId = Number(story!.id);
  await sql`
    INSERT INTO wc_event_meta (story_id, summary, categories, brand_ids, channel_types, source_tiers, event_type,
      verification_status, updated, first_report_at, latest_at, report_count, source_count, heat, news_value,
      selected_count, evidence_source_count, editorial_score)
    VALUES (${storyId}, ${`${T} 事件摘要`}, ${["ai-models"]}::text[], ${["openai"]}::text[], ${["official_site"]}::text[],
      ${["T1"]}::text[], '模型发布', 'confirmed', false, ${NOW}, ${NOW}, 1, 1, 70, 80, 1, 1, 66)`;
  const [fact] = await sql<{ id: number }[]>`
    INSERT INTO facts (public_id, story_id, title, subject, version)
    VALUES (${`${T}-fact`}, ${storyId}, ${`${T} 首次发布`}, 'OpenAI', 1)
    RETURNING id`;
  const articleId = `${T}-article-1`;
  await sql`INSERT INTO articles (id, source_id, identity_key, url, title, discovered_at, timeline_at)
    VALUES (${articleId}, ${sourceId}, ${articleId}, ${`https://example.org/${articleId}`}, ${`${T} 首篇报道`}, ${NOW}, ${NOW})`;
  await sql`INSERT INTO publications (
      article_id, revision, visibility, eligible, selected, title, summary, source_id, channel,
      first_party, url, discovered_at, timeline_at, published_at, sort_at, visible_after, tags, body_mode, score, category
    ) VALUES (
      ${articleId}, 1, 'public', true, true, ${`${T} 首篇报道`}, ${`${T} 首篇报道 摘要`}, ${sourceId}, 'news', true,
      ${`https://example.org/${articleId}`}, ${NOW}, ${NOW}, ${NOW}, ${NOW}, ${NOW}, ${["模型发布"]}::text[], 'full', 80, 'ai-models'
    )`;
  await sql`INSERT INTO fact_articles (fact_id, article_id, role) VALUES (${fact!.id}, ${articleId}, 'report')`;
});

after(async () => {
  await app.close();
  await stopBoss();
  config.devAdmin = originalDevAdmin;
  await closeDb();
});

async function api(method: "GET" | "POST" | "PATCH", url: string, payload?: unknown) {
  return app.inject({
    method,
    url,
    ...(payload === undefined ? {} : { payload: payload as never }),
    headers: {
      ...(payload === undefined ? {} : { "content-type": "application/json" }),
      ...(method === "GET" ? {} : { "x-csrf-token": CSRF }),
    },
  });
}

test("a topic is created from an event with its evidence frozen", async () => {
  const created = await api("POST", "/api/studio/topics", { storyId, angle: "从开发者视角看", columnType: "insight" });
  assert.equal(created.statusCode, 201, created.body);
  const topic = created.json() as StudioTopic;
  assert.equal(topic.storyId, storyId);
  assert.equal(topic.angle, "从开发者视角看");
  assert.equal(topic.columnType, "insight");
  assert.equal(topic.status, "pending");
  const snapshot = topic.snapshot as TopicSnapshot;
  assert.equal(snapshot.title, `${T} 可写事件`);
  assert.equal(snapshot.reports.length, 1);
  assert.equal(snapshot.reports[0]?.source, "官网信源");
  assert.equal(snapshot.score, 66);
  assert.ok(snapshot.capturedAt);

  const [audit] = await sql<{ action: string; subject: string }[]>`
    SELECT action, subject FROM audit_log WHERE action = 'topic.create' AND subject = ${`topic:${topic.id}`}`;
  assert.ok(audit);
});

test("a second topic for the same event asks first", async () => {
  const conflict = await api("POST", "/api/studio/topics", { storyId, angle: "另一个角度" });
  assert.equal(conflict.statusCode, 409);
  const body = conflict.json() as { detail: string; existing: StudioTopic[] };
  assert.match(body.detail, /已经有选题/);
  assert.equal(body.existing.length, 1);

  const forced = await api("POST", "/api/studio/topics", { storyId, angle: "另一个角度", force: true });
  assert.equal(forced.statusCode, 201, forced.body);
  const topics = await api("GET", `/api/studio/topics?storyId=${storyId}`);
  assert.equal((topics.json() as { items: StudioTopic[] }).items.length, 2);
});

test("a topic only moves along the pipeline", async () => {
  const created = await api("POST", "/api/studio/topics", { storyId, angle: "流转用", force: true });
  const topic = (created.json() as StudioTopic);
  for (const status of ["researching", "ready", "writing", "done"] as const) {
    const moved = await api("PATCH", `/api/studio/topics/${topic.id}`, { status });
    assert.equal(moved.statusCode, 200, moved.body);
    assert.equal((moved.json() as StudioTopic).status, status);
  }
  const skipped = await api("PATCH", `/api/studio/topics/${topic.id}`, { status: "researching" });
  assert.equal(skipped.statusCode, 400, "已完成不能直接回到待研究");
  const missing = await api("PATCH", "/api/studio/topics/999999", { status: "pending" });
  assert.equal(missing.statusCode, 404);
});

test("the angle, the column and the notes are editable", async () => {
  const created = await api("POST", "/api/studio/topics", { storyId, angle: "初稿", force: true });
  const topic = (created.json() as StudioTopic);
  const edited = await api("PATCH", `/api/studio/topics/${topic.id}`, { angle: "改过的角度", columnType: "news", notes: "记得问官方" });
  assert.equal(edited.statusCode, 200, edited.body);
  const after = edited.json() as StudioTopic;
  assert.equal(after.angle, "改过的角度");
  assert.equal(after.columnType, "news");
  assert.equal(after.notes, "记得问官方");
  assert.equal(after.snapshot?.title, `${T} 可写事件`, "editing does not touch the snapshot");
});

test("a later report does not rewrite a topic, and a refresh takes the evidence again", async () => {
  const created = await api("POST", "/api/studio/topics", { storyId, angle: "快照用", force: true });
  const topic = (created.json() as StudioTopic);
  const articleId = `${T}-article-2`;
  const at = new Date(NOW.getTime() + 3600_000);
  await sql`INSERT INTO articles (id, source_id, identity_key, url, title, discovered_at, timeline_at)
    VALUES (${articleId}, ${sourceId}, ${articleId}, ${`https://example.org/${articleId}`}, ${`${T} 后续报道`}, ${at}, ${at})`;
  await sql`INSERT INTO publications (
      article_id, revision, visibility, eligible, selected, title, summary, source_id, channel,
      first_party, url, discovered_at, timeline_at, published_at, sort_at, visible_after, tags, body_mode, score, category
    ) VALUES (
      ${articleId}, 1, 'public', true, true, ${`${T} 后续报道`}, ${`${T} 后续报道 摘要`}, ${sourceId}, 'news', true,
      ${`https://example.org/${articleId}`}, ${at}, ${at}, ${at}, ${at}, ${at}, ${["模型发布"]}::text[], 'full', 70, 'ai-models'
    )`;
  await sql`INSERT INTO fact_articles (fact_id, article_id, role)
    SELECT id, ${articleId}, 'report' FROM facts WHERE story_id = ${storyId}`;

  const unchanged = await api("GET", `/api/studio/topics/${topic.id}`);
  assert.equal((unchanged.json() as StudioTopic).snapshot?.reports.length, 1, "the snapshot keeps the evidence of its own time");

  const refreshed = await api("POST", `/api/studio/topics/${topic.id}/refresh-snapshot`, {});
  assert.equal(refreshed.statusCode, 200, refreshed.body);
  assert.equal((refreshed.json() as StudioTopic).snapshot?.reports.length, 2);
});

test("the list filters by status, by column and by the text", async () => {
  const all = await api("GET", "/api/studio/topics");
  const items = (all.json() as { items: StudioTopic[] }).items;
  assert.ok(items.length >= 3);

  const pending = await api("GET", "/api/studio/topics?status=pending");
  assert.ok((pending.json() as { items: StudioTopic[] }).items.every((topic) => topic.status === "pending"));

  const insights = await api("GET", "/api/studio/topics?columnType=insight");
  assert.ok((insights.json() as { items: StudioTopic[] }).items.every((topic) => topic.columnType === "insight"));

  const found = await api("GET", `/api/studio/topics?q=${encodeURIComponent("另一个角度")}`);
  assert.equal((found.json() as { items: StudioTopic[] }).items.length, 1);

  const bad = await api("GET", "/api/studio/topics?status=unknown");
  assert.equal(bad.statusCode, 400);
});

test("the topic endpoints need a session and a CSRF token", async () => {
  const devAdmin = config.devAdmin;
  config.devAdmin = null;
  try {
    const guest = await app.inject({ method: "GET", url: "/api/studio/topics" });
    assert.equal(guest.statusCode, 401);
  } finally {
    config.devAdmin = devAdmin;
  }
  const noCsrf = await app.inject({
    method: "POST",
    url: "/api/studio/topics",
    payload: { storyId },
    headers: { "content-type": "application/json" },
  });
  assert.equal(noCsrf.statusCode, 403);
});
