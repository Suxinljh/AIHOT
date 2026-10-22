// Event detail API invariants: the detail carries the public evidence and the studio's private
// state, a merged event still opens and points at the survivor, unknown ids are 404, and the
// editor's own decisions are written and audited.
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
import type { StudioEventDetail } from "../studio-types.ts";

const T = tag();
const CSRF = "dev";
const originalDevAdmin = config.devAdmin;
const NOW = new Date("2026-05-01T12:00:00Z");
const HOUR = 3600_000;
const official = `${T}-official`;
const media = `${T}-media`;
const brand = `brand-${T}`;
let app: Awaited<ReturnType<typeof buildApp>>;
let storyId: number;
let storyPublicId: string;
let mergedStoryId: number;
let mergedPublicId: string;

before(async () => {
  installModules([wechatHotServer]);
  config.devAdmin = { displayName: "WCH-8 detail test" };
  app = await buildApp();
  await sql`INSERT INTO sources (id, name, kind, config, tier, participation_mode, first_party, next_fetch_at) VALUES
    (${official}, '官方来源', 'rss', ${sql.json({ feedUrl: "https://openai.com/news/rss.xml" })}, 'T1', 'editorial', true, '2100-01-01'),
    (${media}, '媒体报道', 'rss', ${sql.json({ feedUrl: "https://example.com/feed.xml" })}, 'T2', 'editorial', false, '2100-01-01')`;
  await sql`INSERT INTO wc_brands (id, name) VALUES (${brand}, ${`示例品牌 ${T}`})`;
  await sql`INSERT INTO wc_follows (target_type, target_id) VALUES ('brand', ${brand})`;

  const [story] = await sql<{ id: number; public_id: string }[]>`
    INSERT INTO stories (public_id, title, summary, first_report_at, latest_at, created_at, updated_at)
    VALUES (${randomUUID()}, ${`${T} 事件详情`}, ${`${T} 事件摘要`}, ${new Date(NOW.getTime() - 3 * HOUR)}, ${NOW}, ${NOW}, ${NOW})
    RETURNING id, public_id::text`;
  storyId = Number(story!.id);
  storyPublicId = story!.public_id;

  const [fact] = await sql<{ id: number }[]>`
    INSERT INTO facts (public_id, story_id, title, subject, version)
    VALUES (${`${T}-fact`}, ${storyId}, ${`${T} 首次发布`}, 'OpenAI', 1)
    RETURNING id`;

  const article = async (id: string, sourceId: string, at: Date, selected: boolean, score: number) => {
    await sql`INSERT INTO articles (id, source_id, identity_key, url, title, discovered_at, timeline_at)
      VALUES (${id}, ${sourceId}, ${id}, ${`https://example.org/${id}`}, ${`${T} ${id}`}, ${at}, ${at})`;
    const [analysis] = await sql<{ id: number }[]>`
      INSERT INTO analyses (article_id, input_revision, origin, relevance, category, tags, subjects, title_zh, summary_zh, score, selected)
      VALUES (${id}, 1, 'rule', 'pass', 'ai-models', ${["模型发布"]}::text[], ${["OpenAI"]}::text[], ${`${T} ${id}`}, ${`${T} ${id} 摘要`}, ${score}, ${selected})
      RETURNING id`;
    await sql`INSERT INTO publications (
        article_id, analysis_id, revision, visibility, eligible, selected, title, summary, source_id, channel,
        first_party, url, discovered_at, timeline_at, published_at, sort_at, visible_after, tags, body_mode, score, category
      ) VALUES (
        ${id}, ${analysis!.id}, 1, 'public', true, ${selected}, ${`${T} ${id}`}, ${`${T} ${id} 摘要`}, ${sourceId},
        'news', ${sourceId === official}, ${`https://example.org/${id}`}, ${at}, ${at}, ${at}, ${at},
        ${selected ? at : null}, ${["模型发布"]}::text[], 'full', ${score}, 'ai-models'
      )`;
    await sql`INSERT INTO fact_articles (fact_id, article_id, role) VALUES (${fact!.id}, ${id}, 'report')`;
  };
  await article(`${T}-a1`, official, new Date(NOW.getTime() - 2 * HOUR), true, 90);
  await article(`${T}-a2`, media, new Date(NOW.getTime() - HOUR), false, 75);

  await sql`
    INSERT INTO wc_event_meta (
      story_id, summary, primary_source, categories, brand_ids, channel_types, source_tiers, event_type,
      verification_status, updated, first_report_at, latest_at, report_count, source_count, heat,
      news_value, selected_count, evidence_source_count, editorial_score, score_dims, score_reason, score_missing, scored_at
    ) VALUES (
      ${storyId}, ${`${T} 事件摘要`}, '官方来源', ${["ai-models"]}::text[], ${[brand]}::text[], ${["official_site", "media"]}::text[],
      ${["T1", "T2"]}::text[], '模型发布', 'confirmed', true, ${new Date(NOW.getTime() - 2 * HOUR)}, ${NOW},
      2, 2, 77.5, 88, 1, 2, 71.5, ${sql.json({ importance: 80, novelty: 60 })}::jsonb, '重要且新鲜', ${["资料不足"]}::text[], ${NOW}
    )`;
  await sql`INSERT INTO wc_event_brands (story_id, brand_id) VALUES (${storyId}, ${brand})`;
  await sql`INSERT INTO wc_event_states (story_id, read_at) VALUES (${storyId}, ${new Date(NOW.getTime() - HOUR)})`;
  await sql`INSERT INTO wc_topics (story_id, angle, status, column_type) VALUES (${storyId}, '从开发者视角看', 'researching', 'insight')`;

  const [merged] = await sql<{ id: number; public_id: string }[]>`
    INSERT INTO stories (public_id, title, first_report_at, latest_at, created_at, updated_at)
    VALUES (${randomUUID()}, ${`${T} 被合并的事件`}, ${NOW}, ${NOW}, ${NOW}, ${NOW})
    RETURNING id, public_id::text`;
  mergedStoryId = Number(merged!.id);
  mergedPublicId = merged!.public_id;
  await sql`UPDATE stories SET merged_into = ${storyId} WHERE id = ${mergedStoryId}`;
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

test("the detail needs an admin session and hides unknown events", async () => {
  const devAdmin = config.devAdmin;
  config.devAdmin = null;
  try {
    const guest = await app.inject({ method: "GET", url: `/api/studio/events/${storyPublicId}` });
    assert.equal(guest.statusCode, 401);
    assert.equal(guest.headers["cache-control"], "no-store");
  } finally {
    config.devAdmin = devAdmin;
  }

  const missing = await api("GET", `/api/studio/events/${randomUUID()}`);
  assert.equal(missing.statusCode, 404);
  const malformed = await api("GET", "/api/studio/events/not-a-uuid");
  assert.equal(malformed.statusCode, 404);
});

test("the detail carries the evidence, the projection and the private state", async () => {
  const response = await api("GET", `/api/studio/events/${storyPublicId}`);
  assert.equal(response.statusCode, 200, response.body);
  assert.equal(response.headers["cache-control"], "no-store");
  const detail = response.json() as StudioEventDetail;

  assert.equal(detail.publicId, storyPublicId);
  assert.equal(detail.storyId, storyId);
  assert.equal(detail.title, `${T} 事件详情`);
  assert.equal(detail.summary, `${T} 事件摘要`);
  assert.deepEqual(detail.categories, ["ai-models"]);
  assert.equal(detail.eventType, "模型发布");
  assert.equal(detail.verificationStatus, "confirmed");
  assert.equal(detail.updated, true);
  assert.equal(detail.heat, 77.5);
  assert.equal(detail.newsValue, 88);
  assert.equal(detail.primarySource, "官方来源");
  assert.deepEqual(detail.channelTypes, ["official_site", "media"]);
  assert.deepEqual(detail.sourceTiers, ["T1", "T2"]);
  assert.equal(detail.reportCount, 2);
  assert.equal(detail.sourceCount, 2);

  assert.equal(detail.recommendation?.score, 71.5);
  assert.equal(detail.recommendation?.reason, "重要且新鲜");
  assert.deepEqual(detail.recommendation?.dims, { importance: 80, novelty: 60 });
  assert.deepEqual(detail.recommendation?.missing, ["资料不足"]);

  assert.equal(detail.timeline.length, 2);
  assert.equal(detail.timeline[0]?.id, `${T}-a2`);
  assert.equal(detail.timeline[0]?.url, `https://example.org/${T}-a2`);
  assert.equal(detail.timeline[0]?.source.firstParty, false);
  assert.equal(detail.timeline[1]?.source.firstParty, true);
  assert.equal(detail.facts.length, 1);
  assert.equal(detail.facts[0]?.title, `${T} 首次发布`);
  assert.equal(detail.facts[0]?.reportCount, 2);

  assert.deepEqual(detail.brands.map((row) => [row.id, row.followed]), [[brand, true]]);
  assert.equal(detail.followed, true);
  assert.equal(detail.state.read, true);
  assert.equal(detail.state.starred, false);
  assert.equal(detail.pitchCount, 1);
  assert.equal(detail.pitches[0]?.angle, "从开发者视角看");
  assert.equal(detail.pitches[0]?.status, "researching");
  assert.equal(detail.mergedFrom, null);
});

