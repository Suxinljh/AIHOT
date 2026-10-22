// Notifications: a followed brand's new event leaves one alert, a later report on the same event
// joins it instead of adding another, a muted follow stays quiet, and a failing source has one
// alert of its own that closes when the source recovers.
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
import { generateAlerts, listAlerts } from "../alerts.ts";
import type { StudioAlertList } from "../alerts.ts";

const T = tag();
const CSRF = "dev";
const originalDevAdmin = config.devAdmin;
const NOW = new Date("2026-05-01T12:00:00Z");
let app: Awaited<ReturnType<typeof buildApp>>;
const brandId = `alert-brand-${T}`;
const otherBrandId = `alert-brand-other-${T}`;
const sourceId = `${T}-source`;
const failingSourceId = `${T}-failing-source`;

before(async () => {
  installModules([wechatHotServer]);
  config.devAdmin = { displayName: "WCH-15 alerts test" };
  app = await buildApp();
  await sql`INSERT INTO sources (id, name, kind, config, tier, participation_mode, first_party, next_fetch_at) VALUES
    (${sourceId}, '官网信源', 'rss', ${sql.json({ feedUrl: "https://example.com/feed.xml" })}, 'T1', 'editorial', true, '2100-01-01'),
    (${failingSourceId}, '故障信源', 'rss', ${sql.json({ feedUrl: "https://example.com/bad.xml" })}, 'T2', 'editorial', false, '2100-01-01')`;
  await sql`INSERT INTO wc_brands (id, name) VALUES
    (${brandId}, ${`关注品牌 ${T}`}), (${otherBrandId}, ${`别的品牌 ${T}`})`;
  await sql`INSERT INTO wc_channels (id, type, display_name, url, source_id) VALUES
    (${`${T}-channel`}, 'official_site', ${`官网 ${T}`}, ${`https://example.com/${T}`}, ${sourceId})`;
  await sql`INSERT INTO wc_channel_brands (channel_id, brand_id, followed) VALUES (${`${T}-channel`}, ${brandId}, true)`;
  await sql`INSERT INTO wc_follows (target_type, target_id, rule, keywords, notify, frequency)
    VALUES ('brand', ${brandId}, 'all', ${[]}::text[], true, 'immediate')`;
});

after(async () => {
  await app.close();
  await stopBoss();
  config.devAdmin = originalDevAdmin;
  await closeDb();
});

