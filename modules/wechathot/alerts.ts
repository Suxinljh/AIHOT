// The studio's own notifications. A followed brand that gets a new event, or a source that stops
// working, leaves one alert behind: the same event never leaves two notifications, and a later
// report on a known event joins the alert it already has.
import { z } from "zod";
import { sql } from "@aihot/backend/db";
import { followMatches, followMuted, type FollowEvent, type FollowSettings } from "./follows.ts";
import { deliverAlert, loadNotifySettings } from "./notify.ts";

export type AlertKind = "new_event" | "follow_update" | "source_error";
export type AlertStatus = "unread" | "read" | "muted";

export interface StudioAlert {
  id: number;
  kind: AlertKind;
  status: AlertStatus;
  reason: string;
  createdAt: string;
  /** When the notification was delivered; an immediate follow is delivered as it is created. */
  sentAt: string | null;
  storyId: number | null;
  storyPublicId: string | null;
  storyTitle: string | null;
  sourceId: string | null;
  sourceName: string | null;
  brandId: string | null;
  brandName: string | null;
  ruleId: number | null;
}

export interface StudioAlertList {
  items: StudioAlert[];
  unread: number;
}

interface FollowRow {
  id: number;
  target_id: string;
  rule: FollowSettings["rule"];
  keywords: string[];
  blocked_keywords: string[];
  event_types: string[];
  notify: boolean;
  muted_until: Date | null;
  frequency: FollowSettings["frequency"];
  brand_name: string;
}

interface EventRow {
  story_id: number;
  title: string;
  summary: string | null;
  verification_status: FollowEvent["verificationStatus"];
  event_type: string | null;
  brand_ids: string[];
  selected_count: number;
  evidence_source_count: number;
  first_report_at: Date | null;
  latest_at: Date | null;
  report_count: number;
  source_ids: string[];
}

const StatusSchema = z.object({ status: z.enum(["unread", "read", "muted"]) }).strict();

function alertSettings(row: FollowRow): FollowSettings {
  return {
    rule: row.rule,
    keywords: row.keywords,
    blockedKeywords: row.blocked_keywords,
    eventTypes: row.event_types,
    notify: row.notify,
    frequency: row.frequency,
    mutedUntil: row.muted_until,
  };
}

/** The sources behind the channels a brand watches; the "specified channels" rule needs them. */
async function selectedSourceIds(brandId: string): Promise<string[]> {
  const rows = await sql<{ source_id: string }[]>`
    SELECT DISTINCT c.source_id
    FROM wc_channel_brands cb
    JOIN wc_channels c ON c.id = cb.channel_id
    WHERE cb.brand_id = ${brandId} AND cb.followed AND c.source_id IS NOT NULL`;
  return rows.map((row) => row.source_id);
}

export interface AlertRunResult {
  created: number;
  merged: number;
  sourceErrors: number;
  skipped: number;
}

/**
 * One pass of the notification task: every followed brand's recent events, and every source that
 * is currently failing.
 */
