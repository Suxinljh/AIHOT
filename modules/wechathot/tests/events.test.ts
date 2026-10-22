// Hot-list API invariants: the default scope only shows editorially useful events, every filter
// and ordering follows the projection, pages neither repeat nor skip rows, facets keep the other
// options countable, and the endpoint stays behind the admin session with no-store responses.
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
import type { StudioEventList, StudioEventListItem } from "../studio-types.ts";

const T = tag();
const originalDevAdmin = config.devAdmin;
const NOW = Date.now();
const HOUR = 3600_000;
const openai = `openai-${T}`;
const apple = `apple-${T}`;
let app: Awaited<ReturnType<typeof buildApp>>;

before(async () => {
  installModules([wechatHotServer]);
  config.devAdmin = { displayName: "WCH-6 event list test" };
  app = await buildApp();
  await sql`INSERT INTO wc_brands (id, name) VALUES
    (${openai}, ${`OpenAI ${T}`}),
    (${apple}, ${`Apple ${T}`})`;
});

after(async () => {
  await app.close();
  await stopBoss();
  config.devAdmin = originalDevAdmin;
  await closeDb();
});

interface Fixture {
  title: string;
  categories: string[];
  brands?: string[];
  channels?: string[];
  eventType?: string;
  tiers?: string[];
  firstAt: Date;
  latestAt: Date;
  selectedCount?: number;
  evidenceSourceCount?: number;
  heat?: number | null;
  newsValue?: number | null;
  recommendationScore?: number | null;
  summary?: string;
  primarySource?: string;
}

async function event(input: Fixture): Promise<number> {
  const [story] = await sql<{ id: number }[]>`
    INSERT INTO stories (public_id, title, first_report_at, latest_at, created_at, updated_at)
    VALUES (${randomUUID()}, ${input.title}, ${input.firstAt}, ${input.latestAt}, ${input.firstAt}, ${input.latestAt})
    RETURNING id`;
  const id = Number(story!.id);
  await sql`
    INSERT INTO wc_event_meta (
      story_id, summary, primary_source, categories, brand_ids, channel_types, source_tiers, event_type,
      verification_status, updated, first_report_at, latest_at, report_count, source_count, heat,
      news_value, selected_count, evidence_source_count, editorial_score, score_reason
    ) VALUES (
      ${id}, ${input.summary ?? `${input.title} 摘要`}, ${input.primarySource ?? "测试来源"}, ${input.categories},
      ${input.brands ?? []}::text[], ${input.channels ?? []}::text[], ${input.tiers ?? ["T2"]}::text[],
      ${input.eventType ?? null}, 'confirmed', false, ${input.firstAt}, ${input.latestAt},
      ${(input.selectedCount ?? 0) + (input.evidenceSourceCount ?? 0)}, ${(input.evidenceSourceCount ?? 0) + 1},
      ${input.heat ?? null}, ${input.newsValue ?? null}, ${input.selectedCount ?? 0},
      ${input.evidenceSourceCount ?? 0}, ${input.recommendationScore ?? null},
      ${input.recommendationScore === undefined ? null : "推荐理由"}
    )`;
  return id;
}

let selected: number;
let hardware: number;
let lowSignal: number;
let old: number;
let noBrand: number;

async function list(query = ""): Promise<StudioEventList> {
  const response = await app.inject({ method: "GET", url: `/api/studio/events${query}` });
  assert.equal(response.statusCode, 200, response.body);
  assert.equal(response.headers["cache-control"], "no-store");
  return response.json() as StudioEventList;
}

const ids = (body: StudioEventList) => body.items.map((item) => item.storyId);

