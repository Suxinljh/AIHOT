// The publishing calendar: topics and drafts planned for a month, and moving a plan to another day.
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
import type { StudioCalendar } from "../calendar.ts";
import type { StudioTopic } from "../studio-types.ts";

const T = tag();
const CSRF = "dev";
const originalDevAdmin = config.devAdmin;
let app: Awaited<ReturnType<typeof buildApp>>;
let topicId: number;
let articleId: number;

before(async () => {
  installModules([wechatHotServer]);
  config.devAdmin = { displayName: "WCH-31 calendar test" };
  app = await buildApp();
  const [story] = await sql<{ id: number }[]>`
    INSERT INTO stories (public_id, title, first_report_at, latest_at, created_at, updated_at)
    VALUES (${randomUUID()}, ${`${T} 排期事件`}, now(), now(), now(), now()) RETURNING id`;
  const [topic] = await sql<{ id: number }[]>`
    INSERT INTO wc_topics (story_id, angle, column_type, status, planned_for)
    VALUES (${story!.id}, ${`${T} 选题`}, 'news', 'pending', '2026-05-12T01:00:00Z') RETURNING id`;
  topicId = Number(topic!.id);
  const [article] = await sql<{ id: number }[]>`
    INSERT INTO wc_articles (topic_id, type, title, status, planned_for)
    VALUES (${topicId}, 'news', ${`${T} 稿件`}, 'draft', '2026-05-20T01:00:00Z') RETURNING id`;
  articleId = Number(article!.id);
});

after(async () => {
  await app.close();
  await stopBoss();
  config.devAdmin = originalDevAdmin;
  await closeDb();
});

async function api(method: "GET" | "PATCH", url: string, payload?: unknown) {
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

test("the calendar lists a month's topics and drafts", async () => {
  const response = await api("GET", "/api/studio/calendar?month=2026-05");
  assert.equal(response.statusCode, 200, response.body);
  const calendar = response.json() as StudioCalendar;
  assert.equal(calendar.month, "2026-05");
  assert.ok(calendar.topics.some((topic) => topic.id === topicId));
  assert.ok(calendar.articles.some((article) => article.id === articleId));

  const empty = (await api("GET", "/api/studio/calendar?month=2026-06")).json() as StudioCalendar;
  assert.equal(empty.topics.length, 0);
  assert.equal(empty.articles.length, 0);

  const bad = await api("GET", "/api/studio/calendar?month=2026-13");
  assert.equal(bad.statusCode, 400);
});

test("moving a plan changes the month it appears in without touching the content", async () => {
  const moved = await api("PATCH", `/api/studio/topics/${topicId}`, { plannedFor: "2026-06-03T01:00:00.000Z" });
  assert.equal(moved.statusCode, 200, moved.body);
  assert.equal((moved.json() as StudioTopic).plannedFor, "2026-06-03T01:00:00.000Z");

  const may = (await api("GET", "/api/studio/calendar?month=2026-05")).json() as StudioCalendar;
  assert.ok(!may.topics.some((topic) => topic.id === topicId));
  const june = (await api("GET", "/api/studio/calendar?month=2026-06")).json() as StudioCalendar;
  assert.ok(june.topics.some((topic) => topic.id === topicId));

  // Clearing the date removes it from every month.
  const cleared = await api("PATCH", `/api/studio/articles/${articleId}`, { plannedFor: null });
  assert.equal(cleared.statusCode, 200, cleared.body);
  assert.equal((cleared.json() as { plannedFor: string | null }).plannedFor, null);
  const after = (await api("GET", "/api/studio/calendar?month=2026-05")).json() as StudioCalendar;
  assert.ok(!after.articles.some((article) => article.id === articleId));
});