async function event(title: string, brands: string[], at: Date, options: { eventType?: string; curated?: boolean } = {}): Promise<number> {
  const [story] = await sql<{ id: number }[]>`
    INSERT INTO stories (public_id, title, first_report_at, latest_at, created_at, updated_at)
    VALUES (${randomUUID()}, ${title}, ${at}, ${at}, ${at}, ${at})
    RETURNING id`;
  const id = Number(story!.id);
  await sql`
    INSERT INTO wc_event_meta (
      story_id, summary, primary_source, categories, brand_ids, channel_types, source_tiers, event_type,
      verification_status, updated, first_report_at, latest_at, report_count, source_count, news_value,
      selected_count, evidence_source_count, projected_at
    ) VALUES (
      ${id}, ${`${title} 摘要`}, '官网信源', ${["ai-models"]}::text[], ${brands}::text[], ${["official_site"]}::text[],
      ${["T1"]}::text[], ${options.eventType ?? null}, 'confirmed', false, ${at}, ${at}, 1, 1, 80,
      ${options.curated === false ? 0 : 1}, ${options.curated === false ? 1 : 1}, ${NOW}
    )`;
  const [fact] = await sql<{ id: number }[]>`
    INSERT INTO facts (public_id, story_id, title, subject, version)
    VALUES (${`${T}-fact-${id}`}, ${id}, ${title}, 'OpenAI', 1)
    RETURNING id`;
  const articleId = `${T}-article-${id}`;
  await sql`INSERT INTO articles (id, source_id, identity_key, url, title, discovered_at, timeline_at)
    VALUES (${articleId}, ${sourceId}, ${articleId}, ${`https://example.org/${articleId}`}, ${title}, ${at}, ${at})`;
  await sql`INSERT INTO publications (
      article_id, revision, visibility, eligible, selected, title, summary, source_id, channel,
      first_party, url, discovered_at, timeline_at, published_at, sort_at, visible_after, tags, body_mode, score, category
    ) VALUES (
      ${articleId}, 1, 'public', true, true, ${title}, ${`${title} 摘要`}, ${sourceId}, 'news', true,
      ${`https://example.org/${articleId}`}, ${at}, ${at}, ${at}, ${at}, ${at}, ${["模型发布"]}::text[], 'full', 80, 'ai-models'
    )`;
  await sql`INSERT INTO fact_articles (fact_id, article_id, role) VALUES (${fact!.id}, ${articleId}, 'report')`;
  return id;
}

test("a followed brand's new event leaves one alert and later reports join it", async () => {
  const storyId = await event(`${T} 新事件`, [brandId], new Date(NOW.getTime() - 60_000));
  const first = await generateAlerts({ now: NOW, since: new Date(NOW.getTime() - 10 * 60_000) });
  assert.equal(first.created, 1);
  assert.equal(first.merged, 0);

  const list = await listAlerts({});
  const alert = list.items.find((row) => row.storyId === storyId);
  assert.ok(alert, "the event has an alert");
  assert.equal(alert!.kind, "new_event");
  assert.equal(alert!.status, "unread");
  assert.equal(alert!.brandId, brandId);
  assert.ok(alert!.storyPublicId);
  assert.match(alert!.reason, new RegExp(brandId === `alert-brand-${T}` ? "关注品牌" : "关注品牌"));

  // The same event reported again joins the alert it already has.
  await sql`UPDATE wc_event_meta SET projected_at = ${new Date(NOW.getTime() + 1000)} WHERE story_id = ${storyId}`;
  const second = await generateAlerts({ now: new Date(NOW.getTime() + 2000), since: new Date(NOW.getTime() - 10 * 60_000) });
  assert.equal(second.created, 0);
  assert.equal(second.merged, 1);
  const after = await listAlerts({});
  assert.equal(after.items.filter((row) => row.storyId === storyId).length, 1);
  assert.equal(after.items.find((row) => row.storyId === storyId)?.kind, "follow_update");
});

test("a brand nobody follows leaves no alert", async () => {
  const storyId = await event(`${T} 无人关注`, [otherBrandId], new Date(NOW.getTime() - 30_000));
  const run = await generateAlerts({ now: new Date(NOW.getTime() + 5000), since: new Date(NOW.getTime() - 10 * 60_000) });
  assert.equal(run.created, 0);
  const list = await listAlerts({});
  assert.equal(list.items.find((row) => row.storyId === storyId), undefined);
});

test("a muted follow stays quiet", async () => {
  await sql`UPDATE wc_follows SET muted_until = ${new Date(NOW.getTime() + 3600_000)} WHERE target_type = 'brand' AND target_id = ${brandId}`;
  const storyId = await event(`${T} 静音期间`, [brandId], new Date(NOW.getTime() - 10_000));
  const run = await generateAlerts({ now: new Date(NOW.getTime() + 10_000), since: new Date(NOW.getTime() - 10 * 60_000) });
  assert.equal(run.created, 0);
  assert.equal(run.skipped, 1);
  const list = await listAlerts({});
  assert.equal(list.items.find((row) => row.storyId === storyId), undefined);
  await sql`UPDATE wc_follows SET muted_until = null WHERE target_type = 'brand' AND target_id = ${brandId}`;
});

test("a failing source has one alert that closes when the source recovers", async () => {
  await sql`UPDATE sources SET health = 'failing', fail_count = 2, last_error = 'HTTP 503' WHERE id = ${failingSourceId}`;
  const first = await generateAlerts({ now: new Date(NOW.getTime() + 20_000), since: new Date(NOW.getTime() - 10 * 60_000) });
  assert.equal(first.sourceErrors, 1);
  const list = await listAlerts({});
  const alert = list.items.find((row) => row.sourceId === failingSourceId);
  assert.ok(alert);
  assert.equal(alert!.kind, "source_error");
  assert.match(alert!.reason, /HTTP 503/);

  const again = await generateAlerts({ now: new Date(NOW.getTime() + 30_000), since: new Date(NOW.getTime() - 10 * 60_000) });
  assert.equal(again.sourceErrors, 0);
  assert.equal((await listAlerts({})).items.filter((row) => row.sourceId === failingSourceId).length, 1);

  await sql`UPDATE sources SET health = 'ok', last_error = null WHERE id = ${failingSourceId}`;
  await generateAlerts({ now: new Date(NOW.getTime() + 40_000), since: new Date(NOW.getTime() - 10 * 60_000) });
  const recovered = (await listAlerts({})).items.find((row) => row.sourceId === failingSourceId);
  assert.equal(recovered?.status, "read");
  assert.match(recovered!.reason, /已恢复采集/);
});

test("the studio reads its notifications and keeps their state", async () => {
  const devAdmin = config.devAdmin;
  config.devAdmin = null;
  try {
    const guest = await app.inject({ method: "GET", url: "/api/studio/alerts" });
    assert.equal(guest.statusCode, 401);
    assert.equal(guest.headers["cache-control"], "no-store");
  } finally {
    config.devAdmin = devAdmin;
  }

  const response = await app.inject({ method: "GET", url: "/api/studio/alerts?status=all" });
  assert.equal(response.statusCode, 200);
  const body = response.json() as StudioAlertList;
  assert.ok(body.items.length >= 2);
  assert.ok(body.unread >= 1);

  const unread = await app.inject({ method: "GET", url: "/api/studio/alerts?status=unread" });
  const unreadBody = unread.json() as StudioAlertList;
  assert.ok(unreadBody.items.every((row) => row.status === "unread"));

  const first = body.items[0]!;
  const read = await app.inject({
    method: "PATCH",
    url: `/api/studio/alerts/${first.id}`,
    payload: { status: "read" },
    headers: { "content-type": "application/json", "x-csrf-token": CSRF },
  });
  assert.equal(read.statusCode, 200, read.body);
  assert.equal((read.json() as { status: string }).status, "read");

  const muted = await app.inject({
    method: "PATCH",
    url: `/api/studio/alerts/${first.id}`,
    payload: { status: "muted" },
    headers: { "content-type": "application/json", "x-csrf-token": CSRF },
  });
  assert.equal((muted.json() as { status: string }).status, "muted");

  const all = await app.inject({
    method: "POST",
    url: "/api/studio/alerts/read-all",
    payload: {},
    headers: { "content-type": "application/json", "x-csrf-token": CSRF },
  });
  assert.equal(all.statusCode, 200, all.body);
  const after = (await app.inject({ method: "GET", url: "/api/studio/alerts?status=unread" })).json() as StudioAlertList;
  assert.equal(after.unread, 0);
  assert.equal(after.items.length, 0);

  const bad = await app.inject({
    method: "PATCH",
    url: "/api/studio/alerts/${first.id}",
    payload: { status: "weird" },
    headers: { "content-type": "application/json", "x-csrf-token": CSRF },
  });
  assert.equal(bad.statusCode, 400);
  const missing = await app.inject({
    method: "PATCH",
    url: "/api/studio/alerts/999999",
    payload: { status: "read" },
    headers: { "content-type": "application/json", "x-csrf-token": CSRF },
  });
  assert.equal(missing.statusCode, 404);
});
