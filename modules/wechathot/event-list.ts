// The hot list's read side: filters, five orderings, stable pages and facet counts over the
// wc_event_meta projection. It never reads the public publication layer directly, and it never
// writes: private state comes from wc_event_states and pitches from wc_topics.
import { z } from "zod";
import { CATEGORY_KEYS, CATEGORY_LABELS, isCategoryKey } from "@aihot/contracts/taxonomy";
import { sql } from "@aihot/backend/db";
import type {
  ChannelType,
  EventManualDecision,
  EventScope,
  EventSort,
  EventVerification,
  StudioEventFacets,
  StudioEventList,
  StudioEventListItem,
} from "./studio-types.ts";

/** Bad list parameters are the caller's mistake, not a server fault. */
export class EventQueryRejected extends Error {
  readonly statusCode = 400;
  readonly code = "invalid_request";
}

const CHANNEL_TYPES: readonly ChannelType[] = ["official_site", "x", "wechat", "weibo", "github", "media", "custom"];
const CHANNEL_LABELS: Record<ChannelType, string> = {
  official_site: "官方网站",
  x: "X",
  wechat: "微信公众号",
  weibo: "微博",
  github: "GitHub",
  media: "媒体",
  custom: "自定义",
};
const SORTS: readonly EventSort[] = ["discovered", "latest", "heat", "recommend", "followed"];
const SLUG = /^[a-z0-9][a-z0-9_-]{0,79}$/;

const QuerySchema = z.object({
  scope: z.enum(["curated", "all"]).optional(),
  sort: z.enum(["discovered", "latest", "heat", "recommend", "followed"]).optional(),
  page: z.coerce.number().int().min(1).max(100_000).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  industry: z.string().max(1000).optional(),
  brand: z.string().max(1000).optional(),
  channel: z.string().max(1000).optional(),
  eventType: z.string().max(1000).optional(),
  sourceTier: z.string().max(1000).optional(),
  from: z.string().max(40).optional(),
  to: z.string().max(40).optional(),
  read: z.enum(["true", "false"]).optional(),
  topic: z.enum(["true", "false"]).optional(),
});

interface ListFilters {
  scope: EventScope;
  sort: EventSort;
  page: number;
  pageSize: number;
  industries: string[] | null;
  brands: string[] | null;
  channels: ChannelType[] | null;
  eventTypes: string[] | null;
  sourceTiers: string[] | null;
  from: Date | null;
  to: Date | null;
  read: boolean | null;
  topic: boolean | null;
}

type FacetDimension = "industry" | "brand" | "channel" | "eventType" | "sourceTier";

function splitList(value: string | undefined): string[] | null {
  if (value === undefined) return null;
  const values = [...new Set(value.split(",").map((part) => part.trim()).filter(Boolean))];
  return values.length ? values : null;
}

