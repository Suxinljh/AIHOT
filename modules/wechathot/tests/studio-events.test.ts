// Event projection invariants: the workbench row follows the public event's reports, repeated
// projection is idempotent, merged stories leave no orphan workbench references, and one broken event
// does not stop the others.
import { tag } from "../../../tests/setup.ts";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { closeDb, sql } from "@aihot/backend/db";
import { migrateMergedEventReferences, projectEvents } from "../events.ts";

const T = tag();
const NOW = new Date("2026-05-01T12:00:00Z");
const HOUR = 3600_000;
const official = `${T}-official`;
const media = `${T}-media`;
const xSource = `${T}-x`;
const mpSource = `${T}-mp`;
let articleNumber = 0;

interface StoryFixture {
  id: number;
  factId: number;
}

interface ReportOptions {
  storyId: number;
  factId: number;
  sourceId: string;
  at: Date;
  category: string;
  tags: string[];
  subjects: string[];
  role?: "primary" | "report" | "mention";
  selected?: boolean;
  score?: number;
  title?: string;
}

async function addReport(options: ReportOptions) {
  articleNumber += 1;
  const id = `${T}-article-${articleNumber}`;
  const title = options.title ?? `${T} ${articleNumber}`;
  await sql`INSERT INTO articles (id, source_id, identity_key, url, title, discovered_at, timeline_at)
    VALUES (${id}, ${options.sourceId}, ${id}, ${`https://example.org/${id}`}, ${title}, ${options.at}, ${options.at})`;
  const [analysis] = await sql<{ id: number }[]>`
    INSERT INTO analyses (article_id, input_revision, origin, relevance, category, tags, subjects, title_zh, summary_zh, score, selected)
    VALUES (${id}, 1, 'rule', 'pass', ${options.category}, ${options.tags}, ${options.subjects}, ${title}, ${`${title} 摘要`}, ${options.score ?? 70}, ${options.selected ?? false})
    RETURNING id`;
  const firstParty = options.sourceId === official;
  await sql`INSERT INTO publications (
      article_id, analysis_id, revision, visibility, eligible, selected, title, summary, source_id, channel,
      first_party, url, discovered_at, timeline_at, published_at, sort_at, visible_after, tags, body_mode, score, category
    ) VALUES (
      ${id}, ${analysis!.id}, 1, 'public', true, ${options.selected ?? false}, ${title}, ${`${title} 摘要`}, ${options.sourceId},
      'news', ${firstParty}, ${`https://example.org/${id}`}, ${options.at}, ${options.at}, ${options.at}, ${options.at},
      ${options.selected ? options.at : null}, ${options.tags}, 'full', ${options.score ?? 70}, ${options.category}
    )`;
  await sql`INSERT INTO fact_articles (fact_id, article_id, role) VALUES (${options.factId}, ${id}, ${options.role ?? "report"})`;
  return id;
}

async function addSignal(storyId: number, articleId: string, sourceId: string, at: Date) {
  await sql`INSERT INTO story_signals (story_id, article_id, participant_key, source_id, kind, observed_at)
    VALUES (${storyId}, ${articleId}, ${`source:${sourceId}`}, ${sourceId}, 'editorial', ${at})`;
}

async function newStory(title: string): Promise<StoryFixture> {
  const [story] = await sql<{ id: number }[]>`
    INSERT INTO stories (public_id, title, first_report_at, latest_at, created_at, updated_at)
    VALUES (${randomUUID()}, ${title}, ${new Date(NOW.getTime() - 3 * HOUR)}, ${NOW}, ${NOW}, ${NOW})
    RETURNING id`;
  const [fact] = await sql<{ id: number }[]>`
    INSERT INTO facts (public_id, story_id, title, subject, version)
    VALUES (${`${T}-fact-${story!.id}`}, ${story!.id}, ${title}, 'OpenAI', 1)
    RETURNING id`;
  return { id: story!.id, factId: fact!.id };
}

async function row(storyId: number) {
  const [meta] = await sql<{
    story_id: number;
    categories: string[];
    brand_ids: string[];
    channel_types: string[];
    source_tiers: string[];
    event_type: string | null;
    verification_status: string;
    updated: boolean;
    first_report_at: Date | null;
    latest_at: Date | null;
    summary: string | null;
    primary_source: string | null;
    news_value: number | null;
    selected_count: number;
    evidence_source_count: number;
    report_count: number;
    source_count: number;
    heat: number | null;
    projected_at: Date;
  }[]>`SELECT * FROM wc_event_meta WHERE story_id = ${storyId}`;
  return meta;
}

let mainStory: StoryFixture;
let mainReports: string[];

before(async () => {
  await sql`INSERT INTO sources (id, name, kind, config, tier, participation_mode, first_party, next_fetch_at) VALUES
    (${official}, 'Official', 'rss', ${sql.json({ feedUrl: "https://openai.com/news/rss.xml" })}, 'T1', 'editorial', true, '2100-01-01'),
    (${media}, 'Media', 'rss', ${sql.json({ feedUrl: "https://example.com/feed.xml" })}, 'T2', 'editorial', false, '2100-01-01'),
    (${xSource}, 'X account', 'x_search', ${sql.json({ query: "OpenAI" })}, 'T2', 'editorial', false, '2100-01-01'),
    (${mpSource}, 'WeChat account', 'mp_account', ${sql.json({ account: "OpenAI" })}, 'T2', 'editorial', false, '2100-01-01')`;
  await sql`INSERT INTO wc_brands (id, entity_id, name) VALUES
    ('openai', 'openai', 'OpenAI'),
    ('google', 'google', 'Google')`;
  // A linked channel's type wins over the source-kind fallback.
  await sql`INSERT INTO wc_channels (id, type, display_name, url, source_id)
    VALUES (${`${T}-media-channel`}, 'custom', 'Media channel', ${`https://example.org/${T}/channel`}, ${media})`;

  mainStory = await newStory("OpenAI 发布新模型");
  const [secondFact] = await sql<{ id: number }[]>`
    INSERT INTO facts (public_id, story_id, title, subject, version)
    VALUES (${`${T}-fact-second`}, ${mainStory.id}, '后续更新', 'Google', 2)
    RETURNING id`;
  mainReports = [
    await addReport({
      storyId: mainStory.id, factId: mainStory.factId, sourceId: official, at: new Date(NOW.getTime() - 2 * HOUR),
      category: "ai-models", tags: ["模型发布", "OpenAI"], subjects: ["OpenAI"], selected: true, score: 90,
    }),
    await addReport({
      storyId: mainStory.id, factId: secondFact!.id, sourceId: media, at: new Date(NOW.getTime() - HOUR),
      category: "auto", tags: ["融资/并购", "Google"], subjects: ["Google"], score: 80,
    }),
    await addReport({
      storyId: mainStory.id, factId: mainStory.factId, sourceId: xSource, at: new Date(NOW.getTime() - 30 * 60_000),
      category: "software", tags: ["产品更新"], subjects: [], role: "mention",
    }),
    await addReport({
      storyId: mainStory.id, factId: secondFact!.id, sourceId: mpSource, at: new Date(NOW.getTime() - 10 * 60_000),
      category: "software", tags: ["产品更新"], subjects: [], role: "mention",
    }),
  ];
  await addSignal(mainStory.id, mainReports[0]!, official, new Date(NOW.getTime() - 2 * HOUR));
  await addSignal(mainStory.id, mainReports[1]!, media, new Date(NOW.getTime() - HOUR));
});

after(closeDb);

test("projection aggregates the event's reports and maps existing brands", async () => {
  const result = await projectEvents({ scope: "all", now: NOW });
  assert.equal(result.failed, 0);
  assert.ok(result.projected >= 1);
  const meta = await row(mainStory.id);
  assert.ok(meta);
  assert.deepEqual(meta!.categories, ["ai-models", "auto"]);
  assert.deepEqual(meta!.brand_ids, ["google", "openai"]);
  assert.deepEqual(meta!.channel_types, ["custom", "official_site", "wechat", "x"]);
  assert.deepEqual(meta!.source_tiers, ["T1", "T2"]);
  assert.equal(meta!.event_type, "模型发布");
  assert.equal(meta!.verification_status, "confirmed");
  assert.equal(meta!.updated, true);
  assert.equal(meta!.first_report_at?.toISOString(), new Date(NOW.getTime() - 2 * HOUR).toISOString());
  assert.equal(meta!.latest_at?.toISOString(), new Date(NOW.getTime() - HOUR).toISOString());
  assert.equal(meta!.selected_count, 1);
  // The two mentions are passing references and do not make the event independently reported.
  assert.equal(meta!.evidence_source_count, 2);
  assert.equal(meta!.news_value, 90);
  assert.equal(meta!.primary_source, "Official");
  assert.equal(meta!.summary, `${T} 1 摘要`);
  assert.equal(meta!.report_count, 4);
  assert.equal(meta!.source_count, 4);
  assert.ok(meta!.heat !== null && meta!.heat > 0);
  assert.deepEqual(
    (await sql<{ brand_id: string }[]>`SELECT brand_id FROM wc_event_brands WHERE story_id = ${mainStory.id} ORDER BY brand_id`).map((r) => r.brand_id),
    ["google", "openai"],
  );
});

test("projecting the same event again updates one row and keeps the scoring fields", async () => {
  const before = await row(mainStory.id);
  await sql`UPDATE wc_event_meta SET editorial_score = 88.5, score_reason = 'kept', verification_status = 'disputed'
    WHERE story_id = ${mainStory.id}`;
  const later = new Date(NOW.getTime() + 60_000);
  await projectEvents({ scope: "all", now: later });
  const rows = await sql<{ projected_at: Date; editorial_score: number; score_reason: string; verification_status: string }[]>`
    SELECT projected_at, editorial_score, score_reason, verification_status FROM wc_event_meta WHERE story_id = ${mainStory.id}`;
  assert.equal(rows.length, 1);
  assert.equal((await row(mainStory.id))!.report_count, before!.report_count);
  assert.ok(rows[0]!.projected_at.getTime() > before!.projected_at.getTime());
  assert.equal(rows[0]!.editorial_score, 88.5);
  assert.equal(rows[0]!.score_reason, "kept");
  assert.equal(rows[0]!.verification_status, "disputed");
  assert.equal((await sql`SELECT 1 FROM wc_event_brands WHERE story_id = ${mainStory.id}`).length, 2);
});

test("merging a story moves topics, state, alerts and brand rows to the survivor", async () => {
  const from = await newStory("待合并事件");
  const into = await newStory("存活事件");
  await addReport({
    storyId: from.id, factId: from.factId, sourceId: official, at: new Date(NOW.getTime() - HOUR),
    category: "ai-models", tags: ["模型发布"], subjects: ["OpenAI"],
  });
  await addReport({
    storyId: into.id, factId: into.factId, sourceId: official, at: new Date(NOW.getTime() - HOUR),
    category: "ai-models", tags: ["模型发布"], subjects: ["OpenAI"],
  });
  await projectEvents({ scope: "all", now: NOW });

  const [topic] = await sql<{ id: number }[]>`INSERT INTO wc_topics (story_id, angle) VALUES (${from.id}, '角度') RETURNING id`;
  await sql`INSERT INTO wc_event_states (story_id, read_at, follow_up, manual_decision, decided_at)
    VALUES (${from.id}, ${new Date(NOW.getTime() - 2 * HOUR)}, true, 'recommend', ${new Date(NOW.getTime() - 2 * HOUR)})`;
  await sql`INSERT INTO wc_event_states (story_id, read_at, starred_at, manual_decision, decided_at)
    VALUES (${into.id}, ${new Date(NOW.getTime() - 3 * HOUR)}, ${new Date(NOW.getTime() - 3 * HOUR)}, 'ignore', ${new Date(NOW.getTime() - 3 * HOUR)})`;
  await sql`INSERT INTO wc_alerts (story_id, kind, dedupe_key) VALUES (${from.id}, 'new_event', ${`${T}-alert`})`;
  await sql`INSERT INTO wc_event_brands (story_id, brand_id) VALUES (${from.id}, 'google')`;

  await sql`UPDATE stories SET merged_into = ${into.id} WHERE id = ${from.id}`;
  const moved = await migrateMergedEventReferences();
  assert.equal(moved.failures.length, 0);
  assert.equal(moved.topics, 1);
  assert.equal(moved.states, 1);
  assert.equal(moved.alerts, 1);
  assert.equal(moved.eventBrands, 1);
  assert.equal(moved.metas, 1);

  assert.equal((await sql<{ story_id: number }[]>`SELECT story_id FROM wc_topics WHERE id = ${topic!.id}`)[0]!.story_id, into.id);
  const [state] = await sql<{ read_at: Date; starred_at: Date | null; follow_up: boolean; manual_decision: string | null }[]>`
    SELECT read_at, starred_at, follow_up, manual_decision FROM wc_event_states WHERE story_id = ${into.id}`;
  assert.equal(state!.read_at.toISOString(), new Date(NOW.getTime() - 3 * HOUR).toISOString());
  assert.equal(state!.starred_at?.toISOString(), new Date(NOW.getTime() - 3 * HOUR).toISOString());
  assert.equal(state!.follow_up, true);
  assert.equal(state!.manual_decision, "ignore");
  assert.equal((await sql<{ story_id: number }[]>`SELECT story_id FROM wc_alerts WHERE dedupe_key = ${`${T}-alert`}`)[0]!.story_id, into.id);
  assert.equal((await sql`SELECT 1 FROM wc_event_brands WHERE story_id = ${into.id} AND brand_id = 'google'`).length, 1);
  assert.equal((await sql`SELECT 1 FROM wc_event_meta WHERE story_id = ${from.id}`).length, 0);

  await projectEvents({ scope: "all", now: NOW });
  assert.equal((await sql`SELECT 1 FROM wc_event_meta WHERE story_id = ${from.id}`).length, 0);
  assert.equal((await sql`SELECT 1 FROM wc_event_meta WHERE story_id = ${into.id}`).length, 1);
});

test("a merge chain resolves to the final survivor even through a story with no workbench rows", async () => {
  const first = await newStory("链式合并 A");
  const middle = await newStory("链式合并 B");
  const last = await newStory("链式合并 C");
  const [topic] = await sql<{ id: number }[]>`INSERT INTO wc_topics (story_id, angle) VALUES (${first.id}, '链式角度') RETURNING id`;
  await sql`UPDATE stories SET merged_into = ${middle.id} WHERE id = ${first.id}`;
  await sql`UPDATE stories SET merged_into = ${last.id} WHERE id = ${middle.id}`;

  const moved = await migrateMergedEventReferences();
  assert.equal(moved.failures.length, 0);
  assert.equal((await sql<{ story_id: number }[]>`SELECT story_id FROM wc_topics WHERE id = ${topic!.id}`)[0]!.story_id, last.id);
});

test("one event's projection failure leaves the other events projected", async () => {
  const good = await newStory("正常事件");
  const bad = await newStory("故障事件");
  await addReport({
    storyId: good.id, factId: good.factId, sourceId: official, at: new Date(NOW.getTime() - HOUR),
    category: "ai-models", tags: ["模型发布"], subjects: ["OpenAI"],
  });
  await addReport({
    storyId: bad.id, factId: bad.factId, sourceId: official, at: new Date(NOW.getTime() - HOUR),
    category: "ai-models", tags: ["模型发布"], subjects: ["OpenAI"],
  });
  await sql.unsafe(`CREATE OR REPLACE FUNCTION wch_fail_meta() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.story_id = ${Number(bad.id)} THEN RAISE EXCEPTION 'projection failure fixture'; END IF;
      RETURN NEW;
    END;
  $$`);
  await sql`CREATE TRIGGER wch_fail_meta BEFORE INSERT OR UPDATE ON wc_event_meta
    FOR EACH ROW EXECUTE FUNCTION wch_fail_meta()`;
  const originalError = console.error;
  const logged: unknown[][] = [];
  console.error = (...args: unknown[]) => logged.push(args);
  try {
    const result = await projectEvents({ scope: "all", now: NOW });
    assert.ok(result.failed >= 1);
    assert.ok(result.projected >= 1);
    assert.equal(result.failures[0]?.storyId, bad.id);
    assert.ok(logged.length >= 1);
    assert.equal((await sql`SELECT 1 FROM wc_event_meta WHERE story_id = ${bad.id}`).length, 0);
    assert.equal((await sql`SELECT 1 FROM wc_event_meta WHERE story_id = ${good.id}`).length, 1);
  } finally {
    console.error = originalError;
    await sql`DROP TRIGGER IF EXISTS wch_fail_meta ON wc_event_meta`;
    await sql`DROP FUNCTION IF EXISTS wch_fail_meta()`;
  }
  await projectEvents({ scope: "all", now: NOW });
  assert.equal((await sql`SELECT 1 FROM wc_event_meta WHERE story_id = ${bad.id}`).length, 1);
});