before(async () => {
  selected = await event({
    title: `${T} 精选模型发布`,
    categories: ["ai-models"],
    brands: [openai],
    channels: ["official_site"],
    eventType: "模型发布",
    tiers: ["T1"],
    firstAt: new Date(NOW - 2 * HOUR),
    latestAt: new Date(NOW - HOUR),
    selectedCount: 1,
    evidenceSourceCount: 1,
    heat: 90,
    newsValue: 88,
    recommendationScore: 75,
    summary: "OpenAI 发布了新模型。",
    primarySource: "OpenAI 官网",
  });
  hardware = await event({
    title: `${T} 硬件发布`,
    categories: ["hardware"],
    brands: [apple],
    channels: ["media"],
    eventType: "产品发布",
    tiers: ["T2"],
    firstAt: new Date(NOW - 4 * HOUR),
    latestAt: new Date(NOW - 3 * HOUR),
    selectedCount: 1,
    evidenceSourceCount: 1,
    heat: 60,
    newsValue: 70,
    recommendationScore: 85,
  });
  lowSignal = await event({
    title: `${T} 低价值更新`,
    categories: ["ai-models"],
    brands: [openai],
    channels: ["x"],
    eventType: "产品更新",
    tiers: ["T2"],
    firstAt: new Date(NOW - 6 * HOUR),
    latestAt: new Date(NOW - 5 * HOUR),
    selectedCount: 0,
    evidenceSourceCount: 1,
    heat: 30,
    newsValue: 50,
    recommendationScore: 95,
  });
  old = await event({
    title: `${T} 两家来源的旧事件`,
    categories: ["software"],
    brands: [apple],
    channels: ["media"],
    eventType: "融资/并购",
    tiers: ["T2"],
    firstAt: new Date(NOW - 50 * 24 * HOUR),
    latestAt: new Date(NOW - 40 * 24 * HOUR),
    selectedCount: 0,
    evidenceSourceCount: 2,
  });
  noBrand = await event({
    title: `${T} 无品牌影视事件`,
    categories: ["film"],
    channels: ["wechat"],
    eventType: "预告/定档",
    tiers: ["T2", "T3"],
    firstAt: new Date(NOW - 8 * HOUR),
    latestAt: new Date(NOW - 7 * HOUR),
    selectedCount: 0,
    evidenceSourceCount: 2,
  });

  await sql`INSERT INTO wc_event_states (story_id, read_at) VALUES (${selected}, now())`;
  await sql`INSERT INTO wc_event_states (story_id, starred_at, follow_up) VALUES (${hardware}, now(), true)`;
  await sql`INSERT INTO wc_event_states (story_id, ignored_at) VALUES (${lowSignal}, now())`;
  await sql`INSERT INTO wc_topics (story_id, status) VALUES (${old}, 'writing')`;
  await sql`INSERT INTO wc_follows (target_type, target_id) VALUES ('brand', ${openai})`;
});

test("the hot list needs an admin session and never caches", async () => {
  const devAdmin = config.devAdmin;
  config.devAdmin = null;
  try {
    const guest = await app.inject({ method: "GET", url: "/api/studio/events" });
    assert.equal(guest.statusCode, 401);
    assert.equal(guest.headers["cache-control"], "no-store");
    assert.equal(guest.headers["x-robots-tag"], "noindex, nofollow");
  } finally {
    config.devAdmin = devAdmin;
  }
});

test("curated is the default and all switches to every collected event", async () => {
  const curated = await list();
  assert.equal(curated.scope, "curated");
  assert.deepEqual(new Set(ids(curated)), new Set([selected, hardware, old, noBrand]));
  assert.equal(curated.total, 4);
  assert.ok(!ids(curated).includes(lowSignal));

  const all = await list("?scope=all&sort=latest");
  assert.equal(all.scope, "all");
  assert.equal(all.total, 5);
  assert.ok(ids(all).includes(lowSignal));
});

test("pages are stable and never repeat a row", async () => {
  const first = await list("?scope=all&sort=latest&pageSize=2&page=1");
  const second = await list("?scope=all&sort=latest&pageSize=2&page=2");
  const third = await list("?scope=all&sort=latest&pageSize=2&page=3");
  assert.equal(first.totalPages, 3);
  const pages = [...ids(first), ...ids(second), ...ids(third)];
  assert.equal(pages.length, 5);
  assert.equal(new Set(pages).size, 5);
  assert.deepEqual(new Set(pages), new Set([selected, hardware, lowSignal, old, noBrand]));
  assert.deepEqual(ids(await list("?scope=all&sort=latest&pageSize=2&page=4")), []);
});

test("every filter narrows the projected events", async () => {
  assert.deepEqual(new Set(ids(await list("?industry=ai-models"))), new Set([selected]));
  assert.deepEqual(new Set(ids(await list("?industry=hardware"))), new Set([hardware]));
  assert.deepEqual(new Set(ids(await list("?industry=ai-models,hardware"))), new Set([selected, hardware]));
  assert.deepEqual(new Set(ids(await list("?brand=" + openai))), new Set([selected]));
  assert.deepEqual(new Set(ids(await list("?channel=wechat"))), new Set([noBrand]));
  assert.deepEqual(new Set(ids(await list("?eventType=" + encodeURIComponent("模型发布")))), new Set([selected]));
  assert.deepEqual(new Set(ids(await list("?sourceTier=T1"))), new Set([selected]));
  assert.deepEqual(new Set(ids(await list("?sourceTier=T2,T3"))), new Set([hardware, old, noBrand]));

  const recent = await list(`?from=${encodeURIComponent(new Date(NOW - 3.5 * HOUR).toISOString())}`);
  assert.deepEqual(new Set(ids(recent)), new Set([selected, hardware]));
  const before = await list(`?to=${encodeURIComponent(new Date(NOW - 5.5 * HOUR).toISOString())}`);
  assert.deepEqual(new Set(ids(before)), new Set([old, noBrand]));

  assert.deepEqual(ids(await list("?read=true")), [selected]);
  assert.deepEqual(new Set(ids(await list("?read=false"))), new Set([hardware, old, noBrand]));
  assert.deepEqual(ids(await list("?topic=true")), [old]);
  assert.deepEqual(new Set(ids(await list("?topic=false"))), new Set([selected, hardware, noBrand]));

  // Filters combine instead of replacing each other.
  assert.deepEqual(ids(await list(`?brand=${openai}&channel=official_site&read=true&topic=false`)), [selected]);
  assert.deepEqual(ids(await list(`?brand=${apple}&read=true`)), []);
  assert.deepEqual(new Set(ids(await list(`?brand=${apple}&read=false`))), new Set([hardware, old]));
});

