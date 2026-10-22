// External notifications for the studio's own alerts. The in-site alert is the source of truth; this
// layer applies the editor's filters and hands one message per channel to the backend's delivery
// record, which owns `deliveries` (dedupe, attempts, failure reasons). Secrets stay in env.
import { z } from "zod";
import { sql } from "@aihot/backend/db";
import { deliverMessage, type MessageSenders } from "@aihot/backend/notify/deliver";
import type { ChannelType } from "./studio-types.ts";

const SETTINGS_KEY = "alerts.notify";

export interface NotifySettings {
  immediate: boolean;
  digestHour: number;
  minScore: number | null;
  eventTypes: string[];
  channelTypes: ChannelType[];
  feishu: boolean;
  email: boolean;
}

export const DEFAULT_NOTIFY: NotifySettings = {
  immediate: true,
  digestHour: 9,
  minScore: null,
  eventTypes: [],
  channelTypes: [],
  feishu: false,
  email: false,
};

const SettingsSchema = z.object({
  immediate: z.boolean().optional(),
  digestHour: z.number().int().min(0).max(23).optional(),
  minScore: z.number().int().min(0).max(100).nullable().optional(),
  eventTypes: z.array(z.string().trim().max(100)).max(50).optional(),
  channelTypes: z.array(z.enum(["official_site", "x", "wechat", "weibo", "github", "media", "custom"])).max(7).optional(),
  feishu: z.boolean().optional(),
  email: z.boolean().optional(),
}).strict();

/** The two alert targets exist from the first delivery on; they start disabled. */
async function ensureAlertTargets(): Promise<void> {
  await sql`
    INSERT INTO notify_targets (key, purpose, kind, enabled, config_ref, note) VALUES
      ('feishu-alerts', 'alert', 'feishu_chat', false, 'FEISHU_ALERT_CHAT_ID', '飞书提醒'),
      ('email-alerts', 'alert', 'email', false, 'SMTP_URL', '邮件提醒')
    ON CONFLICT (key) DO NOTHING`;
}

export async function loadNotifySettings(): Promise<NotifySettings> {
  const [row] = await sql<{ value: Partial<NotifySettings> }[]>`SELECT value FROM settings WHERE key = ${SETTINGS_KEY}`;
  return { ...DEFAULT_NOTIFY, ...(row?.value ?? {}) };
}