test("a merged event still opens and points at the survivor", async () => {
  const response = await api("GET", `/api/studio/events/${mergedPublicId}`);
  assert.equal(response.statusCode, 200, response.body);
  const detail = response.json() as StudioEventDetail;
  assert.equal(detail.publicId, storyPublicId);
  assert.equal(detail.storyId, storyId);
  assert.equal(detail.mergedFrom, mergedPublicId);
  assert.equal(detail.timeline.length, 2);
  assert.equal(detail.state.read, true);
  assert.equal(detail.pitchCount, 1);
});

test("the editor's own decisions are written and audited", async () => {
  const starred = await api("PATCH", `/api/studio/events/${storyPublicId}/state`, { starred: true, followUp: true });
  assert.equal(starred.statusCode, 200, starred.body);
  const detail = starred.json() as StudioEventDetail;
  assert.equal(detail.state.starred, true);
  assert.equal(detail.state.followUp, true);
  assert.equal(detail.state.read, true);

  const [row] = await sql<{ starred_at: Date | null; follow_up: boolean; read_at: Date | null }[]>`
    SELECT starred_at, follow_up, read_at FROM wc_event_states WHERE story_id = ${storyId}`;
  assert.ok(row?.starred_at);
  assert.equal(row?.follow_up, true);
  assert.ok(row?.read_at);
  const [audit] = await sql<{ action: string; subject: string }[]>`
    SELECT action, subject FROM audit_log WHERE action = 'event.state' AND subject = ${`story:${storyId}`}`;
  assert.ok(audit);

  const decided = await api("PATCH", `/api/studio/events/${storyPublicId}/state`, { manualDecision: "recommend" });
  assert.equal(decided.statusCode, 200, decided.body);
  assert.equal((decided.json() as StudioEventDetail).state.manualDecision, "recommend");

  const cleared = await api("PATCH", `/api/studio/events/${storyPublicId}/state`, { starred: false, manualDecision: null });
  assert.equal((cleared.json() as StudioEventDetail).state.starred, false);
  assert.equal((cleared.json() as StudioEventDetail).state.manualDecision, null);

  const empty = await api("PATCH", `/api/studio/events/${storyPublicId}/state`, {});
  assert.equal(empty.statusCode, 400);
  const bad = await api("PATCH", `/api/studio/events/${storyPublicId}/state`, { unknown: true });
  assert.equal(bad.statusCode, 400);
  const missing = await api("PATCH", `/api/studio/events/${randomUUID()}/state`, { starred: true });
  assert.equal(missing.statusCode, 404);
});