export async function generateAlerts(options: { now?: Date; since?: Date } = {}): Promise<AlertRunResult> {
  const now = options.now ?? new Date();
  const since = options.since ?? new Date(now.getTime() - 15 * 60_000);
  const result: AlertRunResult = { created: 0, merged: 0, sourceErrors: 0, skipped: 0 };
  const notifySettings = await loadNotifySettings();
  const immediate: number[] = [];

  const follows = await sql<FollowRow[]>`
    SELECT f.id, f.target_id, f.rule, f.keywords, f.blocked_keywords, f.event_types, f.notify,
           f.muted_until, f.frequency, b.name AS brand_name
    FROM wc_follows f
    JOIN wc_brands b ON b.id = f.target_id
    WHERE f.target_type = 'brand' AND f.notify`;
  if (!follows.length) {
    await collectSourceErrors(result, now);
    return result;
  }

  const brandIds = follows.map((row) => row.target_id);
  const events = await sql<EventRow[]>`
    SELECT m.story_id, s.title, m.summary, m.verification_status, m.event_type, m.brand_ids,
           m.selected_count, m.evidence_source_count, m.first_report_at, m.latest_at, m.report_count,
           coalesce((
             SELECT array_agg(DISTINCT p.source_id)
             FROM facts f
             JOIN fact_articles fa ON fa.fact_id = f.id
             JOIN publications p ON p.article_id = fa.article_id
             WHERE f.story_id = m.story_id
           ), '{}')::text[] AS source_ids
    FROM wc_event_meta m
    JOIN stories s ON s.id = m.story_id
    WHERE m.projected_at > ${since} AND s.merged_into IS NULL
      AND m.brand_ids && ${brandIds}::text[]
    ORDER BY m.latest_at DESC NULLS LAST`;

  for (const follow of follows) {
    const settings = alertSettings(follow);
    if (followMuted(settings, now)) {
      result.skipped += 1;
      continue;
    }
    const sources = await selectedSourceIds(follow.target_id);
    for (const event of events) {
      if (!event.brand_ids.includes(follow.target_id)) continue;
      const match = followMatches(settings, {
        title: event.title,
        summary: event.summary,
        verificationStatus: event.verification_status,
        curated: event.selected_count > 0 || event.evidence_source_count >= 2,
        eventType: event.event_type,
        sourceIds: event.source_ids,
      }, sources);
      if (!match.matched) continue;

      const dedupeKey = `follow:${follow.id}:${event.story_id}`;
      const [existing] = await sql<{ id: number; kind: AlertKind; reason: string }[]>`
        SELECT id, kind, reason FROM wc_alerts WHERE dedupe_key = ${dedupeKey}`;
      if (existing) {
        // The event is known; a new report joins the alert it already has.
        await sql`
          UPDATE wc_alerts
          SET kind = 'follow_update',
              reason = ${`${match.reason}｜${follow.brand_name}：${event.title}`},
              status = CASE WHEN status = 'muted' THEN status ELSE 'unread' END,
              sent_at = CASE WHEN ${follow.frequency === "immediate"} THEN ${now} ELSE sent_at END
          WHERE id = ${existing.id}`;
        result.merged += 1;
        continue;
      }
      const [row] = await sql<{ id: number }[]>`
        INSERT INTO wc_alerts (story_id, kind, rule_id, dedupe_key, reason, sent_at)
        VALUES (${event.story_id}, 'new_event', ${follow.id}, ${dedupeKey}, ${`${match.reason}｜${follow.brand_name}：${event.title}`},
                ${follow.frequency === "immediate" ? now : null})
        ON CONFLICT (dedupe_key) DO NOTHING
        RETURNING id`;
      if (row) {
        result.created += 1;
        if (notifySettings.immediate && follow.frequency === "immediate") immediate.push(Number(row.id));
      }
    }
  }

  await collectSourceErrors(result, now);
  // An immediate follow is delivered as it is created; the digest covers everything else.
  for (const alertId of immediate) {
    try {
      await deliverAlert(alertId);
    } catch {
      // A failed delivery is recorded on its own row and retried by the next run; it never fails the alert pass.
    }
  }
  return result;
}