/** Saves the settings and mirrors the channel toggles onto the delivery targets. */
export async function saveNotifySettings(input: unknown): Promise<NotifySettings> {
  const patch = SettingsSchema.parse(input);
  const next = { ...(await loadNotifySettings()), ...patch };
  await sql`
    INSERT INTO settings (key, value, updated_at) VALUES (${SETTINGS_KEY}, ${sql.json(next as never)}, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
  await ensureAlertTargets();
  await sql`UPDATE notify_targets SET enabled = ${next.feishu}, updated_at = now() WHERE key = 'feishu-alerts'`;
  await sql`UPDATE notify_targets SET enabled = ${next.email}, updated_at = now() WHERE key = 'email-alerts'`;
  return next;
}

interface AlertRow {
  id: number;
  reason: string;
  story_title: string | null;
  story_public_id: string | null;
  brand_name: string | null;
  news_value: number | string | null;
  event_type: string | null;
  channel_types: string[] | null;
  created_at: Date;
}

async function alertRows(where: "one" | "digest", id = 0, since = new Date()): Promise<AlertRow[]> {
  const rows = await sql<AlertRow[]>`
    SELECT a.id, a.reason, s.title AS story_title, s.public_id::text AS story_public_id,
           b.name AS brand_name, m.news_value, m.event_type, m.channel_types, a.created_at
    FROM wc_alerts a
    LEFT JOIN stories s ON s.id = a.story_id
    LEFT JOIN wc_follows f ON f.id = a.rule_id
    LEFT JOIN wc_brands b ON b.id = f.target_id
    LEFT JOIN wc_event_meta m ON m.story_id = a.story_id
    WHERE ${where === "one" ? sql`a.id = ${id}` : sql`a.status = 'unread' AND a.sent_at IS NULL AND a.created_at >= ${since}`}
    ORDER BY a.created_at DESC`;
  return rows;
}

function passesFilters(alert: AlertRow, settings: NotifySettings): boolean {
  const score = alert.news_value === null ? null : Number(alert.news_value);
  if (settings.minScore !== null && (score === null || score < settings.minScore)) return false;
  if (settings.eventTypes.length && (!alert.event_type || !settings.eventTypes.includes(alert.event_type))) return false;
  if (settings.channelTypes.length && !(alert.channel_types ?? []).some((type) => settings.channelTypes.includes(type as ChannelType))) return false;
  return true;
}

function lines(alert: AlertRow): string[] {
  const out = [alert.reason];
  if (alert.story_public_id) out.push(`事件：${process.env.SITE_URL ?? ""}/studio/events/${alert.story_public_id}`);
  if (alert.brand_name) out.push(`品牌：${alert.brand_name}`);
  return out;
}

/** One alert to every enabled channel; the same alert is never sent twice. */
export async function deliverAlert(alertId: number, senders: MessageSenders = {}): Promise<Array<{ target: string; status: string }>> {
  const settings = await loadNotifySettings();
  const [alert] = await alertRows("one", alertId);
  if (!alert || !passesFilters(alert, settings)) return [];
  const results = await deliverMessage({
    subjectKind: "alert",
    subjectId: String(alertId),
    dedupeKey: `alert:${alertId}`,
    title: alert.story_title ?? "关注更新",
    lines: lines(alert),
  }, senders);
  if (results.some((row) => row.status === "sent")) {
    await sql`UPDATE wc_alerts SET sent_at = coalesce(sent_at, now()) WHERE id = ${alertId}`;
  }
  return results;
}

function beijingDate(now: Date): string {
  const at = new Date(now.getTime() + 8 * 3600_000);
  return `${at.getUTCFullYear()}-${String(at.getUTCMonth() + 1).padStart(2, "0")}-${String(at.getUTCDate()).padStart(2, "0")}`;
}

/**
 * One digest for the alerts that were not delivered since the last run. Immediate alerts already carry
 * sent_at, so they never repeat inside the digest; a rerun on the same day is blocked by its dedupe key.
 */
export async function sendAlertDigest(now = new Date(), senders: MessageSenders = {}): Promise<Array<{ target: string; status: string; count: number }>> {
  const settings = await loadNotifySettings();
  const since = new Date(now.getTime() - 24 * 3600_000);
  const alerts = (await alertRows("digest", 0, since)).filter((row) => passesFilters(row, settings));
  if (!alerts.length) return [];
  const day = beijingDate(now);
  const body = alerts.slice(0, 20).map((alert) => `${alert.brand_name ? `[${alert.brand_name}] ` : ""}${alert.story_title ?? alert.reason}`);
  const results = await deliverMessage({
    subjectKind: "digest",
    subjectId: day,
    dedupeKey: `digest:${day}`,
    title: `关注更新摘要 · ${alerts.length} 条`,
    lines: body,
  }, senders);
  if (results.some((row) => row.status === "sent")) {
    await sql`UPDATE wc_alerts SET sent_at = now() WHERE id = ANY(${alerts.map((alert) => alert.id)}::bigint[])`;
  }
  return results.map((row) => ({ ...row, count: alerts.length }));
}

/** A test message to every enabled channel; its dedupe key includes the instant, so it never blocks a real one. */
export async function sendNotifyTest(now = new Date(), senders: MessageSenders = {}): Promise<Array<{ target: string; status: string }>> {
  return await deliverMessage({
    subjectKind: "test",
    subjectId: now.toISOString(),
    dedupeKey: `test:${now.toISOString()}`,
    title: "WeChatHot 测试通知",
    lines: ["如果你看到这条消息，外部通知已经配置成功。"],
  }, senders);
}
