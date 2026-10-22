// External notifications: an alert is delivered once per channel, filters apply, an immediate channel
// is recorded, and the digest sends the remaining alerts once per day.
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
import { deliverAlert, saveNotifySettings, sendAlertDigest, sendNotifyTest } from "../notify.ts";

const T = tag();
const CSRF = "dev";
const originalDevAdmin = config.devAdmin;
let app: Awaited<ReturnType<typeof buildApp>>;
let alertId: number;

async function eventAlert(title: string, newsValue: number): Promise<number> {
  const [story] = await sql<{ id: number }[]>`
    INSERT INTO stories (public_id, title, first_report_at, latest_at, created_at, updated_at)
    VALUES (${randomUUID()}, ${title}, now(), now(), now(), now()) RETURNING id`;
  await sql`
    INSERT INTO wc_event_meta (story_id, summary, categories, brand_ids, channel_types, source_tiers, event_type,
      verification_status, updated, first_report_at, latest_at, report_count, source_count, heat, news_value,
      selected_count, evidence_source_count)
    VALUES (${story!.id}, ${`${T} 摘要`}, ${["auto"]}::text[], '{}'::text[], ${["official_site"]}::text[],
      ${["T1"]}::text[], '新车发布', 'confirmed', false, now(), now(), 1, 1, 70, ${newsValue}, 1, 1)`;
  const [alert] = await sql<{ id: number }[]>`
    INSERT INTO wc_alerts (story_id, kind, dedupe_key, reason)
    VALUES (${story!.id}, 'new_event', ${`${T}:${title}`}, ${`关注品牌：${title}`}) RETURNING id`;
  return Number(alert!.id);
}

before(async () => {
  installModules([wechatHotServer]);
  config.devAdmin = { displayName: "WCH-30 notify test" };
  app = await buildApp();
  alertId = await eventAlert(`${T} 新车发布事件`, 90);
  await saveNotifySettings({ feishu: true, email: false, minScore: null, digestHour: 9 });
});

after(async () => {
  await app.close();
  await stopBoss();
  config.devAdmin = originalDevAdmin;
  await closeDb();
});

test("an enabled channel delivers an alert once", async () => {
  const sent: string[] = [];
  const deps = { feishu: async (title: string) => { sent.push(title); return "sent" as const; } };
  const first = await deliverAlert(alertId, deps);
  assert.deepEqual(first, [{ target: "feishu-alerts", status: "sent" }]);
  assert.equal(sent.length, 1);

  const again = await deliverAlert(alertId, deps);
  assert.deepEqual(again, [], "the same alert is never sent twice");
  assert.equal(sent.length, 1);
  const [row] = await sql<{ sent_at: Date | null }[]>`SELECT sent_at FROM wc_alerts WHERE id = ${alertId}`;
  assert.ok(row?.sent_at);
});

test("the importance threshold blocks an alert before any channel is touched", async () => {
  const low = await eventAlert(`${T} 低价值事件`, 30);
  await saveNotifySettings({ minScore: 60 });
  let called = 0;
  const results = await deliverAlert(low, { feishu: async () => { called += 1; return "sent"; } });
  assert.deepEqual(results, []);
  assert.equal(called, 0);
  await saveNotifySettings({ minScore: null });
});

test("an enabled email target without SMTP is recorded as disabled, not retried", async () => {
  await saveNotifySettings({ feishu: false, email: true });
  const second = await eventAlert(`${T} 邮件事件`, 90);
  const results = await deliverAlert(second);
  assert.deepEqual(results, [{ target: "email-alerts", status: "disabled" }]);
  await saveNotifySettings({ feishu: true, email: false });
});

test("the digest sends undelivered alerts once per day", async () => {
  const a = await eventAlert(`${T} 摘要一`, 90);
  const b = await eventAlert(`${T} 摘要二`, 80);
  const now = new Date();
  const sent: string[] = [];
  const deps = { feishu: async (title: string) => { sent.push(title); return "sent" as const; } };
  const first = await sendAlertDigest(now, deps);
  assert.equal(first.length, 1);
  assert.equal(first[0]?.status, "sent");
  assert.ok((first[0]?.count ?? 0) >= 2);

  const again = await sendAlertDigest(now, deps);
  assert.deepEqual(again, [], "the same day is not sent twice");
  const rows = await sql<{ sent_at: Date | null }[]>`SELECT sent_at FROM wc_alerts WHERE id IN (${a}, ${b})`;
  assert.ok(rows.every((row) => row.sent_at), "delivered alerts carry sent_at");
});

test("the test endpoint reports the enabled channels", async () => {
  await saveNotifySettings({ feishu: true });
  const results = await sendNotifyTest(new Date(), { feishu: async () => "sent" });
  assert.ok(results.some((row) => row.target === "feishu-alerts" && row.status === "sent"));
  const response = await app.inject({ method: "POST", url: "/api/studio/notify/test", headers: { "x-csrf-token": CSRF } });
  assert.equal(response.statusCode, 200, response.body);
});
