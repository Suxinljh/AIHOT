// The style presets: the editor can add, edit and delete their own; a built-in one stays; a topic
// can use another preset for itself without changing the preset.
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
import { resolvePreset } from "../presets.ts";
import type { StudioTopic, StylePreset } from "../studio-types.ts";

const T = tag();
const CSRF = "dev";
const originalDevAdmin = config.devAdmin;
let app: Awaited<ReturnType<typeof buildApp>>;

before(async () => {
  installModules([wechatHotServer]);
  config.devAdmin = { displayName: "WCH-22 presets test" };
  app = await buildApp();
  await sql`INSERT INTO wc_style_presets (id, kind, name, column_type, target_reader, word_count, tone, title_preference, forbidden_expressions, builtin)
    VALUES (${`writing-news-${T}`}, 'writing', ${`科技快讯 ${T}`}, 'news', '关注科技行业的读者', 1200, '冷静直接', '事实在前', ${["震惊"]}::text[], true)`;
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

test("a preset of the editor's own can be created and edited", async () => {
  const created = await api("POST", "/api/studio/presets", {
    name: `我的风格 ${T}`,
    columnType: "insight",
    targetReader: "关注产业变化的人",
    wordCount: 1800,
    tone: "克制",
    titlePreference: "用变化做标题",
    forbiddenExpressions: ["必看", "封神"],
  });
  assert.equal(created.statusCode, 201, created.body);
  const preset = created.json() as StylePreset;
  assert.equal(preset.name, `我的风格 ${T}`);
  assert.equal(preset.columnType, "insight");
  assert.equal(preset.wordCount, 1800);
  assert.equal(preset.builtin, false);
  assert.deepEqual(preset.forbiddenExpressions, ["必看", "封神"]);

  const edited = await api("PATCH", `/api/studio/presets/${preset.id}`, { tone: "更克制", forbiddenExpressions: ["必看"] });
  assert.equal(edited.statusCode, 200, edited.body);
  assert.equal((edited.json() as StylePreset).tone, "更克制");
  assert.deepEqual((edited.json() as StylePreset).forbiddenExpressions, ["必看"]);

  const listed = await api("GET", "/api/studio/presets");
  const writing = (listed.json() as { writing: StylePreset[] }).writing;
  assert.ok(writing.some((row) => row.id === preset.id));
});

test("a formatting preset can be created and edited", async () => {
  const created = await api("POST", "/api/studio/presets", {
    name: `我的排版 ${T}`,
    kind: "format",
    format: { body: { fontSize: 17, lineHeight: 1.9 }, title: { fontSize: 23 }, image: { borderRadius: 6 } },
  });
  assert.equal(created.statusCode, 201, created.body);
  const preset = created.json() as StylePreset;
  assert.equal(preset.kind, "format");
  assert.equal((preset.format.body as { fontSize?: number }).fontSize, 17);

  const edited = await api("PATCH", `/api/studio/presets/${preset.id}`, {
    format: { ...preset.format, body: { ...(preset.format.body as object), fontSize: 18 } },
  });
  assert.equal(edited.statusCode, 200, edited.body);
  assert.equal(((edited.json() as StylePreset).format.body as { fontSize?: number }).fontSize, 18);

  const listed = (await api("GET", "/api/studio/presets")).json() as { format: StylePreset[] };
  assert.ok(listed.format.some((row) => row.id === preset.id));

  const removed = await api("DELETE", `/api/studio/presets/${preset.id}`);
  assert.equal(removed.statusCode, 200);
  assert.equal((removed.json() as { id: string }).id, preset.id);
});

test("a built-in preset stays and a deleted one names its fallback", async () => {
  const builtin = await api("DELETE", `/api/studio/presets/writing-news-${T}`);
  assert.equal(builtin.statusCode, 409);
  assert.match((builtin.json() as { detail: string }).detail, /内置/);

  const own = await api("POST", "/api/studio/presets", { name: `待删除 ${T}`, columnType: "news" });
  const preset = own.json() as StylePreset;
  const removed = await api("DELETE", `/api/studio/presets/${preset.id}`);
  assert.equal(removed.statusCode, 200, removed.body);
  const body = removed.json() as { id: string; fallback: { id: string; name: string } | null };
  assert.equal(body.id, preset.id);
  assert.ok(body.fallback, "the column falls back to a built-in preset");
  assert.equal((await sql`SELECT 1 FROM wc_style_presets WHERE id = ${preset.id}`).length, 0);
});

test("a topic follows its column and may use another preset for itself", async () => {
  const own = await api("POST", "/api/studio/presets", { name: `选题专用 ${T}`, columnType: "news" });
  const preset = own.json() as StylePreset;

  const [story] = await sql<{ id: number }[]>`
    INSERT INTO stories (public_id, title, first_report_at, latest_at, created_at, updated_at)
    VALUES (${randomUUID()}, ${`${T} 风格事件`}, now(), now(), now(), now()) RETURNING id`;
  const created = await api("POST", "/api/studio/topics", { storyId: Number(story!.id), columnType: "news" });
  assert.equal(created.statusCode, 201, created.body);
  const topic = created.json() as StudioTopic;
  assert.equal(topic.stylePresetId, null);
  assert.equal(topic.stylePreset?.id, `writing-news-${T}`, "the column's built-in preset applies");

  const switched = await api("PATCH", `/api/studio/topics/${topic.id}/preset`, { presetId: preset.id });
  assert.equal(switched.statusCode, 200, switched.body);
  const after = switched.json() as StudioTopic;
  assert.equal(after.stylePresetId, preset.id);
  assert.equal(after.stylePreset?.id, preset.id);
  // The preset itself is untouched.
  const [unchanged] = await sql<{ tone: string | null }[]>`SELECT tone FROM wc_style_presets WHERE id = ${preset.id}`;
  assert.equal(unchanged?.tone, null);

  const missing = await api("PATCH", `/api/studio/topics/${topic.id}/preset`, { presetId: "no-such-preset" });
  assert.equal(missing.statusCode, 400);

  const resolved = await resolvePreset("news", null);
  assert.equal(resolved?.id, `writing-news-${T}`);
});

test("the preset endpoints need a session and a CSRF token", async () => {
  const devAdmin = config.devAdmin;
  config.devAdmin = null;
  try {
    const guest = await app.inject({ method: "GET", url: "/api/studio/presets" });
    assert.equal(guest.statusCode, 401);
  } finally {
    config.devAdmin = devAdmin;
  }
  const noCsrf = await app.inject({
    method: "POST",
    url: "/api/studio/presets",
    payload: { name: "无 token" },
    headers: { "content-type": "application/json" },
  });
  assert.equal(noCsrf.statusCode, 403);
});
