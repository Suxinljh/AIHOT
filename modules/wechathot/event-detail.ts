// The workbench's event detail: the public event's own reading ability plus the private state the
// studio keeps. The public layer is only read; every wc_ row is the studio's own.
import { z } from "zod";
import { audit } from "@aihot/backend/audit";
import { sql } from "@aihot/backend/db";
import { loadStoryDetail } from "@aihot/backend/publication/stories";
import type {
  ChannelType,
  EventManualDecision,
  EventVerification,
  StudioEventBrand,
  StudioEventDetail,
  StudioEventFact,
  StudioEventPitch,
  StudioEventReport,
  StudioEventState,
} from "./studio-types.ts";

/** A bad state command is the caller's mistake. */
export class EventStateRejected extends Error {
  readonly statusCode = 400;
  readonly code = "invalid_request";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DECISIONS = ["recommend", "ignore", "later", "reported"] as const;

const StateSchema = z
  .object({
    read: z.boolean().optional(),
    starred: z.boolean().optional(),
    ignored: z.boolean().optional(),
    followUp: z.boolean().optional(),
    manualDecision: z.union([z.enum(DECISIONS), z.null()]).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "请至少指定一项状态");

interface StoryRow {
  id: number;
  public_id: string;
  title: string;
  summary: string | null;
  digest: string | null;
  digest_updated_at: Date | null;
  first_report_at: Date | null;
  latest_at: Date | null;
  merged_into: number | null;
}

interface MetaRow {
  story_id: number;
  summary: string | null;
  primary_source: string | null;
  categories: string[];
  brand_ids: string[];
  channel_types: ChannelType[];
  source_tiers: string[];
  event_type: string | null;
  verification_status: EventVerification;
  updated: boolean;
  first_report_at: Date | null;
  latest_at: Date | null;
  report_count: number;
  source_count: number;
  heat: number | string | null;
  news_value: number | string | null;
  editorial_score: number | string | null;
  score_dims: Record<string, number>;
  score_reason: string | null;
  score_missing: string[];
  scored_at: Date | null;
}

interface StateRow {
  read_at: Date | null;
  starred_at: Date | null;
  ignored_at: Date | null;
  follow_up: boolean;
  manual_decision: EventManualDecision | null;
  decided_at: Date | null;
}

interface PitchRow {
  id: number;
  angle: string | null;
  status: string;
  column_type: string;
  created_at: Date;
}

/** The event the public id names, following a merge chain to the surviving story. */
async function resolveStory(publicId: string): Promise<{
  storyId: number;
  survivorPublicId: string;
  merged: boolean;
  title: string;
  summary: string | null;
  digest: string | null;
  digestUpdatedAt: Date | null;
  firstReportAt: Date | null;
  latestAt: Date | null;
} | null> {
  if (!UUID.test(publicId)) return null;
  let [story] = await sql<StoryRow[]>`
    SELECT id, public_id::text, title, summary, digest, digest_updated_at, first_report_at, latest_at, merged_into
    FROM stories WHERE public_id = ${publicId}`;
  if (!story) {
    const [alias] = await sql<{ story_id: number }[]>`SELECT story_id FROM story_aliases WHERE public_id = ${publicId}`;
    if (!alias) return null;
    [story] = await sql<StoryRow[]>`
      SELECT id, public_id::text, title, summary, digest, digest_updated_at, first_report_at, latest_at, merged_into
      FROM stories WHERE id = ${alias.story_id}`;
    if (!story) return null;
  }
  const merged = story.merged_into !== null;
  const seen = new Set<number>([story.id]);
  let current = story;
  while (current.merged_into !== null) {
    if (seen.has(current.merged_into)) break;
    seen.add(current.merged_into);
    const [next] = await sql<StoryRow[]>`
      SELECT id, public_id::text, title, summary, digest, digest_updated_at, first_report_at, latest_at, merged_into
      FROM stories WHERE id = ${current.merged_into}`;
    if (!next) break;
    current = next;
  }
  return {
    storyId: current.id,
    survivorPublicId: current.public_id,
    merged,
    title: current.title,
    summary: current.summary,
    digest: current.digest,
    digestUpdatedAt: current.digest_updated_at,
    firstReportAt: current.first_report_at,
    latestAt: current.latest_at,
  };
}

function numberOrNull(value: number | string | null): number | null {
  return value === null ? null : Number(value);
}

function iso(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}

function reportView(
  report: { id: string; title: string; summary: string | null; source: { name: string; firstParty: boolean }; publishedAt: string; selected: boolean },
  urls: Map<string, string>,
): StudioEventReport {
  return { ...report, url: urls.get(report.id) ?? null };
}

function stateOf(row: StateRow | undefined): StudioEventState {
  return {
    read: !!row?.read_at,
    starred: !!row?.starred_at,
    ignored: !!row?.ignored_at,
    followUp: row?.follow_up ?? false,
    manualDecision: row?.manual_decision ?? null,
    decidedAt: iso(row?.decided_at ?? null),
  };
}

/** The event as the studio sees it: public evidence plus private state. */
export async function studioEventDetail(publicId: string): Promise<StudioEventDetail | null> {
  const resolved = await resolveStory(publicId);
  if (!resolved) return null;
  const storyId = resolved.storyId;

  const [meta, state, pitches, brands, content] = await Promise.all([
    sql<MetaRow[]>`
      SELECT story_id, summary, primary_source, categories, brand_ids, channel_types, source_tiers, event_type,
             verification_status, updated, first_report_at, latest_at, report_count, source_count, heat,
             news_value, editorial_score, score_dims, score_reason, score_missing, scored_at
      FROM wc_event_meta WHERE story_id = ${storyId}`,
    sql<StateRow[]>`
      SELECT read_at, starred_at, ignored_at, follow_up, manual_decision, decided_at
      FROM wc_event_states WHERE story_id = ${storyId}`,
    sql<PitchRow[]>`
      SELECT id, angle, status, column_type, created_at
      FROM wc_topics WHERE story_id = ${storyId}
      ORDER BY created_at DESC LIMIT 20`,
    sql<{ id: string; name: string; followed: boolean }[]>`
      SELECT b.id, b.name,
             EXISTS (SELECT 1 FROM wc_follows f WHERE f.target_type = 'brand' AND f.target_id = b.id) AS followed
      FROM wc_event_brands eb
      JOIN wc_brands b ON b.id = eb.brand_id
      WHERE eb.story_id = ${storyId}
      ORDER BY b.name`,
    loadStoryDetail(storyId),
  ]);
  if (!content && !meta.length) return null;

  const reportIds = [...(content?.timeline ?? []), ...(content?.officialReports ?? [])].map((report) => report.id);
  const urls = new Map<string, string>();
  if (reportIds.length) {
    for (const row of await sql<{ article_id: string; url: string }[]>`
      SELECT article_id, url FROM publications WHERE article_id = ANY(${reportIds}::text[])`) {
      urls.set(row.article_id, row.url);
    }
  }

  const metaRow = meta[0];
  const scoreDims = (metaRow?.score_dims ?? {}) as Record<string, unknown>;
  const dims: Record<string, number> = {};
  for (const [key, value] of Object.entries(scoreDims)) {
    if (typeof value === "number") dims[key] = value;
  }
  const brandIds = new Set([...(metaRow?.brand_ids ?? []), ...brands.map((brand) => brand.id)]);
  const brandList: StudioEventBrand[] = brands.map((brand) => ({ id: brand.id, name: brand.name, followed: brand.followed }));
  for (const id of brandIds) {
    if (!brandList.some((brand) => brand.id === id)) brandList.push({ id, name: id, followed: false });
  }

  const pitchRows = pitches.map((pitch): StudioEventPitch => ({
    id: Number(pitch.id),
    angle: pitch.angle,
    status: pitch.status,
    columnType: pitch.column_type,
    createdAt: pitch.created_at.toISOString(),
  }));

  const facts: StudioEventFact[] = (content?.developments ?? []).map((fact) => ({
    factId: fact.factId,
    title: fact.title,
    firstReportAt: fact.firstReportAt,
    reportCount: fact.reportCount,
    representative: reportView(fact.representative, urls),
  }));

  return {
    publicId: resolved.survivorPublicId,
    storyId,
    title: content?.title ?? resolved.title,
    status: content?.status ?? "settled",
    summary: metaRow?.summary ?? content?.summary ?? null,
    digest: content?.digest ?? null,
    digestUpdatedAt: content?.digestUpdatedAt ?? null,
    excerpt: content?.excerpt ?? null,
    latest: content?.latest ?? null,
    firstReportAt: content?.firstReportAt ?? iso(metaRow?.first_report_at ?? null),
    latestAt: content?.latestAt ?? iso(metaRow?.latest_at ?? null),
    reportCount: content?.reportCount ?? metaRow?.report_count ?? 0,
    sourceCount: content?.sourceCount ?? metaRow?.source_count ?? 0,
    primarySource: metaRow?.primary_source ?? null,
    categories: metaRow?.categories ?? [],
    brands: brandList,
    channelTypes: metaRow?.channel_types ?? [],
    sourceTiers: metaRow?.source_tiers ?? [],
    eventType: metaRow?.event_type ?? null,
    verificationStatus: metaRow?.verification_status ?? "unverified",
    updated: metaRow?.updated ?? false,
    heat: numberOrNull(metaRow?.heat ?? null),
    newsValue: numberOrNull(metaRow?.news_value ?? null),
    recommendation: metaRow?.editorial_score === null || metaRow?.editorial_score === undefined
      ? null
      : {
        score: Number(metaRow.editorial_score),
        dims,
        reason: metaRow.score_reason,
        missing: metaRow.score_missing ?? [],
        scoredAt: iso(metaRow.scored_at),
        column: scoreDims.column === "insight" ? "insight" : scoreDims.column === "news" ? "news" : null,
        confidence: scoreDims.confidence === "high" || scoreDims.confidence === "low" ? scoreDims.confidence : scoreDims.confidence === "medium" ? "medium" : null,
        angles: Array.isArray(scoreDims.angles) ? scoreDims.angles.filter((angle): angle is string => typeof angle === "string") : [],
      },
    facts,
    timeline: (content?.timeline ?? []).map((report) => reportView(report, urls)),
    officialReports: (content?.officialReports ?? []).map((report) => reportView(report, urls)),
    heatSeries: content?.heat ?? [],
    whyHot: content?.whyHot ?? {
      participants48h: 0,
      newParticipants6h: 0,
      recentReports24h: 0,
      observationComplete: true,
      rank: null,
    },
    state: stateOf(state[0]),
    pitches: pitchRows,
    pitchCount: pitchRows.length,
    followed: brandList.some((brand) => brand.followed),
    mergedFrom: resolved.merged ? publicId : null,
  };
}

/**
 * The editor's own decisions on an event: read, starred, ignored, follow-up and the manual call.
 * Every change is audited, and the read state is only set, never cleared by another event's state.
 */
export async function updateStudioEventState(publicId: string, input: unknown, actor: string): Promise<StudioEventDetail | null> {
  const patch = StateSchema.parse(input);
  const resolved = await resolveStory(publicId);
  if (!resolved) return null;
  const storyId = resolved.storyId;

  await sql.begin(async (tx) => {
    const [before] = await tx<StateRow[]>`
      SELECT read_at, starred_at, ignored_at, follow_up, manual_decision, decided_at
      FROM wc_event_states WHERE story_id = ${storyId} FOR UPDATE`;
    const now = new Date();
    const readAt = patch.read === undefined ? (before?.read_at ?? null) : patch.read ? now : null;
    const starredAt = patch.starred === undefined ? (before?.starred_at ?? null) : patch.starred ? now : null;
    const ignoredAt = patch.ignored === undefined ? (before?.ignored_at ?? null) : patch.ignored ? now : null;
    const followUp = patch.followUp === undefined ? (before?.follow_up ?? false) : patch.followUp;
    const manualDecision = patch.manualDecision === undefined ? (before?.manual_decision ?? null) : patch.manualDecision;
    const decidedAt = patch.manualDecision === undefined
      ? (before?.decided_at ?? null)
      : patch.manualDecision ? now : null;
    await tx`
      INSERT INTO wc_event_states (story_id, read_at, starred_at, ignored_at, follow_up, manual_decision, decided_at, updated_at)
      VALUES (${storyId}, ${readAt}, ${starredAt}, ${ignoredAt}, ${followUp}, ${manualDecision}, ${decidedAt}, now())
      ON CONFLICT (story_id) DO UPDATE SET
        read_at = EXCLUDED.read_at,
        starred_at = EXCLUDED.starred_at,
        ignored_at = EXCLUDED.ignored_at,
        follow_up = EXCLUDED.follow_up,
        manual_decision = EXCLUDED.manual_decision,
        decided_at = EXCLUDED.decided_at,
        updated_at = now()`;
    await audit(actor, "event.state", `story:${storyId}`, "事件状态", before ?? null, patch, { db: tx });
  });

  return studioEventDetail(publicId);
}
