// The event-level topic score: the code weighs the model's dimensions, the same evidence is never
// scored twice, a person's own judgement is never overwritten, and a failed call leaves the event
// unscored instead of breaking the list.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { tag } from "../../../tests/setup.ts";
import { closeDb, sql } from "@aihot/backend/db";
import { scoreCandidateEvents, scoreFingerprint, weightedScore, type ScoreDimensions } from "../scoring.ts";

const T = tag();
const NOW = new Date("2026-05-01T12:00:00Z");

before(async () => {
  await sql`INSERT INTO sources (id, name, kind, config, tier, participation_mode, first_party, next_fetch_at) VALUES
    (${`${T}-source`}, '官网信源', 'rss', ${sql.json({ feedUrl: "https://example.com/feed.xml" })}, 'T1', 'editorial', true, '2100-01-01')`;
});

after(closeDb);

async function event(options: { title: string; curated?: boolean; at?: Date; manual?: boolean }): Promise<number> {
  const at = options.at ?? NOW;
  const [story] = await sql<{ id: number }[]>`
    INSERT INTO stories (public_id, title, first_report_at, latest_at, created_at, updated_at)
    VALUES (${randomUUID()}, ${options.title}, ${at}, ${at}, ${at}, ${at})
    RETURNING id`;
  const id = Number(story!.id);
  await sql`
    INSERT INTO wc_event_meta (
      story_id, summary, primary_source, categories, brand_ids, channel_types, source_tiers, event_type,
      verification_status, updated, first_report_at, latest_at, report_count, source_count, heat,
      news_value, selected_count, evidence_source_count, projected_at
    ) VALUES (
      ${id}, ${`${options.title} 摘要`}, '官网信源', ${["ai-models"]}::text[], ${["openai"]}::text[],
      ${["official_site"]}::text[], ${["T1"]}::text[], '模型发布', 'confirmed', false, ${at}, ${at},
      2, 2, 70, 80, ${options.curated === false ? 0 : 1}, ${options.curated === false ? 1 : 2}, ${at}
    )`;
  const [fact] = await sql<{ id: number }[]>`
    INSERT INTO facts (public_id, story_id, title, subject, version)
    VALUES (${`${T}-fact-${id}`}, ${id}, ${options.title}, 'OpenAI', 1)
    RETURNING id`;
  const articleId = `${T}-article-${id}`;
  await sql`INSERT INTO articles (id, source_id, identity_key, url, title, discovered_at, timeline_at)
    VALUES (${articleId}, ${`${T}-source`}, ${articleId}, ${`https://example.org/${articleId}`}, ${options.title}, ${at}, ${at})`;
  await sql`INSERT INTO publications (
      article_id, revision, visibility, eligible, selected, title, summary, source_id, channel,
      first_party, url, discovered_at, timeline_at, published_at, sort_at, visible_after, tags, body_mode, score, category
    ) VALUES (
      ${articleId}, 1, 'public', true, true, ${options.title}, ${`${options.title} 摘要`}, ${`${T}-source`}, 'news', true,
      ${`https://example.org/${articleId}`}, ${at}, ${at}, ${at}, ${at}, ${at}, ${["模型发布"]}::text[], 'full', 80, 'ai-models'
    )`;
  await sql`INSERT INTO fact_articles (fact_id, article_id, role) VALUES (${fact!.id}, ${articleId}, 'report')`;
  if (options.manual) {
    await sql`INSERT INTO wc_event_states (story_id, manual_decision, decided_at) VALUES (${id}, 'ignore', now())`;
  }
  return id;
}

const goodAnswer: ScoreDimensions = {
  importance: 80,
  relevance: 60,
  appeal: 70,
  novelty: 50,
  timeliness: 90,
  completeness: 40,
  verdict: "官方首发，价格有变化，值得写一条快讯。",
  column: "news",
  angles: ["从价格变化看性价比", "和上一代对比"],
  missing: ["缺少第三方评测"],
  confidence: "medium",
};

test("the code weighs the dimensions the model gives", () => {
  const total = weightedScore({
    importance: 100, relevance: 100, appeal: 100, novelty: 100, timeliness: 100, completeness: 100,
  });
  assert.equal(total, 100);
  const mixed = weightedScore({
    importance: 100, relevance: 0, appeal: 0, novelty: 0, timeliness: 0, completeness: 0,
  });
  assert.equal(mixed, 25);
  const half = weightedScore({
    importance: 50, relevance: 50, appeal: 50, novelty: 50, timeliness: 50, completeness: 50,
  });
  assert.equal(half, 50);
});

test("the fingerprint follows the evidence, not the clock", () => {
  const base = { storyId: 1, latestAt: NOW, reportCount: 2, factCount: 1, summary: "摘要" };
  const same = scoreFingerprint(base);
  assert.equal(same, scoreFingerprint({ ...base }));
  assert.notEqual(same, scoreFingerprint({ ...base, reportCount: 3 }));
  assert.notEqual(same, scoreFingerprint({ ...base, latestAt: new Date(NOW.getTime() + 1000) }));
  assert.notEqual(same, scoreFingerprint({ ...base, factCount: 2 }));
  assert.notEqual(same, scoreFingerprint({ ...base, summary: "新的摘要" }));
});

test("a candidate event is scored once and the result is written with its reasons", async () => {
  const storyId = await event({ title: `${T} 候选事件` });
  let calls = 0;
  const run = await scoreCandidateEvents({ call: async () => { calls += 1; return goodAnswer; } });
  assert.equal(run.scored, 1);
  assert.equal(calls, 1);

  const [row] = await sql<{ editorial_score: number; score_dims: Record<string, unknown>; score_reason: string; score_missing: string[]; score_fingerprint: string; scored_at: Date }[]>`
    SELECT editorial_score, score_dims, score_reason, score_missing, score_fingerprint, scored_at
    FROM wc_event_meta WHERE story_id = ${storyId}`;
  assert.equal(Number(row!.editorial_score), weightedScore(goodAnswer));
  assert.equal(row!.score_reason, goodAnswer.verdict);
  assert.deepEqual(row!.score_missing, goodAnswer.missing);
  assert.equal(row!.score_dims.importance, 80);
  assert.equal(row!.score_dims.column, "news");
  assert.deepEqual(row!.score_dims.angles, goodAnswer.angles);
  assert.ok(row!.score_fingerprint);
  assert.ok(row!.scored_at);

  // The same evidence is not paid for twice.
  const again = await scoreCandidateEvents({ call: async () => { calls += 1; return goodAnswer; } });
  assert.equal(calls, 1);
  assert.equal(again.scored, 0);
  assert.ok(again.skipped >= 1);
});

test("new evidence is scored again and a person's own judgement is left alone", async () => {
  const storyId = await event({ title: `${T} 有新证据` });
  let calls = 0;
  await scoreCandidateEvents({ call: async () => { calls += 1; return goodAnswer; } });
  assert.equal(calls, 1);

  await sql`UPDATE wc_event_meta SET report_count = 5, latest_at = ${new Date(NOW.getTime() + 60_000)} WHERE story_id = ${storyId}`;
  const second = await scoreCandidateEvents({ call: async () => { calls += 1; return goodAnswer; } });
  assert.equal(calls, 2);
  assert.equal(second.scored, 1);

  const judged = await event({ title: `${T} 人工判断过`, manual: true });
  const third = await scoreCandidateEvents({ call: async () => { calls += 1; return goodAnswer; } });
  assert.equal(calls, 2, "a judged event is not scored again");
  const [row] = await sql<{ editorial_score: number | null }[]>`SELECT editorial_score FROM wc_event_meta WHERE story_id = ${judged}`;
  assert.equal(row!.editorial_score, null);
});

test("a failed call leaves the event unscored and the list keeps working", async () => {
  const storyId = await event({ title: `${T} 模型失败` });
  const run = await scoreCandidateEvents({
    call: async () => { throw new Error("model refused"); },
  });
  assert.equal(run.failed, 1);
  assert.equal(run.scored, 0);
  const [row] = await sql<{ editorial_score: number | null; score_fingerprint: string | null }[]>`
    SELECT editorial_score, score_fingerprint FROM wc_event_meta WHERE story_id = ${storyId}`;
  assert.equal(row!.editorial_score, null);
  assert.equal(row!.score_fingerprint, null);
});
