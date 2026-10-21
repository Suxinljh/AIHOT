// Brand library API invariants: writes need the admin session and CSRF token; names and industries
// are validated; search and filters cover aliases, industries and follows; a merge moves every
// relation to the survivor; deleting a brand keeps its events and channels.
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
import type { BrandDetail, BrandListItem, BrandMergeResult } from "../studio-types.ts";

const T = tag();
const CSRF = "dev";
const originalDevAdmin = config.devAdmin;
let app: Awaited<ReturnType<typeof buildApp>>;

before(async () => {
  installModules([wechatHotServer]);
  config.devAdmin = { displayName: "WCH-10 brand test" };
  app = await buildApp();
});

after(async () => {
  await app.close();
  await stopBoss();
  config.devAdmin = originalDevAdmin;
  await closeDb();
});

async function api(method: "GET" | "POST" | "PATCH" | "DELETE", url: string, payload?: unknown) {
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

async function create(input: Record<string, unknown>): Promise<BrandDetail> {
  const response = await api("POST", "/api/studio/brands", input);
  assert.equal(response.statusCode, 201, response.body);
  return response.json() as BrandDetail;
}

async function story(title: string): Promise<number> {
  const [row] = await sql<{ id: number }[]>`
    INSERT INTO stories (public_id, title, first_report_at, latest_at, created_at, updated_at)
    VALUES (${randomUUID()}, ${title}, now(), now(), now(), now())
    RETURNING id`;
  return Number(row!.id);
}

async function channel(id: string, url: string): Promise<void> {
  await sql`INSERT INTO wc_channels (id, type, display_name, url) VALUES (${id}, 'official_site', ${id}, ${url})`;
}

test("studio writes need a session and the CSRF token, and responses are private", async () => {
  const devAdmin = config.devAdmin;
  config.devAdmin = null;
  try {
    const guest = await app.inject({ method: "GET", url: "/api/studio/brands" });
    assert.equal(guest.statusCode, 401);
    assert.equal(guest.headers["cache-control"], "no-store");
    assert.equal(guest.headers["x-robots-tag"], "noindex, nofollow");
    const guestWrite = await app.inject({
      method: "POST",
      url: "/api/studio/brands",
      payload: { name: `Guest ${T}` },
      headers: { "content-type": "application/json" },
    });
    assert.equal(guestWrite.statusCode, 401);
  } finally {
    config.devAdmin = devAdmin;
  }

  const noCsrf = await app.inject({
    method: "POST",
    url: "/api/studio/brands",
    payload: { name: `No CSRF ${T}` },
    headers: { "content-type": "application/json" },
  });
  assert.equal(noCsrf.statusCode, 403);

  const created = await api("POST", "/api/studio/brands", { id: `csrf-${T}`, name: `CSRF ${T}` });
  assert.equal(created.statusCode, 201);
  assert.equal(created.headers["cache-control"], "no-store");
  assert.equal(created.headers["x-robots-tag"], "noindex, nofollow");
});

test("brands can be created, searched, filtered and edited", async () => {
  const id = `brand-a-${T}`;
  const name = `品牌 A ${T}`;
  const alias = `别名 A ${T}`;
  const brand = await create({
    id,
    name,
    aliases: [alias, `Alt A ${T}`, alias],
    industries: ["ai-models", "software"],
    website: "https://example.com/a",
    logoUrl: "https://example.com/a.png",
    verifiedStatus: "user",
    notes: "手动新建",
  });
  assert.equal(brand.id, id);
  assert.equal(brand.name, name);
  assert.deepEqual(brand.aliases, [alias, `Alt A ${T}`]);
  assert.deepEqual(brand.industries, ["ai-models", "software"]);
  assert.equal(brand.verifiedStatus, "user");
  assert.equal(brand.followed, false);
  assert.equal(brand.notes, "手动新建");

  const byAlias = await api("GET", `/api/studio/brands?q=${encodeURIComponent(alias)}`);
  assert.equal(byAlias.statusCode, 200);
  assert.ok((byAlias.json() as { items: BrandListItem[] }).items.some((item) => item.id === id));

  const byIndustry = await api("GET", "/api/studio/brands?industry=ai-models");
  assert.equal(byIndustry.statusCode, 200);
  assert.ok((byIndustry.json() as { items: BrandListItem[] }).items.some((item) => item.id === id));
  const otherIndustry = await api("GET", "/api/studio/brands?industry=hardware");
  assert.ok(!(otherIndustry.json() as { items: BrandListItem[] }).items.some((item) => item.id === id));

  const updated = await api("PATCH", `/api/studio/brands/${id}`, {
    name: `${name} 更新`,
    aliases: [`新别名 ${T}`],
    industries: ["hardware"],
    website: null,
    logoUrl: "https://example.com/a2.png",
    verifiedStatus: "verified",
    notes: null,
    version: brand.updatedAt,
  });
  assert.equal(updated.statusCode, 200, updated.body);
  const edited = updated.json() as BrandDetail;
  assert.equal(edited.name, `${name} 更新`);
  assert.deepEqual(edited.aliases, [`新别名 ${T}`]);
  assert.deepEqual(edited.industries, ["hardware"]);
  assert.equal(edited.website, null);
  assert.equal(edited.verifiedStatus, "verified");
  assert.equal(edited.notes, null);

  const stale = await api("PATCH", `/api/studio/brands/${id}`, {
    name: `${name} 过期`,
    version: "2000-01-01T00:00:00.000Z",
  });
  assert.equal(stale.statusCode, 409);

  const detail = await api("GET", `/api/studio/brands/${id}`);
  assert.equal(detail.statusCode, 200);
  assert.equal((detail.json() as BrandDetail).name, `${name} 更新`);
});

test("duplicate names, duplicate ids and invalid industries are readable errors", async () => {
  const id = `brand-b-${T}`;
  const name = `品牌 B ${T}`;
  await create({ id, name });

  const duplicateName = await api("POST", "/api/studio/brands", { id: `brand-b2-${T}`, name });
  assert.equal(duplicateName.statusCode, 409);
  assert.match((duplicateName.json() as { detail: string }).detail, new RegExp(name));

  const duplicateId = await api("POST", "/api/studio/brands", { id, name: `${name} 另一个` });
  assert.equal(duplicateId.statusCode, 409);

  const badIndustry = await api("POST", "/api/studio/brands", {
    id: `brand-bad-${T}`,
    name: `品牌 Bad ${T}`,
    industries: ["not-an-industry"],
  });
  assert.equal(badIndustry.statusCode, 400);
  assert.match((badIndustry.json() as { detail: string }).detail, /行业 not-an-industry/);

  const badFilter = await api("GET", "/api/studio/brands?industry=not-an-industry");
  assert.equal(badFilter.statusCode, 400);
  assert.match((badFilter.json() as { detail: string }).detail, /行业 not-an-industry/);

  const badFollowed = await api("GET", "/api/studio/brands?followed=maybe");
  assert.equal(badFollowed.statusCode, 400);
});

test("the list filters by follow status and the detail carries channels, events and follow", async () => {
  const id = `brand-c-${T}`;
  const brand = await create({ id, name: `品牌 C ${T}`, industries: ["ai-models"] });
  const [follow] = await sql<{ id: number }[]>`
    INSERT INTO wc_follows (target_type, target_id, rule, keywords, notify, frequency)
    VALUES ('brand', ${id}, 'major', ${["关注词"]}::text[], true, 'daily')
    RETURNING id`;

  const followed = await api("GET", "/api/studio/brands?followed=true");
  assert.equal(followed.statusCode, 200);
  assert.ok((followed.json() as { items: BrandListItem[] }).items.some((item) => item.id === id && item.followed));
  const notFollowed = await api("GET", "/api/studio/brands?followed=false");
  assert.ok(!(notFollowed.json() as { items: BrandListItem[] }).items.some((item) => item.id === id));

  const channelId = `channel-c-${T}`;
  await channel(channelId, `https://example.com/${channelId}`);
  await sql`INSERT INTO wc_channel_brands (channel_id, brand_id) VALUES (${channelId}, ${id})`;
  const eventId = await story(`品牌 C 事件 ${T}`);
  await sql`INSERT INTO wc_event_brands (story_id, brand_id) VALUES (${eventId}, ${id})`;
  await sql`INSERT INTO wc_event_meta (story_id, categories, brand_ids) VALUES (${eventId}, ${["ai-models"]}::text[], ${[id]}::text[])`;

  const response = await api("GET", `/api/studio/brands/${id}`);
  assert.equal(response.statusCode, 200);
  const detail = response.json() as BrandDetail;
  assert.equal(detail.followed, true);
  assert.equal(detail.follow?.id, Number(follow!.id));
  assert.equal(detail.follow?.rule, "major");
  assert.deepEqual(detail.follow?.keywords, ["关注词"]);
  assert.equal(detail.channels.length, 1);
  assert.equal(detail.channels[0]?.id, channelId);
  assert.equal(detail.events.length, 1);
  assert.equal(detail.events[0]?.storyId, eventId);
  assert.deepEqual(detail.events[0]?.categories, ["ai-models"]);
  assert.deepEqual(detail.counts, { channels: 1, events: 1 });
  assert.equal(brand.followed, false);
});

test("merging brands keeps aliases, channels, events, event filters and follows", async () => {
  const sourceId = `brand-source-${T}`;
  const targetId = `brand-target-${T}`;
  const source = await create({
    id: sourceId,
    name: `源品牌 ${T}`,
    aliases: [`源别名 ${T}`],
    entityId: `entity-source-${T}`,
  });
  const target = await create({
    id: targetId,
    name: `目标品牌 ${T}`,
    aliases: [`目标别名 ${T}`],
  });

  const sourceChannel = `channel-source-${T}`;
  const targetChannel = `channel-target-${T}`;
  const sharedChannel = `channel-shared-${T}`;
  await channel(sourceChannel, `https://example.com/${sourceChannel}`);
  await channel(targetChannel, `https://example.com/${targetChannel}`);
  await channel(sharedChannel, `https://example.com/${sharedChannel}`);
  await sql`INSERT INTO wc_channel_brands (channel_id, brand_id) VALUES
    (${sourceChannel}, ${sourceId}), (${sharedChannel}, ${sourceId}),
    (${targetChannel}, ${targetId}), (${sharedChannel}, ${targetId})`;

  const sourceEvent = await story(`源品牌事件 ${T}`);
  const sharedEvent = await story(`共同事件 ${T}`);
  await sql`INSERT INTO wc_event_brands (story_id, brand_id) VALUES
    (${sourceEvent}, ${sourceId}), (${sharedEvent}, ${sourceId}), (${sharedEvent}, ${targetId})`;
  await sql`INSERT INTO wc_event_meta (story_id, brand_ids) VALUES
    (${sourceEvent}, ${[sourceId]}::text[]), (${sharedEvent}, ${[sourceId, targetId]}::text[])`;

  const [sourceFollow] = await sql<{ id: number }[]>`
    INSERT INTO wc_follows (target_type, target_id, rule, keywords, blocked_keywords, event_types, notify, frequency)
    VALUES ('brand', ${sourceId}, 'keywords', ${["源关注词"]}::text[], ${["源屏蔽词"]}::text[], ${["model_release"]}::text[], true, 'daily')
    RETURNING id`;
  const [targetFollow] = await sql<{ id: number }[]>`
    INSERT INTO wc_follows (target_type, target_id, rule, keywords, notify, frequency)
    VALUES ('brand', ${targetId}, 'all', ${["目标关注词"]}::text[], true, 'immediate')
    RETURNING id`;
  await sql`INSERT INTO wc_alerts (story_id, kind, rule_id, dedupe_key)
    VALUES (${sourceEvent}, 'follow_update', ${sourceFollow!.id}, ${`alert-${T}`})`;

  const response = await api("POST", "/api/studio/brands/merge", {
    from: sourceId,
    into: targetId,
    reason: "重复品牌",
  });
  assert.equal(response.statusCode, 200, response.body);
  const result = response.json() as BrandMergeResult;
  assert.equal(result.brand.id, targetId);
  assert.ok(result.brand.aliases.includes(source.name));
  assert.ok(result.brand.aliases.includes(`源别名 ${T}`));
  assert.ok(result.brand.aliases.includes(`目标别名 ${T}`));
  assert.equal(result.brand.entityId, `entity-source-${T}`);
  assert.equal(result.moved.aliases, 2);
  assert.equal(result.moved.channels, 2);
  assert.equal(result.moved.events, 2);
  assert.equal(result.moved.follow, true);
  assert.deepEqual(result.brand.counts, { channels: 3, events: 2 });

  assert.equal((await api("GET", `/api/studio/brands/${sourceId}`)).statusCode, 404);
  assert.equal((await sql`SELECT 1 FROM wc_brands WHERE id = ${sourceId}`).length, 0);
  assert.equal((await sql`SELECT 1 FROM wc_channel_brands WHERE brand_id = ${sourceId}`).length, 0);
  assert.equal((await sql`SELECT 1 FROM wc_channel_brands WHERE brand_id = ${targetId}`).length, 3);
  assert.equal((await sql`SELECT 1 FROM wc_event_brands WHERE brand_id = ${sourceId}`).length, 0);
  assert.deepEqual(
    (await sql<{ story_id: number }[]>`SELECT story_id FROM wc_event_brands WHERE brand_id = ${targetId} ORDER BY story_id`).map((row) => Number(row.story_id)).sort((a, b) => a - b),
    [sourceEvent, sharedEvent].sort((a, b) => a - b),
  );
  const metas = await sql<{ story_id: number; brand_ids: string[] }[]>`
    SELECT story_id, brand_ids FROM wc_event_meta WHERE story_id IN (${sourceEvent}, ${sharedEvent}) ORDER BY story_id`;
  assert.deepEqual(metas.map((row) => [Number(row.story_id), row.brand_ids]), [
    [sourceEvent, [targetId]],
    [sharedEvent, [targetId]],
  ]);

  const follows = await sql<{ id: number; target_id: string; rule: string; keywords: string[]; blocked_keywords: string[]; event_types: string[] }[]>`
    SELECT id, target_id, rule, keywords, blocked_keywords, event_types FROM wc_follows
    WHERE target_type = 'brand' AND target_id IN (${sourceId}, ${targetId})`;
  assert.equal(follows.length, 1);
  assert.equal(follows[0]?.id, Number(targetFollow!.id));
  assert.equal(follows[0]?.rule, "all");
  assert.deepEqual([...follows[0]!.keywords].sort(), ["目标关注词", "源关注词"].sort());
  assert.deepEqual(follows[0]!.blocked_keywords, ["源屏蔽词"]);
  assert.deepEqual(follows[0]!.event_types, ["model_release"]);
  const [alert] = await sql<{ rule_id: number }[]>`SELECT rule_id FROM wc_alerts WHERE dedupe_key = ${`alert-${T}`}`;
  assert.equal(alert?.rule_id, Number(targetFollow!.id));

  const [audit] = await sql<{ before: unknown; after: unknown }[]>`
    SELECT before, after FROM audit_log WHERE action = 'brand.merge' AND subject = ${`brand:${targetId}`}`;
  assert.ok(audit);
  assert.equal((audit!.after as { moved: { events: number } }).moved.events, 2);
  assert.equal(source.id, sourceId);
  assert.equal(target.id, targetId);
});

test("the detail merge route accepts only the surviving brand", async () => {
  const from = await create({ id: `brand-nested-from-${T}`, name: `嵌套源 ${T}` });
  const into = await create({ id: `brand-nested-into-${T}`, name: `嵌套目标 ${T}` });
  const response = await api("POST", `/api/studio/brands/${from.id}/merge`, { into: into.id });
  assert.equal(response.statusCode, 200, response.body);
  const result = response.json() as BrandMergeResult;
  assert.equal(result.brand.id, into.id);
  assert.equal((await api("GET", `/api/studio/brands/${from.id}`)).statusCode, 404);
});

test("deleting a brand keeps its events and channels but removes links and follows", async () => {
  const id = `brand-delete-${T}`;
  await create({ id, name: `品牌 Delete ${T}` });
  const channelId = `channel-delete-${T}`;
  await channel(channelId, `https://example.com/${channelId}`);
  await sql`INSERT INTO wc_channel_brands (channel_id, brand_id) VALUES (${channelId}, ${id})`;
  const eventId = await story(`删除品牌事件 ${T}`);
  await sql`INSERT INTO wc_event_brands (story_id, brand_id) VALUES (${eventId}, ${id})`;
  await sql`INSERT INTO wc_event_meta (story_id, brand_ids) VALUES (${eventId}, ${[id]}::text[])`;
  await sql`INSERT INTO wc_follows (target_type, target_id) VALUES ('brand', ${id})`;

  const response = await api("DELETE", `/api/studio/brands/${id}`);
  assert.equal(response.statusCode, 204);
  assert.equal((await sql`SELECT 1 FROM wc_brands WHERE id = ${id}`).length, 0);
  assert.equal((await sql`SELECT 1 FROM wc_channels WHERE id = ${channelId}`).length, 1);
  assert.equal((await sql`SELECT 1 FROM wc_channel_brands WHERE brand_id = ${id}`).length, 0);
  assert.equal((await sql`SELECT 1 FROM wc_event_brands WHERE brand_id = ${id}`).length, 0);
  assert.equal((await sql`SELECT 1 FROM wc_follows WHERE target_type = 'brand' AND target_id = ${id}`).length, 0);
  const [meta] = await sql<{ brand_ids: string[] }[]>`SELECT brand_ids FROM wc_event_meta WHERE story_id = ${eventId}`;
  assert.deepEqual(meta?.brand_ids, []);
  assert.equal((await sql`SELECT 1 FROM stories WHERE id = ${eventId}`).length, 1);
  assert.equal((await sql`SELECT 1 FROM audit_log WHERE action = 'brand.delete' AND subject = ${`brand:${id}`}`).length, 1);
});
