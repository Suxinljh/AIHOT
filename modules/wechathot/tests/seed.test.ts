// Workbench seeds and the first private read APIs: brands carry the ENTITIES names, aliases, industries
// and websites; candidate channels stay pending until their identity is confirmed; built-in presets are
// readable from the settings endpoint; and running the seed again changes nothing.
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { config } from "@aihot/backend/config";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { installModules } from "@aihot/backend/modules";
import { ENTITIES } from "@aihot/industry/taxonomy";
import { buildApp } from "../../../apps/api/src/app.ts";
import { seedWeChatHot } from "../seed.ts";
import { wechatHotServer } from "../server.ts";
import type { BrandListItem, StudioPresets } from "../studio-types.ts";

const originalDevAdmin = config.devAdmin;
installModules([wechatHotServer]);
config.devAdmin = { displayName: "WCH-5 seed test" };
await seedWeChatHot();
const app = await buildApp();

after(async () => {
  await app.close();
  await stopBoss();
  config.devAdmin = originalDevAdmin;
  await closeDb();
});

test("brand seeds expose the canonical name, aliases, industries and website", async () => {
  const [openai] = await sql<{
    name: string;
    aliases: string[];
    website: string | null;
    industries: string[];
    verified_status: string;
    notes: string | null;
  }[]>`
    SELECT name, aliases, website, industries, verified_status, notes
    FROM wc_brands WHERE id = 'openai'`;
  assert.equal(openai.name, "OpenAI");
  assert.ok(openai.aliases.includes("ChatGPT"));
  assert.equal(openai.website, "https://openai.com/");
  assert.deepEqual(openai.industries, ["ai-models", "software"]);
  assert.equal(openai.verified_status, "verified");
  assert.match(openai.notes ?? "", /OpenAI/);

  const [counts] = await sql<{ brands: number; channels: number; links: number; linked: number; presets: number }[]>`
    SELECT (SELECT count(*) FROM wc_brands)::int AS brands,
           (SELECT count(*) FROM wc_channels)::int AS channels,
           (SELECT count(*) FROM wc_channel_brands)::int AS links,
           (SELECT count(DISTINCT brand_id) FROM wc_channel_brands)::int AS linked,
           (SELECT count(*) FROM wc_style_presets)::int AS presets`;
  assert.equal(counts.brands, Object.keys(ENTITIES).length);
  // The auto, game and film brands land with WCH-35; their channels and sources follow with WCH-36.
  assert.ok(counts.channels > 0);
  assert.ok(counts.links >= counts.linked);
  assert.equal(counts.presets, 4);
});

test("built-in writing and formatting presets are seeded", async () => {
  const rows = await sql<{ kind: string; name: string; builtin: boolean; column_type: string | null }[]>`
    SELECT kind, name, builtin, column_type FROM wc_style_presets ORDER BY kind, name`;
  assert.equal(rows.filter((row) => row.kind === "writing").length, 2);
  assert.equal(rows.filter((row) => row.kind === "format").length, 2);
  assert.ok(rows.every((row) => row.builtin));
  assert.deepEqual(
    rows.filter((row) => row.kind === "writing").map((row) => row.column_type).sort(),
    ["insight", "news"],
  );
});

test("first channels include official news, X, GitHub and pending WeChat candidates", async () => {
  const types = await sql<{ type: string }[]>`SELECT DISTINCT type FROM wc_channels ORDER BY type`;
  assert.deepEqual(types.map((row) => row.type), ["github", "official_site", "wechat", "x"]);

  const [wechat] = await sql<{ count: number }[]>`
    SELECT count(*)::int AS count FROM wc_channels
    WHERE type = 'wechat' AND verification = 'pending' AND provider = 'dajiala'`;
  assert.ok(wechat.count > 0);
  const [notPending] = await sql<{ count: number }[]>`
    SELECT count(*)::int AS count FROM wc_channels WHERE type = 'wechat' AND verification <> 'pending'`;
  assert.equal(notPending.count, 0);

  const [verifiedGithub] = await sql<{ count: number }[]>`
    SELECT count(*)::int AS count FROM wc_channels WHERE type = 'github' AND verification = 'verified'`;
  assert.ok(verifiedGithub.count > 0);
  const [pendingGithub] = await sql<{ count: number }[]>`
    SELECT count(*)::int AS count FROM wc_channels WHERE type = 'github' AND verification = 'pending'`;
  assert.ok(pendingGithub.count > 0);
});

test("studio reads require the admin session and return no-store/noindex", async () => {
  const devAdmin = config.devAdmin;
  config.devAdmin = null;
  const guest = await app.inject({ method: "GET", url: "/api/studio/brands" });
  config.devAdmin = devAdmin;
  assert.equal(guest.statusCode, 401);
  assert.equal(guest.headers["cache-control"], "no-store");
  assert.equal(guest.headers["x-robots-tag"], "noindex, nofollow");

  const brands = await app.inject({ method: "GET", url: "/api/studio/brands?q=openai" });
  assert.equal(brands.statusCode, 200);
  assert.equal(brands.headers["cache-control"], "no-store");
  assert.equal(brands.headers["x-robots-tag"], "noindex, nofollow");
  const brandBody = brands.json() as { items: BrandListItem[] };
  assert.ok(brandBody.items.some((item) => item.id === "openai" && item.name === "OpenAI"));

  const hardware = await app.inject({ method: "GET", url: "/api/studio/brands?industry=hardware" });
  assert.equal(hardware.statusCode, 200);
  const hardwareBody = hardware.json() as { items: BrandListItem[] };
  assert.ok(hardwareBody.items.length > 0);
  assert.ok(hardwareBody.items.every((item) => item.industries.includes("hardware")));
  assert.ok(hardwareBody.items.some((item) => item.id === "nvidia"));

  const presets = await app.inject({ method: "GET", url: "/api/studio/presets" });
  assert.equal(presets.statusCode, 200);
  assert.equal(presets.headers["cache-control"], "no-store");
  const presetBody = presets.json() as StudioPresets;
  assert.equal(presetBody.writing.length, 2);
  assert.equal(presetBody.format.length, 2);
  assert.ok(presetBody.writing.every((preset) => preset.builtin));
});

test("seeding again is idempotent and preserves existing rows", async () => {
  const second = await seedWeChatHot();
  assert.deepEqual(second, { brands: 0, channels: 0, links: 0, presets: 0 });
});