function parseDay(value: string | undefined, label: string): Date | null {
  if (value === undefined || !value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new EventQueryRejected(`${label} 不是有效的时间`);
  return date;
}

function parseFilters(query: unknown): ListFilters {
  const parsed = QuerySchema.parse(query);
  // Old bookmarks and pre-migration events may still carry the legacy `industry` category. Ignore
  // that one; a genuinely unknown key is still a readable 400.
  let industries = splitList(parsed.industry);
  if (industries) {
    for (const key of industries) {
      if (!isCategoryKey(key) && key !== "industry") {
        throw new EventQueryRejected(`行业 ${key} 不存在，可选：${CATEGORY_KEYS.join("、")}`);
      }
    }
    industries = industries.filter(isCategoryKey);
    if (!industries.length) industries = null;
  }
  const brands = splitList(parsed.brand);
  if (brands) {
    for (const id of brands) {
      if (!SLUG.test(id)) throw new EventQueryRejected(`品牌 ID ${id} 不合法`);
    }
  }
  const channels = splitList(parsed.channel);
  if (channels) {
    for (const type of channels) {
      if (!(CHANNEL_TYPES as readonly string[]).includes(type)) {
        throw new EventQueryRejected(`渠道 ${type} 不存在，可选：${CHANNEL_TYPES.join("、")}`);
      }
    }
  }
  const eventTypes = splitList(parsed.eventType);
  if (eventTypes) {
    for (const type of eventTypes) {
      if (type.length > 100) throw new EventQueryRejected("事件类型最多 100 个字符");
    }
  }
  const sourceTiers = splitList(parsed.sourceTier);
  if (sourceTiers) {
    for (const tier of sourceTiers) {
      if (!/^[A-Za-z0-9_]{1,20}$/.test(tier)) throw new EventQueryRejected(`来源等级 ${tier} 不合法`);
    }
  }
  const from = parseDay(parsed.from, "from");
  const to = parseDay(parsed.to, "to");
  if (from && to && from.getTime() > to.getTime()) throw new EventQueryRejected("from 不能晚于 to");

  const sort = parsed.sort ?? "discovered";
  if (!SORTS.includes(sort)) throw new EventQueryRejected(`sort 只能是 ${SORTS.join("、")}`);

  return {
    scope: parsed.scope ?? "curated",
    sort,
    page: parsed.page ?? 1,
    pageSize: parsed.pageSize ?? 20,
    industries,
    brands,
    channels: channels as ChannelType[] | null,
    eventTypes,
    sourceTiers,
    from,
    to,
    read: parsed.read === undefined ? null : parsed.read === "true",
    topic: parsed.topic === undefined ? null : parsed.topic === "true",
  };
}

/**
 * The shared filter. A facet query passes its own dimension as `skip` so the other options keep
 * their counts while one value is selected.
 */
function filterCondition(filters: ListFilters, skip?: FacetDimension) {
  const industries = skip === "industry" ? null : filters.industries;
  const brands = skip === "brand" ? null : filters.brands;
  const channels = skip === "channel" ? null : filters.channels;
  const eventTypes = skip === "eventType" ? null : filters.eventTypes;
  const sourceTiers = skip === "sourceTier" ? null : filters.sourceTiers;
  return sql`
    s.merged_into IS NULL
    AND (${filters.scope} = 'all' OR m.selected_count > 0 OR m.evidence_source_count >= 2)
    AND (${industries}::text[] IS NULL OR m.categories && ${industries}::text[])
    AND (${brands}::text[] IS NULL OR m.brand_ids && ${brands}::text[])
    AND (${channels}::text[] IS NULL OR m.channel_types && ${channels}::text[])
    AND (${eventTypes}::text[] IS NULL OR m.event_type = ANY(${eventTypes}::text[]))
    AND (${sourceTiers}::text[] IS NULL OR m.source_tiers && ${sourceTiers}::text[])
    AND (${filters.from}::timestamptz IS NULL OR m.latest_at >= ${filters.from})
    AND (${filters.to}::timestamptz IS NULL OR m.latest_at <= ${filters.to})
    AND (${filters.read}::boolean IS NULL OR (st.read_at IS NOT NULL) = ${filters.read})
    AND (${filters.topic}::boolean IS NULL OR EXISTS (
      SELECT 1 FROM wc_topics t
      WHERE t.story_id = m.story_id AND t.status NOT IN ('ignored', 'archived')
    ) = ${filters.topic})`;
}

const FOLLOWED = sql`EXISTS (
  SELECT 1 FROM wc_follows f
  WHERE f.target_type = 'brand' AND f.target_id = ANY(m.brand_ids)
)`;

function orderBy(sort: EventSort) {
  switch (sort) {
    case "latest": return sql`m.latest_at DESC NULLS LAST, m.story_id DESC`;
    case "heat": return sql`m.heat DESC NULLS LAST, m.story_id DESC`;
    case "recommend": return sql`m.editorial_score DESC NULLS LAST, m.story_id DESC`;
    case "followed": return sql`followed DESC, m.latest_at DESC NULLS LAST, m.story_id DESC`;
    default: return sql`m.first_report_at DESC NULLS LAST, m.story_id DESC`;
  }
}

interface EventListRow {
  story_id: number;
  public_id: string;
  title: string;
  summary: string | null;
  categories: string[];
  brand_ids: string[];
  channel_types: ChannelType[];
  event_type: string | null;
  verification_status: EventVerification;
  updated: boolean;
  first_report_at: Date | null;
  latest_at: Date | null;
  primary_source: string | null;
  report_count: number;
  source_count: number;
  heat: number | string | null;
  news_value: number | string | null;
  editorial_score: number | string | null;
  score_reason: string | null;
  read_at: Date | null;
  starred_at: Date | null;
  ignored_at: Date | null;
  follow_up: boolean | null;
  manual_decision: EventManualDecision | null;
  decided_at: Date | null;
  topic_count: number;
  followed: boolean;
}

function numberOrNull(value: number | string | null): number | null {
  return value === null ? null : Number(value);
}

function iso(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}

function itemFromRow(row: EventListRow): StudioEventListItem {
  return {
    storyId: Number(row.story_id),
    publicId: row.public_id,
    title: row.title,
    summary: row.summary,
    categories: row.categories,
    // Filled in by listStudioEvents after one batch lookup for the page's brands.
    brands: [],
    channelTypes: row.channel_types,
    eventType: row.event_type,
    verificationStatus: row.verification_status,
    updated: row.updated,
    firstReportAt: iso(row.first_report_at),
    latestAt: iso(row.latest_at),
    primarySource: row.primary_source,
    reportCount: row.report_count,
    sourceCount: row.source_count,
    heat: numberOrNull(row.heat),
    newsValue: numberOrNull(row.news_value),
    recommendationScore: numberOrNull(row.editorial_score),
    recommendationReason: row.score_reason,
    topicCount: Number(row.topic_count),
    followed: row.followed,
    state: {
      read: row.read_at !== null,
      starred: row.starred_at !== null,
      ignored: row.ignored_at !== null,
      followUp: row.follow_up ?? false,
      manualDecision: row.manual_decision,
      decidedAt: iso(row.decided_at),
    },
  };
}

async function brandTags(ids: string[]) {
  if (!ids.length) return new Map<string, { name: string; followed: boolean }>();
  const [brands, follows] = await Promise.all([
    sql<{ id: string; name: string }[]>`SELECT id, name FROM wc_brands WHERE id = ANY(${ids}::text[])`,
    sql<{ target_id: string }[]>`
      SELECT target_id FROM wc_follows WHERE target_type = 'brand' AND target_id = ANY(${ids}::text[])`,
  ]);
  const followed = new Set(follows.map((row) => row.target_id));
  return new Map(brands.map((brand) => [brand.id, { name: brand.name, followed: followed.has(brand.id) }]));
}

async function facets(filters: ListFilters): Promise<StudioEventFacets> {
  const from = sql`
    FROM wc_event_meta m
    JOIN stories s ON s.id = m.story_id
    LEFT JOIN wc_event_states st ON st.story_id = m.story_id`;

  const [industries, brands, channels, eventTypes, sourceTiers] = await Promise.all([
    sql<{ value: string; count: number }[]>`
      SELECT x.value, count(*)::int AS count
      ${from}
      CROSS JOIN LATERAL unnest(m.categories) AS x(value)
      WHERE ${filterCondition(filters, "industry")}
      GROUP BY x.value ORDER BY count DESC, x.value`,
    sql<{ id: string; name: string; count: number }[]>`
      SELECT b.id, b.name, count(*)::int AS count
      ${from}
      CROSS JOIN LATERAL unnest(m.brand_ids) AS x(brand_id)
      JOIN wc_brands b ON b.id = x.brand_id
      WHERE ${filterCondition(filters, "brand")}
      GROUP BY b.id, b.name ORDER BY count DESC, b.name LIMIT 200`,
    sql<{ value: string; count: number }[]>`
      SELECT x.value, count(*)::int AS count
      ${from}
      CROSS JOIN LATERAL unnest(m.channel_types) AS x(value)
      WHERE ${filterCondition(filters, "channel")}
      GROUP BY x.value ORDER BY count DESC, x.value`,
    sql<{ value: string; count: number }[]>`
      SELECT m.event_type AS value, count(*)::int AS count
      ${from}
      WHERE m.event_type IS NOT NULL AND ${filterCondition(filters, "eventType")}
      GROUP BY m.event_type ORDER BY count DESC, m.event_type`,
    sql<{ value: string; count: number }[]>`
      SELECT x.value, count(*)::int AS count
      ${from}
      CROSS JOIN LATERAL unnest(m.source_tiers) AS x(value)
      WHERE ${filterCondition(filters, "sourceTier")}
      GROUP BY x.value ORDER BY count DESC, x.value`,
  ]);

  return {
    industries: industries
      .filter((row) => isCategoryKey(row.value))
      .map((row) => ({
        value: row.value,
        label: CATEGORY_LABELS[row.value as keyof typeof CATEGORY_LABELS] ?? row.value,
        count: Number(row.count),
      })),
    brands: brands.map((row) => ({ id: row.id, name: row.name, count: Number(row.count) })),
    channels: channels.map((row) => ({
      value: row.value,
      label: CHANNEL_LABELS[row.value as ChannelType] ?? row.value,
      count: Number(row.count),
    })),
    eventTypes: eventTypes.map((row) => ({ value: row.value, label: row.value, count: Number(row.count) })),
    sourceTiers: sourceTiers.map((row) => ({ value: row.value, label: row.value, count: Number(row.count) })),
  };
}

/** The hot list: curated by default, all collected events on request. */
export async function listStudioEvents(query: unknown): Promise<StudioEventList> {
  const filters = parseFilters(query);
  const from = sql`
    FROM wc_event_meta m
    JOIN stories s ON s.id = m.story_id
    LEFT JOIN wc_event_states st ON st.story_id = m.story_id`;
  const offset = (filters.page - 1) * filters.pageSize;

  const [rows, [totalRow], facetValues] = await Promise.all([
    sql<EventListRow[]>`
      SELECT m.story_id, s.public_id::text AS public_id, s.title, m.summary, m.categories, m.brand_ids,
             m.channel_types, m.event_type, m.verification_status, m.updated, m.first_report_at,
             m.latest_at, m.primary_source, m.report_count, m.source_count, m.heat, m.news_value,
             m.editorial_score, m.score_reason, st.read_at, st.starred_at, st.ignored_at, st.follow_up,
             st.manual_decision, st.decided_at,
             (SELECT count(*)::int FROM wc_topics t
              WHERE t.story_id = m.story_id AND t.status NOT IN ('ignored', 'archived')) AS topic_count,
             ${FOLLOWED} AS followed
      ${from}
      WHERE ${filterCondition(filters)}
      ORDER BY ${orderBy(filters.sort)}
      LIMIT ${filters.pageSize} OFFSET ${offset}`,
    sql<{ total: number }[]>`SELECT count(*)::int AS total ${from} WHERE ${filterCondition(filters)}`,
    facets(filters),
  ]);

  const items = rows.map(itemFromRow);
  const tags = await brandTags([...new Set(rows.flatMap((row) => row.brand_ids))]);
  for (const [index, row] of rows.entries()) {
    items[index]!.brands = row.brand_ids.map((id) => ({
      id,
      name: tags.get(id)?.name ?? id,
      followed: tags.get(id)?.followed ?? false,
    }));
  }

  const total = Number(totalRow?.total ?? 0);
  return {
    items,
    page: filters.page,
    pageSize: filters.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
    scope: filters.scope,
    sort: filters.sort,
    facets: facetValues,
  };
}
