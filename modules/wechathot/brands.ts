// The brand library's write side: create, edit, delete, search and merge. A brand id is a stable
// slug, aliases are the names the extractor may use, and every manual change is audited. Merging is
// one transaction: channels, event relations, the denormalized event filter and follows all move to
// the surviving brand before the duplicate row is removed.
import { z } from "zod";
import { CATEGORY_KEYS, CATEGORY_LABELS, isCategoryKey } from "@aihot/contracts/taxonomy";
import { audit, Conflict } from "@aihot/backend/audit";
import { sql, type Db } from "@aihot/backend/db";
import type {
  BrandChannel,
  BrandDetail,
  BrandEvent,
  BrandFollow,
  BrandListItem,
  BrandMergeResult,
  ChannelAvailability,
  ChannelProvider,
  ChannelType,
  ChannelVerification,
  FollowFrequency,
  FollowRule,
  VerificationStatus,
} from "./studio-types.ts";

export class BrandRejected extends Error {
  readonly statusCode = 400;
  readonly code = "invalid_request";
}

interface BrandRow {
  id: string;
  entity_id: string | null;
  name: string;
  aliases: string[];
  website: string | null;
  logo_url: string | null;
  industries: string[];
  verified_status: VerificationStatus;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

interface BrandListRow extends BrandRow {
  followed: boolean;
}

interface ChannelRow {
  id: string;
  type: ChannelType;
  platform: string | null;
  display_name: string;
  url: string;
  provider: ChannelProvider | null;
  source_id: string | null;
  verification: ChannelVerification;
  availability: ChannelAvailability;
  note: string | null;
}

interface EventRow {
  story_id: number;
  title: string;
  categories: string[] | null;
  event_type: string | null;
  verification_status: "unverified" | "confirmed" | "disputed" | null;
  first_report_at: Date | null;
  latest_at: Date | null;
  report_count: number | null;
  source_count: number | null;
  heat: number | string | null;
  editorial_score: number | string | null;
}

interface FollowRow {
  id: number;
  rule: FollowRule;
  keywords: string[];
  blocked_keywords: string[];
  event_types: string[];
  notify: boolean;
  muted_until: Date | null;
  frequency: FollowFrequency;
}

const VERIFICATION = ["verified", "user", "pending", "unavailable"] as const;
const SLUG = /^[a-z0-9][a-z0-9_-]{0,79}$/;

function industryMessage(value: string): string {
  const allowed = CATEGORY_KEYS.map((key) => `${key}（${CATEGORY_LABELS[key]}）`).join("、");
  return `行业 ${value} 不存在，可选：${allowed}`;
}

function uniqueList(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

const name = z.string().trim().min(1, "品牌名称不能为空").max(200, "品牌名称最多 200 字");
const aliases = z.array(z.string().trim().max(100)).max(100).transform(uniqueList);
const industryList = z
  .array(z.string().trim().max(80))
  .max(20)
  .transform(uniqueList)
  .superRefine((values, ctx) => {
    values.forEach((value, index) => {
      if (!isCategoryKey(value)) ctx.addIssue({ code: "custom", path: [index], message: industryMessage(value) });
    });
  });
const nullableSlug = z
  .union([
    z.string().trim().max(80).superRefine((value, ctx) => {
      if (value && !SLUG.test(value)) {
        ctx.addIssue({ code: "custom", message: "ID 只能使用小写字母、数字、下划线和连字符，且以字母或数字开头" });
      }
    }),
    z.null(),
  ])
  .transform((value) => value || null);
const nullableHttpUrl = z
  .union([
    z.string().trim().max(500).superRefine((value, ctx) => {
      if (!value) return;
      try {
        const url = new URL(value);
        if (!/^https?:$/.test(url.protocol) || url.username || url.password) throw new Error();
      } catch {
        ctx.addIssue({ code: "custom", message: "请输入有效的 http(s) 地址" });
      }
    }),
    z.null(),
  ])
  .transform((value) => value || null);
const nullableText = z
  .union([z.string().trim().max(2000, "备注最多 2000 字"), z.null()])
  .transform((value) => value || null);
const verifiedStatus = z.enum(VERIFICATION);

const CreateSchema = z
  .object({
    id: z.string().trim().regex(SLUG, "ID 只能使用小写字母、数字、下划线和连字符，且以字母或数字开头").optional(),
    entityId: nullableSlug.optional(),
    name,
    aliases: aliases.optional(),
    website: nullableHttpUrl.optional(),
    logoUrl: nullableHttpUrl.optional(),
    industries: industryList.optional(),
    verifiedStatus: verifiedStatus.optional(),
    notes: nullableText.optional(),
  })
  .strict();

const UpdateSchema = z
  .object({
    entityId: nullableSlug.optional(),
    name: name.optional(),
    aliases: aliases.optional(),
    website: nullableHttpUrl.optional(),
    logoUrl: nullableHttpUrl.optional(),
    industries: industryList.optional(),
    verifiedStatus: verifiedStatus.optional(),
    notes: nullableText.optional(),
    version: z.string().trim().min(1).optional(),
  })
  .strict();

const MergeSchema = z
  .object({
    from: z.string().trim().min(1, "请选择要合并的品牌"),
    into: z.string().trim().min(1, "请选择存活品牌"),
    reason: z.string().trim().max(1000).optional(),
  })
  .strict();

function numberOrNull(value: number | string | null): number | null {
  return value === null ? null : Number(value);
}

function brandItem(row: BrandListRow): BrandListItem {
  return {
    id: row.id,
    entityId: row.entity_id,
    name: row.name,
    aliases: row.aliases,
    website: row.website,
    logoUrl: row.logo_url,
    industries: row.industries,
    verifiedStatus: row.verified_status,
    followed: row.followed,
  };
}

function brandChannel(row: ChannelRow): BrandChannel {
  return {
    id: row.id,
    type: row.type,
    platform: row.platform,
    displayName: row.display_name,
    url: row.url,
    provider: row.provider,
    sourceId: row.source_id,
    verification: row.verification,
    availability: row.availability,
    note: row.note,
  };
}

function brandEvent(row: EventRow): BrandEvent {
  return {
    storyId: Number(row.story_id),
    title: row.title,
    categories: row.categories ?? [],
    eventType: row.event_type,
    verificationStatus: row.verification_status ?? "unverified",
    firstReportAt: row.first_report_at?.toISOString() ?? null,
    latestAt: row.latest_at?.toISOString() ?? null,
    reportCount: row.report_count ?? 0,
    sourceCount: row.source_count ?? 0,
    heat: numberOrNull(row.heat),
    editorialScore: numberOrNull(row.editorial_score),
  };
}

function brandFollow(row: FollowRow): BrandFollow {
  return {
    id: Number(row.id),
    rule: row.rule,
    keywords: row.keywords,
    blockedKeywords: row.blocked_keywords,
    eventTypes: row.event_types,
    notify: row.notify,
    mutedUntil: row.muted_until?.toISOString() ?? null,
    frequency: row.frequency,
  };
}

function slugify(value: string): string {
  const base = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "brand";
}

async function nextBrandId(db: Db, base: string): Promise<string> {
  for (let suffix = 1; ; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base.slice(0, 76)}-${suffix}`;
    const [existing] = await db`SELECT 1 FROM wc_brands WHERE id = ${candidate}`;
    if (!existing) return candidate;
  }
}

async function assertNameFree(db: Db, value: string, exceptId?: string): Promise<void> {
  const [duplicate] = await db<{ id: string; name: string }[]>`
    SELECT id, name FROM wc_brands
    WHERE lower(btrim(name)) = lower(btrim(${value}))
      AND (${exceptId ?? null}::text IS NULL OR id <> ${exceptId ?? null})
    LIMIT 1`;
  if (duplicate) throw new Conflict(`品牌名称“${duplicate.name}”已存在（${duplicate.id}）`);
}

async function assertEntityFree(db: Db, entityId: string | null, exceptId?: string): Promise<void> {
  if (!entityId) return;
  const [duplicate] = await db<{ id: string; name: string }[]>`
    SELECT id, name FROM wc_brands
    WHERE entity_id = ${entityId}
      AND (${exceptId ?? null}::text IS NULL OR id <> ${exceptId ?? null})
    LIMIT 1`;
  if (duplicate) throw new Conflict(`实体 ${entityId} 已映射到品牌 ${duplicate.name}（${duplicate.id}）`);
}

export interface BrandListFilters {
  q?: string;
  industry?: string;
  followed?: "true" | "false";
}

export async function listBrands(filters: BrandListFilters): Promise<BrandListItem[]> {
  const q = filters.q?.trim() ?? "";
  if (q.length > 200) throw new BrandRejected("搜索词最多 200 个字符");
  const industryKey = filters.industry?.trim() || null;
  if (industryKey && !isCategoryKey(industryKey)) throw new BrandRejected(industryMessage(industryKey));
  if (filters.followed !== undefined && filters.followed !== "true" && filters.followed !== "false") {
    throw new BrandRejected("followed 只能是 true 或 false");
  }
  const followed = filters.followed === undefined ? null : filters.followed === "true";
  const pattern = q ? `%${q}%` : null;

  const rows = await sql<BrandListRow[]>`
    SELECT id, entity_id, name, aliases, website, logo_url, industries, verified_status, notes,
           created_at, updated_at,
           EXISTS (
             SELECT 1 FROM wc_follows f
             WHERE f.target_type = 'brand' AND f.target_id = wc_brands.id
           ) AS followed
    FROM wc_brands
    WHERE (${pattern}::text IS NULL
           OR name ILIKE ${pattern}
           OR EXISTS (SELECT 1 FROM unnest(aliases) AS a(alias) WHERE alias ILIKE ${pattern}))
      AND (${industryKey}::text IS NULL OR ${industryKey} = ANY(industries))
      AND (${followed}::boolean IS NULL
           OR EXISTS (
             SELECT 1 FROM wc_follows f
             WHERE f.target_type = 'brand' AND f.target_id = wc_brands.id
           ) = ${followed})
    ORDER BY name
    LIMIT 200`;
  return rows.map(brandItem);
}

export async function brandDetail(id: string): Promise<BrandDetail | null> {
  const [row] = await sql<BrandRow[]>`
    SELECT id, entity_id, name, aliases, website, logo_url, industries, verified_status, notes,
           created_at, updated_at
    FROM wc_brands WHERE id = ${id}`;
  if (!row) return null;

  const [channels, events, [follow], [counts]] = await Promise.all([
    sql<ChannelRow[]>`
      SELECT c.id, c.type, c.platform, c.display_name, c.url, c.provider, c.source_id,
             c.verification, c.availability, c.note
      FROM wc_channel_brands cb
      JOIN wc_channels c ON c.id = cb.channel_id
      WHERE cb.brand_id = ${id}
      ORDER BY c.type, c.display_name, c.id`,
    sql<EventRow[]>`
      SELECT s.id AS story_id, s.title, m.categories, m.event_type, m.verification_status,
             m.first_report_at, m.latest_at, m.report_count, m.source_count, m.heat, m.editorial_score
      FROM wc_event_brands eb
      JOIN stories s ON s.id = eb.story_id AND s.merged_into IS NULL
      LEFT JOIN wc_event_meta m ON m.story_id = s.id
      WHERE eb.brand_id = ${id}
      ORDER BY COALESCE(m.latest_at, s.latest_at) DESC NULLS LAST
      LIMIT 50`,
    sql<FollowRow[]>`
      SELECT id, rule, keywords, blocked_keywords, event_types, notify, muted_until, frequency
      FROM wc_follows
      WHERE target_type = 'brand' AND target_id = ${id}`,
    sql<{ channels: number; events: number }[]>`
      SELECT
        (SELECT count(*)::int FROM wc_channel_brands WHERE brand_id = ${id}) AS channels,
        (SELECT count(*)::int FROM wc_event_brands eb
         JOIN stories s ON s.id = eb.story_id AND s.merged_into IS NULL
         WHERE eb.brand_id = ${id}) AS events`,
  ]);

  const item = brandItem({ ...row, followed: !!follow });
  return {
    ...item,
    notes: row.notes,
    channels: channels.map(brandChannel),
    events: events.map(brandEvent),
    follow: follow ? brandFollow(follow) : null,
    counts: counts ?? { channels: 0, events: 0 },
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function createBrand(input: unknown, actor: string): Promise<BrandDetail> {
  const draft = CreateSchema.parse(input);
  const id = await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtext('studio-brand-identity'))`;
    await assertNameFree(tx, draft.name);
    await assertEntityFree(tx, draft.entityId ?? null);
    if (draft.id) {
      const [existing] = await tx`SELECT 1 FROM wc_brands WHERE id = ${draft.id}`;
      if (existing) throw new Conflict(`品牌 ID ${draft.id} 已存在`);
    }
    const brandId = draft.id ?? await nextBrandId(tx, draft.entityId ?? slugify(draft.name));
    const [row] = await tx<BrandRow[]>`
      INSERT INTO wc_brands (id, entity_id, name, aliases, website, logo_url, industries, verified_status, notes)
      VALUES (${brandId}, ${draft.entityId ?? null}, ${draft.name}, ${draft.aliases ?? []}::text[],
              ${draft.website ?? null}, ${draft.logoUrl ?? null}, ${draft.industries ?? []}::text[],
              ${draft.verifiedStatus ?? "user"}, ${draft.notes ?? null})
      RETURNING id, entity_id, name, aliases, website, logo_url, industries, verified_status, notes,
                created_at, updated_at`;
    await audit(actor, "brand.create", `brand:${brandId}`, null, null, row, { db: tx });
    return brandId;
  });
  return (await brandDetail(id))!;
}