/** One alert per failing source; a recovered source's alert is closed, not repeated. */
async function collectSourceErrors(result: AlertRunResult, now: Date): Promise<void> {
  const failing = await sql<{ id: string; name: string; last_error: string | null; fail_count: number }[]>`
    SELECT id, name, last_error, fail_count FROM sources
    WHERE enabled AND health = 'failing' AND last_error IS NOT NULL`;
  for (const source of failing) {
    const dedupeKey = `source_error:${source.id}`;
    const reason = `${source.name} 连续失败 ${source.fail_count} 次：${source.last_error}`;
    const [existing] = await sql<{ id: number; reason: string }[]>`SELECT id, reason FROM wc_alerts WHERE dedupe_key = ${dedupeKey}`;
    if (existing) {
      if (existing.reason !== reason) {
        await sql`UPDATE wc_alerts SET reason = ${reason}, status = CASE WHEN status = 'muted' THEN status ELSE 'unread' END WHERE id = ${existing.id}`;
        result.merged += 1;
      }
      continue;
    }
    const [row] = await sql<{ id: number }[]>`
      INSERT INTO wc_alerts (story_id, kind, source_id, dedupe_key, reason)
      VALUES (null, 'source_error', ${source.id}, ${dedupeKey}, ${reason})
      ON CONFLICT (dedupe_key) DO NOTHING
      RETURNING id`;
    if (row) {
      result.sourceErrors += 1;
      result.created += 1;
    }
  }

  const recovered = await sql<{ id: string }[]>`
    SELECT DISTINCT a.source_id AS id
    FROM wc_alerts a
    JOIN sources s ON s.id = a.source_id
    WHERE a.kind = 'source_error' AND a.status = 'unread' AND (NOT s.enabled OR s.health <> 'failing')`;
  for (const source of recovered) {
    await sql`
      UPDATE wc_alerts SET status = 'read', reason = ${`${source.id} 已恢复采集`}
      WHERE kind = 'source_error' AND source_id = ${source.id} AND status = 'unread'`;
  }
}

export interface AlertFilters {
  status?: "unread" | "read" | "muted" | "all";
  limit?: number;
}

export async function listAlerts(filters: AlertFilters = {}): Promise<StudioAlertList> {
  const status = filters.status ?? "all";
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
  const rows = await sql<{
    id: number;
    kind: AlertKind;
    status: AlertStatus;
    reason: string;
    created_at: Date;
    story_id: number | null;
    public_id: string | null;
    story_title: string | null;
    source_id: string | null;
    source_name: string | null;
    brand_id: string | null;
    brand_name: string | null;
    rule_id: number | null;
    sent_at: Date | null;
  }[]>`
    SELECT a.id, a.kind, a.status, a.reason, a.created_at, a.sent_at, a.story_id, s.public_id::text AS public_id,
           s.title AS story_title, a.source_id, src.name AS source_name,
           f.target_id AS brand_id, b.name AS brand_name, a.rule_id
    FROM wc_alerts a
    LEFT JOIN stories s ON s.id = a.story_id
    LEFT JOIN sources src ON src.id = a.source_id
    LEFT JOIN wc_follows f ON f.id = a.rule_id
    LEFT JOIN wc_brands b ON b.id = f.target_id
    WHERE (${status}::text = 'all' OR a.status = ${status})
    ORDER BY (a.status = 'unread') DESC, a.created_at DESC, a.id DESC
    LIMIT ${limit}`;
  const [unread] = await sql<{ count: number }[]>`SELECT count(*)::int AS count FROM wc_alerts WHERE status = 'unread'`;
  return {
    items: rows.map((row) => ({
      id: Number(row.id),
      kind: row.kind,
      status: row.status,
      reason: row.reason,
      createdAt: row.created_at.toISOString(),
      sentAt: row.sent_at?.toISOString() ?? null,
      storyId: row.story_id === null ? null : Number(row.story_id),
      storyPublicId: row.public_id,
      storyTitle: row.story_title,
      sourceId: row.source_id,
      sourceName: row.source_name,
      brandId: row.brand_id,
      brandName: row.brand_name,
      ruleId: row.rule_id === null ? null : Number(row.rule_id),
    })),
    unread: Number(unread?.count ?? 0),
  };
}

/** One alert's own state: read, unread or muted. The state stays until it is changed. */
export async function setAlertStatus(id: number, input: unknown): Promise<StudioAlert | null> {
  const patch = StatusSchema.parse(input);
  const [row] = await sql<{ id: number }[]>`
    UPDATE wc_alerts SET status = ${patch.status} WHERE id = ${id} RETURNING id`;
  if (!row) return null;
  const list = await listAlerts({ limit: 200 });
  return list.items.find((alert) => alert.id === Number(row.id)) ?? null;
}

/** Every unread alert becomes read; the muted ones stay muted. */
export async function markAllAlertsRead(): Promise<number> {
  const rows = await sql<{ id: number }[]>`
    UPDATE wc_alerts SET status = 'read' WHERE status = 'unread' RETURNING id`;
  return rows.length;
}