test("the five orderings use their own keys and the story id as a tie-break", async () => {
  assert.deepEqual(ids(await list("?sort=discovered")), [selected, hardware, noBrand, old]);
  assert.deepEqual(ids(await list("?sort=latest")), [selected, hardware, noBrand, old]);
  assert.deepEqual(ids(await list("?sort=heat")), [selected, hardware, noBrand, old]);
  assert.deepEqual(ids(await list("?sort=recommend")), [hardware, selected, noBrand, old]);
  assert.deepEqual(ids(await list("?sort=followed")), [selected, hardware, noBrand, old]);

  const allByHeat = await list("?scope=all&sort=heat");
  assert.deepEqual(ids(allByHeat), [selected, hardware, lowSignal, noBrand, old]);
  const allByRecommend = await list("?scope=all&sort=recommend");
  assert.deepEqual(ids(allByRecommend), [lowSignal, hardware, selected, noBrand, old]);
});

test("items carry the card fields and the private state", async () => {
  const body = await list("?scope=all");
  const item = body.items.find((row): row is StudioEventListItem => row.storyId === selected)!;
  assert.equal(item.publicId.length, 36);
  assert.equal(item.title, `${T} 精选模型发布`);
  assert.equal(item.summary, "OpenAI 发布了新模型。");
  assert.equal(item.primarySource, "OpenAI 官网");
  assert.deepEqual(item.categories, ["ai-models"]);
  assert.deepEqual(item.brands.map((brand) => brand.id), [openai]);
  assert.equal(item.brands[0]?.followed, true);
  assert.equal(item.followed, true);
  assert.deepEqual(item.channelTypes, ["official_site"]);
  assert.equal(item.eventType, "模型发布");
  assert.equal(item.verificationStatus, "confirmed");
  assert.equal(item.reportCount, 2);
  assert.equal(item.heat, 90);
  assert.equal(item.newsValue, 88);
  assert.equal(item.recommendationScore, 75);
  assert.equal(item.recommendationReason, "推荐理由");
  assert.equal(item.topicCount, 0);
  assert.equal(item.state.read, true);
  assert.equal(item.state.starred, false);
  assert.ok(item.firstReportAt && item.latestAt);

  const ignored = body.items.find((row) => row.storyId === lowSignal)!;
  assert.equal(ignored.state.ignored, true);
  assert.equal(ignored.followed, true);
  const withTopic = body.items.find((row) => row.storyId === old)!;
  assert.equal(withTopic.topicCount, 1);
  const starred = body.items.find((row) => row.storyId === hardware)!;
  assert.equal(starred.state.starred, true);
  assert.equal(starred.state.followUp, true);
});

test("facets count the current result and keep other options visible", async () => {
  const all = await list();
  assert.deepEqual(
    Object.fromEntries(all.facets.industries.map((row) => [row.value, row.count])),
    { "ai-models": 1, hardware: 1, software: 1, film: 1 },
  );
  assert.deepEqual(all.facets.brands.map((row) => [row.id, row.count]), [[apple, 2], [openai, 1]]);
  assert.equal(all.facets.channels.find((row) => row.value === "wechat")?.label, "微信公众号");
  assert.equal(all.facets.channels.find((row) => row.value === "wechat")?.count, 1);
  assert.deepEqual(Object.fromEntries(all.facets.eventTypes.map((row) => [row.value, row.count])), {
    产品发布: 1, 模型发布: 1, "融资/并购": 1, "预告/定档": 1,
  });
  assert.deepEqual(Object.fromEntries(all.facets.sourceTiers.map((row) => [row.value, row.count])), { T1: 1, T2: 3, T3: 1 });

  const ai = await list("?industry=ai-models");
  // The selected industry excludes itself from its own facet, so the other tabs stay countable.
  assert.deepEqual(
    Object.fromEntries(ai.facets.industries.map((row) => [row.value, row.count])),
    { "ai-models": 1, hardware: 1, software: 1, film: 1 },
  );
  assert.deepEqual(ai.facets.brands.map((row) => [row.id, row.count]), [[openai, 1]]);
});

test("invalid list parameters are readable errors", async () => {
  for (const query of [
    "?industry=not-an-industry",
    "?sort=popular",
    "?read=maybe",
    "?channel=forum",
    "?sourceTier=T1%20OR",
    "?from=yesterday",
    `?from=${encodeURIComponent(new Date(NOW).toISOString())}&to=${encodeURIComponent(new Date(NOW - HOUR).toISOString())}`,
    "?page=0",
    "?pageSize=101",
    "?brand=Bad%20Id",
  ]) {
    const response = await app.inject({ method: "GET", url: `/api/studio/events${query}` });
    assert.equal(response.statusCode, 400, query);
    assert.equal(response.headers["cache-control"], "no-store");
  }
});
