// Follow rules: a brand's follow and its channel selection are written together, a single channel can
// be paused or removed without cancelling the follow, and the matcher decides which events are
// updates for the rule the editor chose.
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
import { followMatches, followMuted, type FollowSettings } from "../follows.ts";
import type { BrandDetail } from "../studio-types.ts";

const T = tag();
const CSRF = "dev";
const originalDevAdmin = config.devAdmin;
let app: Awaited<ReturnType<typeof buildApp>>;
const brandId = `follow-brand-${T}`;
const channelId = `follow-channel-${T}`;
const otherChannelId = `follow-channel-other-${T}`;

before(async () => {
  installModules([wechatHotServer]);
  config.devAdmin = { displayName: "WCH-12 follow test" };
  app = await buildApp();
  await sql`INSERT INTO wc_brands (id, name) VALUES (${brandId}, ${`关注品牌 ${T}`})`;
  await sql`INSERT INTO sources (id, name, kind, config, tier, participation_mode, first_party, next_fetch_at) VALUES
    (${`${T}-source`}, '官网信源', 'rss', ${sql.json({ feedUrl: "https://example.com/feed.xml" })}, 'T1', 'editorial', true, '2100-01-01'),
    (${`${T}-other-source`}, 'X 信源', 'x_search', ${sql.json({ query: "example" })}, 'T2', 'editorial', false, '2100-01-01')`;
  await sql`INSERT INTO wc_channels (id, type, display_name, url, source_id) VALUES
    (${channelId}, 'official_site', ${`官网 ${T}`}, ${`https://example.com/${channelId}`}, ${`${T}-source`}),
    (${otherChannelId}, 'x', ${`X ${T}`}, ${`https://example.com/${otherChannelId}`}, ${`${T}-other-source`})`;
  await sql`INSERT INTO wc_channel_brands (channel_id, brand_id) VALUES
    (${channelId}, ${brandId}), (${otherChannelId}, ${brandId})`;
});

after(async () => {
  await app.close();
  await stopBoss();
  config.devAdmin = originalDevAdmin;
  await closeDb();
});

async function api(method: "PUT" | "DELETE" | "PATCH", url: string, payload?: unknown) {
  return app.inject({
    method,
    url,
    ...(payload === undefined ? {} : { payload: payload as never }),
    headers: {
      ...(payload === undefined ? {} : { "content-type": "application/json" }),
      "x-csrf-token": CSRF,
    },
  });
}

async function brand(): Promise<BrandDetail> {
  const response = await app.inject({ method: "GET", url: `/api/studio/brands/${brandId}` });
  assert.equal(response.statusCode, 200, response.body);
  return response.json() as BrandDetail;
}

test("following a brand needs a session and the CSRF token", async () => {
  const devAdmin = config.devAdmin;
  config.devAdmin = null;
  try {
    const guest = await app.inject({
      method: "PUT",
      url: `/api/studio/brands/${brandId}/follow`,
      payload: { rule: "all" },
      headers: { "content-type": "application/json" },
    });
    assert.equal(guest.statusCode, 401);
  } finally {
    config.devAdmin = devAdmin;
  }
  const noCsrf = await app.inject({
    method: "PUT",
    url: `/api/studio/brands/${brandId}/follow`,
    payload: { rule: "all" },
    headers: { "content-type": "application/json" },
  });
  assert.equal(noCsrf.statusCode, 403);
});

test("a follow keeps its rule, its channels and its mute", async () => {
  const created = await api("PUT", `/api/studio/brands/${brandId}/follow`, {
    rule: "keywords",
    keywords: ["发布", "开放权重"],
    blockedKeywords: ["促销"],
    eventTypes: ["模型发布"],
    notify: true,
    frequency: "daily",
    channelIds: [channelId],
  });
  assert.equal(created.statusCode, 200, created.body);
  const follow = created.json() as FollowSettings;
  assert.equal(follow.rule, "keywords");
  assert.deepEqual(follow.keywords, ["发布", "开放权重"]);
  assert.deepEqual(follow.blockedKeywords, ["促销"]);
  assert.deepEqual(follow.eventTypes, ["模型发布"]);
  assert.equal(follow.frequency, "daily");
  assert.equal(follow.mutedUntil, null);

  const detail = await brand();
  assert.ok(detail.follow);
  assert.equal(detail.follow?.rule, "keywords");
  assert.equal(detail.follow?.frequency, "daily");
  assert.equal(detail.followed, true);
  assert.equal(detail.channels.find((channel) => channel.id === channelId)?.followed, true);
  assert.equal(detail.channels.find((channel) => channel.id === otherChannelId)?.followed, false);

  const muted = await api("PUT", `/api/studio/brands/${brandId}/follow`, { mutedUntil: new Date(Date.now() + 3600_000).toISOString() });
  assert.equal(muted.statusCode, 200, muted.body);
  assert.ok((muted.json() as FollowSettings).mutedUntil);
  const mutedDetail = await brand();
  assert.ok(mutedDetail.follow?.mutedUntil);
  assert.equal(mutedDetail.follow?.rule, "keywords");
});

test("a channel of another brand is refused and an empty command is a readable error", async () => {
  const wrong = await api("PUT", `/api/studio/brands/${brandId}/follow`, { channelIds: ["not-a-channel-of-this-brand"] });
  assert.equal(wrong.statusCode, 400);
  const empty = await api("PUT", `/api/studio/brands/${brandId}/follow`, {});
  assert.equal(empty.statusCode, 400);
  const badRule = await api("PUT", `/api/studio/brands/${brandId}/follow`, { rule: "sometimes" });
  assert.equal(badRule.statusCode, 400);
  const missingBrand = await api("PUT", `/api/studio/brands/no-such-brand/follow`, { rule: "all" });
  assert.equal(missingBrand.statusCode, 404);
});

test("pausing or removing one channel leaves the brand's follow", async () => {
  const paused = await api("PATCH", `/api/studio/brands/${brandId}/channels/${channelId}`, { followed: false });
  assert.equal(paused.statusCode, 200, paused.body);
  const afterPause = await brand();
  assert.ok(afterPause.follow, "the follow stays when one channel is paused");
  assert.equal(afterPause.channels.find((channel) => channel.id === channelId)?.followed, false);

  const muted = await api("PATCH", `/api/studio/brands/${brandId}/channels/${otherChannelId}`, { mutedUntil: new Date(Date.now() + 600_000).toISOString() });
  assert.equal(muted.statusCode, 200, muted.body);
  const afterMute = await brand();
  assert.ok(afterMute.follow);
  assert.ok(afterMute.channels.find((channel) => channel.id === otherChannelId)?.mutedUntil);

  const unavailable = await api("PATCH", `/api/studio/channels/${otherChannelId}`, { availability: "unavailable" });
  assert.equal(unavailable.statusCode, 200, unavailable.body);
  assert.equal((unavailable.json() as { availability: string }).availability, "unavailable");
  const afterUnavailable = await brand();
  assert.ok(afterUnavailable.follow, "a disabled channel does not cancel the follow");

  const deleted = await api("DELETE", `/api/studio/channels/${otherChannelId}`);
  assert.equal(deleted.statusCode, 204);
  const afterDelete = await brand();
  assert.ok(afterDelete.follow, "a removed channel does not cancel the follow");
  assert.equal(afterDelete.channels.length, 1);
  assert.ok((await sql`SELECT 1 FROM wc_channels WHERE id = ${otherChannelId}`).length === 0);
});

test("cancelling the follow stops the watching and leaves the channels", async () => {
  const removed = await api("DELETE", `/api/studio/brands/${brandId}/follow`);
  assert.equal(removed.statusCode, 204);
  const detail = await brand();
  assert.equal(detail.follow, null);
  assert.equal(detail.followed, false);
  assert.equal(detail.channels.length, 1);
  assert.equal(detail.channels[0]?.followed, false);
  const again = await api("DELETE", `/api/studio/brands/${brandId}/follow`);
  assert.equal(again.statusCode, 404);
});

test("the matcher decides which events are updates", () => {
  const event = {
    title: "OpenAI 发布新模型",
    summary: "官方公布了价格。",
    verificationStatus: "confirmed" as const,
    curated: true,
    eventType: "模型发布",
    sourceIds: ["source-a"],
  };
  const base: FollowSettings = {
    rule: "all",
    keywords: [],
    blockedKeywords: [],
    eventTypes: [],
    notify: true,
    frequency: "immediate",
    mutedUntil: null,
  };
  assert.equal(followMatches(base, event).matched, true);
  assert.equal(followMatches({ ...base, blockedKeywords: ["促销"] }, { ...event, title: "发布会促销" }).matched, false);
  assert.equal(followMatches({ ...base, eventTypes: ["融资/并购"] }, event).matched, false);
  assert.equal(followMatches({ ...base, rule: "major" }, { ...event, curated: false }).matched, false);
  assert.equal(followMatches({ ...base, rule: "major" }, event).matched, true);
  assert.equal(followMatches({ ...base, rule: "selected" }, event, ["source-b"]).matched, false);
  assert.equal(followMatches({ ...base, rule: "selected" }, event, ["source-a"]).matched, true);
  assert.equal(followMatches({ ...base, rule: "keywords", keywords: ["新模型"] }, event).matched, true);
  assert.equal(followMatches({ ...base, rule: "keywords", keywords: ["发布会"] }, event).matched, false);
  assert.equal(followMuted({ ...base, mutedUntil: new Date(Date.now() + 1000) }), true);
  assert.equal(followMuted({ ...base, mutedUntil: new Date(Date.now() - 1000) }), false);
  assert.equal(followMuted(base), false);
});

test("a brand without a follow is never an update", async () => {
  const detail = await brand();
  assert.equal(detail.follow, null);
  assert.equal((await sql`SELECT 1 FROM wc_follows WHERE target_type = 'brand' AND target_id = ${brandId}`).length, 0);
  const id = randomUUID();
  assert.ok(id);
});
