// The studio's own follow rules: which channels of a brand are watched, what counts as an update,
// and when the editor does not want to hear about it. The rules are one user's, so a follow has no
// owner column; a brand's follow and its channel selection are written together.
import { z } from "zod";
import { audit } from "@aihot/backend/audit";
import { sql, type Db } from "@aihot/backend/db";
import type { ChannelAvailability, ChannelVerification, FollowFrequency, FollowRule } from "./studio-types.ts";

/** A follow command that cannot be applied. */
export class FollowRejected extends Error {
  readonly statusCode = 400;
  readonly code = "invalid_request";
}

const RULES = ["all", "major", "selected", "keywords"] as const;
const FREQUENCIES = ["immediate", "daily", "weekly"] as const;
const VERIFICATIONS = ["verified", "user", "pending", "unavailable"] as const;
const AVAILABILITIES = ["available", "unavailable", "unknown"] as const;

const words = z.array(z.string().trim().max(100)).max(50).transform((values) => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
});

const FollowSchema = z
  .object({
    rule: z.enum(RULES).optional(),
    keywords: words.optional(),
    blockedKeywords: words.optional(),
    eventTypes: z.array(z.string().trim().max(100)).max(30).optional(),
    notify: z.boolean().optional(),
    frequency: z.enum(FREQUENCIES).optional(),
    /** ISO time; null lifts the mute. */
    mutedUntil: z.union([z.string().trim().max(40), z.null()]).optional(),
    /** The channels of this brand to watch; the others are left unwatched. */
    channelIds: z.array(z.string().trim().regex(/^[a-z0-9][a-z0-9_-]{0,79}$/)).max(50).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "请至少指定一项关注设置");

const ChannelSchema = z
  .object({
    followed: z.boolean().optional(),
    mutedUntil: z.union([z.string().trim().max(40), z.null()]).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "请至少指定一项渠道设置");

const ChannelUpdateSchema = z
  .object({
    verification: z.enum(VERIFICATIONS).optional(),
    availability: z.enum(AVAILABILITIES).optional(),
    note: z.union([z.string().trim().max(1000), z.null()]).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "请至少指定一项渠道信息");

export interface FollowSettings {
  rule: FollowRule;
  keywords: string[];
  blockedKeywords: string[];
  eventTypes: string[];
  notify: boolean;
  frequency: FollowFrequency;
  mutedUntil: Date | null;
}

export interface FollowRow {
  id: number;
  rule: FollowRule;
  keywords: string[];
  blocked_keywords: string[];
  event_types: string[];
  notify: boolean;
  muted_until: Date | null;
  frequency: FollowFrequency;
}

/** The event a follow is asked about; the matcher only reads these fields. */
export interface FollowEvent {
  title: string;
  summary: string | null;
  verificationStatus: "unverified" | "confirmed" | "disputed";
  /** The event is worth an editor's attention: a selected report or two independent sources. */
  curated: boolean;
  eventType: string | null;
  sourceIds: string[];
}

export interface FollowMatch {
  matched: boolean;
  reason: string;
}

function parseMute(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const at = new Date(value);
  if (Number.isNaN(at.getTime())) throw new FollowRejected("静音时间不是有效的时间");
  return at;
}

function containsAny(text: string, list: string[]): boolean {
  const haystack = text.toLowerCase();
  return list.some((word) => haystack.includes(word.toLowerCase()));
}

/**
 * Whether an event is an update this follow wants. The blocked words come first: a word the
 * editor blocked silences the event whatever the rule says.
 */
export function followMatches(follow: FollowSettings, event: FollowEvent, selectedSourceIds: string[] = []): FollowMatch {
  const text = `${event.title} ${event.summary ?? ""}`;
  if (follow.blockedKeywords.length && containsAny(text, follow.blockedKeywords)) {
    return { matched: false, reason: "命中屏蔽词" };
  }
  if (follow.eventTypes.length && (!event.eventType || !follow.eventTypes.includes(event.eventType))) {
    return { matched: false, reason: "事件类型不在关注范围" };
  }
  switch (follow.rule) {
    case "major":
      return event.curated
        ? { matched: true, reason: "重大事件" }
        : { matched: false, reason: "仅重大事件：证据不足" };
    case "selected": {
      const hit = event.sourceIds.some((sourceId) => selectedSourceIds.includes(sourceId));
      return hit ? { matched: true, reason: "来自已选渠道" } : { matched: false, reason: "指定发布事件：不是已选渠道" };
    }
    case "keywords":
      return follow.keywords.length && containsAny(text, follow.keywords)
        ? { matched: true, reason: "命中关键词" }
        : { matched: false, reason: "自定义关键词：未命中" };
    default:
      return { matched: true, reason: "全部更新" };
  }
}

/** A muted follow still exists; it just stays quiet until the mute ends. */
export function followMuted(follow: FollowSettings, now = new Date()): boolean {
  return !!follow.mutedUntil && follow.mutedUntil.getTime() > now.getTime();
}

export function followSettings(row: FollowRow): FollowSettings {
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

async function brandChannels(db: Db, brandId: string): Promise<string[]> {
  const rows = await db<{ channel_id: string }[]>`
    SELECT channel_id FROM wc_channel_brands WHERE brand_id = ${brandId}`;
  return rows.map((row) => row.channel_id);
}

/** The sources behind the channels this brand watches; the "specified channels" rule needs them. */
export async function followedSourceIds(db: Db, brandId: string): Promise<string[]> {
  const rows = await db<{ source_id: string }[]>`
    SELECT DISTINCT c.source_id
    FROM wc_channel_brands cb
    JOIN wc_channels c ON c.id = cb.channel_id
    WHERE cb.brand_id = ${brandId} AND cb.followed AND c.source_id IS NOT NULL`;
  return rows.map((row) => row.source_id);
}

/** Creates or updates the brand's follow and, with it, which channels are watched. */
export async function saveBrandFollow(brandId: string, input: unknown, actor: string): Promise<FollowSettings | null> {
  const patch = FollowSchema.parse(input);
  const mutedUntil = parseMute(patch.mutedUntil);
  const channelIds = patch.channelIds;
  if (channelIds) {
    const known = new Set(await brandChannels(sql, brandId));
    for (const id of channelIds) {
      if (!known.has(id)) throw new FollowRejected(`渠道 ${id} 不属于这个品牌`);
    }
  }

  const follow = await sql.begin(async (tx) => {
    const [brand] = await tx`SELECT 1 FROM wc_brands WHERE id = ${brandId}`;
    if (!brand) return null;
    const [before] = await tx<FollowRow[]>`
      SELECT id, rule, keywords, blocked_keywords, event_types, notify, muted_until, frequency
      FROM wc_follows WHERE target_type = 'brand' AND target_id = ${brandId} FOR UPDATE`;
    const [row] = await tx<FollowRow[]>`
      INSERT INTO wc_follows (target_type, target_id, rule, keywords, blocked_keywords, event_types, notify, muted_until, frequency, updated_at)
      VALUES (
        'brand', ${brandId}, ${patch.rule ?? before?.rule ?? "all"},
        ${patch.keywords ?? before?.keywords ?? []}::text[],
        ${patch.blockedKeywords ?? before?.blocked_keywords ?? []}::text[],
        ${patch.eventTypes ?? before?.event_types ?? []}::text[],
        ${patch.notify ?? before?.notify ?? true},
        ${mutedUntil === undefined ? before?.muted_until ?? null : mutedUntil},
        ${patch.frequency ?? before?.frequency ?? "immediate"},
        now()
      )
      ON CONFLICT (target_type, target_id) DO UPDATE SET
        rule = EXCLUDED.rule,
        keywords = EXCLUDED.keywords,
        blocked_keywords = EXCLUDED.blocked_keywords,
        event_types = EXCLUDED.event_types,
        notify = EXCLUDED.notify,
        muted_until = EXCLUDED.muted_until,
        frequency = EXCLUDED.frequency,
        updated_at = now()
      RETURNING id, rule, keywords, blocked_keywords, event_types, notify, muted_until, frequency`;
    if (channelIds) {
      await tx`UPDATE wc_channel_brands SET followed = false WHERE brand_id = ${brandId} AND followed`;
      if (channelIds.length) {
        await tx`
          UPDATE wc_channel_brands SET followed = true
          WHERE brand_id = ${brandId} AND channel_id = ANY(${channelIds}::text[])`;
      }
    }
    await audit(actor, before ? "follow.update" : "follow.create", `brand:${brandId}`, null, before ?? null, row, { db: tx });
    return row;
  });

  return follow ? followSettings(follow) : null;
}

/** Cancels the brand's follow. The channels stay; only the watching stops. */
export async function removeBrandFollow(brandId: string, actor: string): Promise<boolean> {
  return sql.begin(async (tx) => {
    const [before] = await tx<FollowRow[]>`
      SELECT id, rule, keywords, blocked_keywords, event_types, notify, muted_until, frequency
      FROM wc_follows WHERE target_type = 'brand' AND target_id = ${brandId} FOR UPDATE`;
    if (!before) return false;
    await tx`DELETE FROM wc_follows WHERE target_type = 'brand' AND target_id = ${brandId}`;
    await tx`UPDATE wc_channel_brands SET followed = false, muted_until = NULL WHERE brand_id = ${brandId}`;
    await audit(actor, "follow.delete", `brand:${brandId}`, "取消关注", before, null, { db: tx });
    return true;
  });
}

/** Watches or pauses one channel of a brand. The brand's follow is untouched. */
export async function setBrandChannel(
  brandId: string,
  channelId: string,
  input: unknown,
  actor: string,
): Promise<{ followed: boolean; mutedUntil: string | null } | null> {
  const patch = ChannelSchema.parse(input);
  const mutedUntil = parseMute(patch.mutedUntil);
  return sql.begin(async (tx) => {
    const [relation] = await tx<{ followed: boolean; muted_until: Date | null }[]>`
      SELECT followed, muted_until FROM wc_channel_brands
      WHERE brand_id = ${brandId} AND channel_id = ${channelId} FOR UPDATE`;
    if (!relation) return null;
    const followed = patch.followed === undefined ? relation.followed : patch.followed;
    const until = mutedUntil === undefined ? relation.muted_until : mutedUntil;
    await tx`
      UPDATE wc_channel_brands SET followed = ${followed}, muted_until = ${until}
      WHERE brand_id = ${brandId} AND channel_id = ${channelId}`;
    await audit(actor, "follow.channel", `brand:${brandId}:${channelId}`, null, relation, { followed, mutedUntil: until }, { db: tx });
    return { followed, mutedUntil: until?.toISOString() ?? null };
  });
}

/** A channel's own state: how official it is and whether it still works. */
export async function updateChannel(id: string, input: unknown, actor: string): Promise<{
  id: string;
  verification: ChannelVerification;
  availability: ChannelAvailability;
  note: string | null;
} | null> {
  const patch = ChannelUpdateSchema.parse(input);
  return sql.begin(async (tx) => {
    const [before] = await tx<{ id: string; verification: ChannelVerification; availability: ChannelAvailability; note: string | null }[]>`
      SELECT id, verification, availability, note FROM wc_channels WHERE id = ${id} FOR UPDATE`;
    if (!before) return null;
    const [after] = await tx<{ id: string; verification: ChannelVerification; availability: ChannelAvailability; note: string | null }[]>`
      UPDATE wc_channels SET
        verification = ${patch.verification ?? before.verification},
        availability = ${patch.availability ?? before.availability},
        note = ${patch.note === undefined ? before.note : patch.note}
      WHERE id = ${id}
      RETURNING id, verification, availability, note`;
    await audit(actor, "channel.update", `channel:${id}`, null, before, after, { db: tx });
    return after;
  });
}

/** Removes a channel. The brands keep their follow; only this channel disappears. */
export async function deleteChannel(id: string, actor: string): Promise<boolean> {
  return sql.begin(async (tx) => {
    const [before] = await tx<{ id: string; verification: ChannelVerification; availability: ChannelAvailability; note: string | null }[]>`
      SELECT id, verification, availability, note FROM wc_channels WHERE id = ${id} FOR UPDATE`;
    if (!before) return false;
    await tx`DELETE FROM wc_channels WHERE id = ${id}`;
    await audit(actor, "channel.delete", `channel:${id}`, null, before, null, { db: tx });
    return true;
  });
}