export async function updateBrand(id: string, input: unknown, actor: string): Promise<BrandDetail | null> {
  const patch = UpdateSchema.parse(input);
  const changed = await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtext('studio-brand-identity'))`;
    const [before] = await tx<BrandRow[]>`
      SELECT id, entity_id, name, aliases, website, logo_url, industries, verified_status, notes,
             created_at, updated_at
      FROM wc_brands WHERE id = ${id} FOR UPDATE`;
    if (!before) return false;
    if (patch.version && before.updated_at.toISOString() !== patch.version) {
      throw new Conflict("品牌已被其他操作修改，请刷新后再改");
    }
    if (patch.name !== undefined) await assertNameFree(tx, patch.name, id);
    if (patch.entityId !== undefined) await assertEntityFree(tx, patch.entityId, id);

    const values: Record<string, unknown> = {};
    if (patch.name !== undefined) values.name = patch.name;
    if (patch.entityId !== undefined) values.entity_id = patch.entityId;
    if (patch.aliases !== undefined) values.aliases = patch.aliases;
    if (patch.website !== undefined) values.website = patch.website;
    if (patch.logoUrl !== undefined) values.logo_url = patch.logoUrl;
    if (patch.industries !== undefined) values.industries = patch.industries;
    if (patch.verifiedStatus !== undefined) values.verified_status = patch.verifiedStatus;
    if (patch.notes !== undefined) values.notes = patch.notes;
    const keys = Object.keys(values);
    if (!keys.length) return true;

    const [after] = await tx<BrandRow[]>`
      UPDATE wc_brands SET ${tx(values as never, ...keys)}, updated_at = now()
      WHERE id = ${id}
      RETURNING id, entity_id, name, aliases, website, logo_url, industries, verified_status, notes,
                created_at, updated_at`;
    await audit(actor, "brand.update", `brand:${id}`, null, before, after, { db: tx });
    return true;
  });
  return changed ? brandDetail(id) : null;
}

export async function deleteBrand(id: string, actor: string): Promise<boolean> {
  return sql.begin(async (tx) => {
    const [before] = await tx<BrandRow[]>`
      SELECT id, entity_id, name, aliases, website, logo_url, industries, verified_status, notes,
             created_at, updated_at
      FROM wc_brands WHERE id = ${id} FOR UPDATE`;
    if (!before) return false;
    await tx`DELETE FROM wc_follows WHERE target_type = 'brand' AND target_id = ${id}`;
    await tx`UPDATE wc_event_meta SET brand_ids = array_remove(brand_ids, ${id}) WHERE ${id} = ANY(brand_ids)`;
    await tx`DELETE FROM wc_brands WHERE id = ${id}`;
    await audit(actor, "brand.delete", `brand:${id}`, null, before, null, { db: tx });
    return true;
  });
}

interface MergeMovement {
  targetId: string;
  moved: { aliases: number; channels: number; events: number; follow: boolean };
}

export async function mergeBrands(input: unknown, actor: string): Promise<BrandMergeResult | null> {
  const request = MergeSchema.parse(input);
  if (request.from === request.into) throw new BrandRejected("不能把品牌合并到自身");

  const movement = await sql.begin(async (tx): Promise<MergeMovement | null> => {
    await tx`SELECT pg_advisory_xact_lock(hashtext('studio-brand-identity'))`;
    const ids = [request.from, request.into].sort();
    const rows = await tx<BrandRow[]>`
      SELECT id, entity_id, name, aliases, website, logo_url, industries, verified_status, notes,
             created_at, updated_at
      FROM wc_brands WHERE id = ANY(${ids}::text[])
      ORDER BY id
      FOR UPDATE`;
    const from = rows.find((row) => row.id === request.from);
    const into = rows.find((row) => row.id === request.into);
    if (!from || !into) return null;

    const targetAliases = uniqueList(into.aliases);
    const mergedAliases = uniqueList([...targetAliases, ...from.aliases, from.name])
      .filter((alias) => alias.toLowerCase() !== into.name.toLowerCase());
    const knownAliases = new Set(targetAliases.map((alias) => alias.toLowerCase()));
    const newAliasCount = mergedAliases.filter((alias) => !knownAliases.has(alias.toLowerCase())).length;

    const sourceEvents = await tx<{ story_id: number }[]>`
      SELECT story_id FROM wc_event_brands WHERE brand_id = ${from.id}`;
    await tx`
      INSERT INTO wc_event_brands (story_id, brand_id)
      SELECT story_id, ${into.id} FROM wc_event_brands WHERE brand_id = ${from.id}
      ON CONFLICT DO NOTHING`;
    await tx`DELETE FROM wc_event_brands WHERE brand_id = ${from.id}`;
    if (sourceEvents.length) {
      const storyIds = sourceEvents.map((row) => Number(row.story_id));
      await tx`
        UPDATE wc_event_meta m
        SET brand_ids = COALESCE((
          SELECT array_agg(DISTINCT b.brand_id ORDER BY b.brand_id)
          FROM wc_event_brands b WHERE b.story_id = m.story_id
        ), '{}')
        WHERE m.story_id = ANY(${storyIds}::bigint[])`;
    }

    const sourceChannels = await tx<{ channel_id: string }[]>`
      SELECT channel_id FROM wc_channel_brands WHERE brand_id = ${from.id}`;
    await tx`
      INSERT INTO wc_channel_brands (channel_id, brand_id)
      SELECT channel_id, ${into.id} FROM wc_channel_brands WHERE brand_id = ${from.id}
      ON CONFLICT DO NOTHING`;
    await tx`DELETE FROM wc_channel_brands WHERE brand_id = ${from.id}`;

    const [sourceFollow] = await tx<FollowRow[]>`
      SELECT id, rule, keywords, blocked_keywords, event_types, notify, muted_until, frequency
      FROM wc_follows
      WHERE target_type = 'brand' AND target_id = ${from.id}
      FOR UPDATE`;
    const [targetFollow] = await tx<FollowRow[]>`
      SELECT id, rule, keywords, blocked_keywords, event_types, notify, muted_until, frequency
      FROM wc_follows
      WHERE target_type = 'brand' AND target_id = ${into.id}
      FOR UPDATE`;
    if (sourceFollow) {
      if (targetFollow) {
        await tx`UPDATE wc_alerts SET rule_id = ${targetFollow.id} WHERE rule_id = ${sourceFollow.id}`;
        await tx`
          UPDATE wc_follows SET
            keywords = ARRAY(SELECT DISTINCT unnest(keywords || ${sourceFollow.keywords}::text[]) ORDER BY 1),
            blocked_keywords = ARRAY(SELECT DISTINCT unnest(blocked_keywords || ${sourceFollow.blocked_keywords}::text[]) ORDER BY 1),
            event_types = ARRAY(SELECT DISTINCT unnest(event_types || ${sourceFollow.event_types}::text[]) ORDER BY 1),
            updated_at = now()
          WHERE id = ${targetFollow.id}`;
        await tx`DELETE FROM wc_follows WHERE id = ${sourceFollow.id}`;
      } else {
        await tx`UPDATE wc_follows SET target_id = ${into.id}, updated_at = now() WHERE id = ${sourceFollow.id}`;
      }
    }

    // Delete the duplicate before moving a code-owned entity id: entity_id is unique while both rows exist.
    await tx`DELETE FROM wc_brands WHERE id = ${from.id}`;
    const [after] = await tx<BrandRow[]>`
      UPDATE wc_brands SET
        aliases = ${mergedAliases}::text[],
        entity_id = ${into.entity_id ?? from.entity_id},
        updated_at = now()
      WHERE id = ${into.id}
      RETURNING id, entity_id, name, aliases, website, logo_url, industries, verified_status, notes,
                created_at, updated_at`;
    await audit(actor, "brand.merge", `brand:${into.id}`, request.reason ?? "合并重复品牌",
      { from, into }, { brand: after, moved: { aliases: newAliasCount, channels: sourceChannels.length, events: sourceEvents.length, follow: !!sourceFollow } },
      { db: tx });
    return {
      targetId: into.id,
      moved: { aliases: newAliasCount, channels: sourceChannels.length, events: sourceEvents.length, follow: !!sourceFollow },
    };
  });

  if (!movement) return null;
  const brand = await brandDetail(movement.targetId);
  return brand ? { brand, moved: movement.moved } : null;
}
