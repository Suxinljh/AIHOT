// The metrics page's numbers: adoption, completion, rewrites and cost, with null rates when the
// denominator is zero (the page shows "—", never a misleading 0).
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { tag } from "../../../tests/setup.ts";
import { closeDb, sql } from "@aihot/backend/db";
import { loadMetrics } from "../metrics.ts";

const T = tag();

before(async () => {
  const [story] = await sql<{ id: number }[]>`
    INSERT INTO stories (public_id, title, first_report_at, latest_at, created_at, updated_at)
    VALUES (${randomUUID()}, ${`${T} 指标事件`}, now() - interval '1 day', now(), now(), now()) RETURNING id`;
  const [topicA] = await sql<{ id: number }[]>`
    INSERT INTO wc_topics (story_id, angle, column_type, status) VALUES (${story!.id}, ${`${T} A`}, 'news', 'done') RETURNING id`;
  const [topicB] = await sql<{ id: number }[]>`
    INSERT INTO wc_topics (story_id, angle, column_type, status) VALUES (${story!.id}, ${`${T} B`}, 'news', 'pending') RETURNING id`;
  assert.ok(topicB);
  const [article] = await sql<{ id: number }[]>`
    INSERT INTO wc_articles (topic_id, type, title, status, planned_for)
    VALUES (${topicA!.id}, 'news', ${`${T} 完成稿`}, 'done', null) RETURNING id`;
  await sql`
    INSERT INTO wc_article_versions (article_id, version, title, content, reason)
    VALUES (${article!.id}, 2, ${`${T} 完成稿`}, '{"type":"doc","content":[]}', '手动修改')`;
  const [source] = await sql<{ id: string }[]>`
    INSERT INTO sources (id, name, kind, tier, participation_mode, next_fetch_at)
    VALUES (${`${T}-source`}, ${`${T} 源`}, 'rss', 'T1', 'editorial', '2100-01-01') RETURNING id`;
  await sql`
    INSERT INTO articles (id, source_id, identity_key, url, title, discovered_at, timeline_at)
    VALUES (${`${T}-item`}, ${source!.id}, ${`${T}-item`}, ${`https://example.org/${T}`}, ${`${T} 采集`}, now(), now())`;
  await sql`
    INSERT INTO receipts (logical_key, service, model, purpose, subject, status, cost, currency, cost_basis, created_at, updated_at)
    VALUES
      (${`${T}-r1`}, 'llm', 'm', 'article_body', ${`article:${article!.id}`}, 'completed', 3.00, 'CNY', 'actual', now(), now()),
      (${`${T}-r2`}, 'llm', 'm', 'summarize_article', ${`article:${article!.id}-b`}, 'completed', 1.50, 'CNY', 'estimated', now(), now())`;
});

after(async () => { await closeDb(); });

test("rates and costs come from the workbench's own rows", async () => {
  const metrics = await loadMetrics(new Date(Date.now() - 86400_000), new Date(Date.now() + 60_000));
  assert.equal(metrics.topics.created, 2);
  assert.equal(metrics.topics.adopted, 1);
  assert.equal(metrics.topics.adoptionRate, 0.5);
  assert.equal(metrics.articles.created, 1);
  assert.equal(metrics.articles.done, 1);
  assert.equal(metrics.articles.completionRate, 1);
  assert.equal(metrics.articles.rewritten, 1);
  assert.equal(metrics.articles.rewriteRate, 1);
  assert.equal(metrics.collection.items, 1);
  assert.equal(metrics.cost.total, 4.5);
  assert.equal(metrics.cost.perArticle, 2.25);
  assert.equal(metrics.cost.perHundredItems, 450);
  assert.deepEqual(metrics.cost.byPurpose.map((row) => row.purpose), ["article_body", "summarize_article"]);
});

test("an empty range reports null rates instead of zero", async () => {
  const future = new Date(Date.now() + 365 * 86400_000);
  const metrics = await loadMetrics(future, new Date(future.getTime() + 86400_000));
  assert.equal(metrics.topics.created, 0);
  assert.equal(metrics.topics.adoptionRate, null);
  assert.equal(metrics.articles.completionRate, null);
  assert.equal(metrics.cost.total, null);
  assert.equal(metrics.cost.perArticle, null);
  assert.equal(metrics.cost.perHundredItems, null);
  assert.deepEqual(metrics.cost.byPurpose, []);
});
