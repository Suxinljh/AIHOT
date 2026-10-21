// The workbench's event read model. It projects the engine's public event data into wc_event_meta and
// wc_event_brands without touching the public publication layer: every field here is derived from
// stories, facts, publications and analyses, and a failed event only leaves its own row stale.
import { sql, type Db } from "@aihot/backend/db";
import { CATEGORY_TAGS, entityIdentity } from "@aihot/backend/editorial/vocabulary";
import { heatIndex, heatRows } from "@aihot/backend/events/hot";
import { logError } from "@aihot/backend/lib/log-error";
import { pickRepresentative, REPRESENTATIVE_COLUMNS, type RepresentativeIdentity } from "@aihot/backend/publication/representative";
import { compositeCondition, storyReportCondition } from "@aihot/backend/publication/scope";

const RECENT_DAYS = 30;
const CATEGORY_SET = new Set<string>(CATEGORY_TAGS);
const SUBJECT_SEPARATOR = /[,，、;；+＋&＆/]/u;

interface StoryRow {
  id: number;
  first_report_at: Date | null;
  latest_at: Date | null;
}

interface FactRow {
  id: number;
  subject: string | null;
  version: number;
}

interface ReportRow extends RepresentativeIdentity {
  id: string;
  source_id: string;
  source_kind: string;
  source_first_party: boolean;
  source_config: Record<string, unknown>;
  source_tags: string[];
  selected: boolean;
  tags: string[];
  category: string | null;
  body_mode: "full" | "summary";
  score: number | null;
  timeline_at: Date;
  at: Date;
  role: "primary" | "report" | "mention";
  subjects: string[] | null;
}

interface EventProjection {
  storyId: number;
  categories: string[];
  brandIds: string[];
  channelTypes: string[];
  sourceTiers: string[];
  eventType: string | null;
  verificationStatus: "unverified" | "confirmed";
  updated: boolean;
  firstReportAt: Date | null;
  latestAt: Date | null;
  reportCount: number;
  sourceCount: number;
  heat: number | null;
}

export interface ProjectionFailure {
  storyId: number;
  error: string;
}

export interface ProjectionResult {
  scope: "recent" | "all";
  candidates: number;
  projected: number;
  failed: number;
  failures: ProjectionFailure[];
  merged: MergeMigrationResult | null;
  mergeError: string | null;
  heatError: string | null;
}

export interface MergeMigrationResult {
  stories: number;
  topics: number;
  states: number;
  eventBrands: number;
  alerts: number;
  metas: number;
  failures: ProjectionFailure[];
}

export interface ProjectionOptions {
  scope?: "recent" | "all";
  now?: Date;
}

export interface ProjectEventOptions {
  now?: Date;
  heat?: number | null;
}

function errorText(error: unknown): string {
  const logged = logError(error);
  return logged.code ? `${logged.type} (${logged.code})` : logged.type;
}

function logProjectionError(message: string, storyId: number | null, error: unknown): void {
  console.error(JSON.stringify({ level: "error", msg: message, storyId, error: logError(error) }));
}

function splitSubjects(values: Array<string | null | undefined>): string[] {
  const ids = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    for (const part of value.split(SUBJECT_SEPARATOR)) {
      const id = entityIdentity(part);
      if (id) ids.add(id);
    }
  }
  return [...ids];
}

function sourceHosts(config: Record<string, unknown>): string[] {
  const out: string[] = [];
  for (const key of ["feedUrl", "listUrl", "url", "endpoint", "apiUrl"]) {
    const value = config[key];
    if (typeof value !== "string" || !value.trim()) continue;
    try {
      out.push(new URL(value).hostname.toLowerCase());
    } catch {
      // A relative or templated address names no host.
    }
  }
  return out;
}

const onHost = (hosts: string[], domain: string) => hosts.some((host) => host === domain || host.endsWith(`.${domain}`));

/** A source's channel type; a verified wc_channels row overrides this fallback when it exists. */
function inferredChannelType(report: ReportRow): string {
  const hosts = sourceHosts(report.source_config);
  if (onHost(hosts, "github.com")) return "github";
  if (onHost(hosts, "weibo.com") || onHost(hosts, "weibo.cn")) return "weibo";
  if (onHost(hosts, "mp.weixin.qq.com") || onHost(hosts, "weixin.qq.com")) return "wechat";
  if (onHost(hosts, "x.com") || onHost(hosts, "twitter.com")) return "x";
  if (report.source_kind === "x_search") return "x";
  if (report.source_kind === "mp_account") return "wechat";
  if (report.source_first_party || report.source_tier === "T1" || report.owner_entity_id || report.source_tags.some((tag) => tag === "官方" || tag.toLowerCase() === "official")) return "official_site";
  return "media";
}

async function readEvent(db: Db, storyId: number, now: Date): Promise<EventProjection | null> {
  const [story] = await db<StoryRow[]>`
    SELECT id, first_report_at, latest_at FROM stories WHERE id = ${storyId} AND merged_into IS NULL`;
  if (!story) return null;

  const reports = await db<ReportRow[]>`
    SELECT DISTINCT ON (p.article_id) p.article_id AS id, p.source_id, s.kind AS source_kind,
      s.first_party AS source_first_party, s.config AS source_config, s.tags AS source_tags,
      p.selected, p.tags, p.category, p.body_mode, p.score, p.timeline_at,
      coalesce(p.published_at, p.discovered_at) AS at,
      CASE WHEN ${compositeCondition()} THEN 'mention' ELSE fa.role END AS role,
      an.subjects, ${REPRESENTATIVE_COLUMNS}
    FROM facts f
    JOIN fact_articles fa ON fa.fact_id = f.id
    JOIN publications p ON p.article_id = fa.article_id
    JOIN sources s ON s.id = p.source_id
    LEFT JOIN analyses an ON an.id = p.analysis_id
    WHERE f.story_id = ${storyId} AND ${storyReportCondition(now)}
    ORDER BY p.article_id, (fa.role = 'primary') DESC, (fa.role <> 'mention') DESC, f.id`;
  const facts = await db<FactRow[]>`SELECT id, subject, version FROM facts WHERE story_id = ${storyId}`;

  const evidence = reports.filter((report) => report.role !== "mention");
  const representativePool = evidence.length ? evidence : reports;
  const selectedReports = representativePool.filter((report) => report.selected);
  const representative = representativePool.length
    ? pickRepresentative((selectedReports.length ? selectedReports : representativePool).map((report) => ({ ...report, article_id: report.id })))
    : null;
  const entityIds = splitSubjects([
    ...evidence.flatMap((report) => report.subjects ?? []),
    ...facts.map((fact) => fact.subject),
  ]);
  const brandIds = entityIds.length
    ? (await db<{ id: string }[]>`SELECT id FROM wc_brands WHERE entity_id = ANY(${entityIds}::text[])`).map((row) => row.id)
    : [];

  const sourceIds = [...new Set(reports.map((report) => report.source_id))];
  const linkedChannels = sourceIds.length
    ? await db<{ source_id: string; type: string }[]>`SELECT source_id, type FROM wc_channels WHERE source_id = ANY(${sourceIds}::text[])`
    : [];
  const channelsBySource = new Map<string, Set<string>>();
  for (const channel of linkedChannels) {
    const types = channelsBySource.get(channel.source_id) ?? new Set<string>();
    types.add(channel.type);
    channelsBySource.set(channel.source_id, types);
  }
  const channelTypes = new Set<string>();
  for (const report of reports) {
    const linked = channelsBySource.get(report.source_id);
    if (linked?.size) for (const type of linked) channelTypes.add(type);
    else channelTypes.add(inferredChannelType(report));
  }

  const evidenceTimes = evidence.map((report) => report.at.getTime());
  const firstReportAt = evidenceTimes.length ? new Date(Math.min(...evidenceTimes)) : story.first_report_at;
  const latestAt = evidenceTimes.length ? new Date(Math.max(...evidenceTimes)) : story.latest_at;

  return {
    storyId,
    categories: [...new Set(evidence.map((report) => report.category).filter((value): value is string => !!value))].sort(),
    brandIds: [...new Set(brandIds)].sort(),
    channelTypes: [...channelTypes].sort(),
    sourceTiers: [...new Set(reports.map((report) => report.source_tier))].sort(),
    eventType: representative?.tags.find((tag) => CATEGORY_SET.has(tag)) ?? null,
    verificationStatus: evidence.some((report) => report.source_tier === "T1" || report.source_first_party) ? "confirmed" : "unverified",
    updated: facts.length > 1 || facts.some((fact) => fact.version > 1),
    firstReportAt,
    latestAt,
    reportCount: reports.length,
    sourceCount: sourceIds.length,
    heat: null,
  };
}

async function writeEvent(db: Db, event: EventProjection, now: Date): Promise<void> {
  await db`
    INSERT INTO wc_event_meta (
      story_id, categories, brand_ids, channel_types, source_tiers, event_type, verification_status,
      updated, first_report_at, latest_at, report_count, source_count, heat, projected_at
    ) VALUES (
      ${event.storyId}, ${event.categories}, ${event.brandIds}, ${event.channelTypes}, ${event.sourceTiers},
      ${event.eventType}, ${event.verificationStatus}, ${event.updated}, ${event.firstReportAt}, ${event.latestAt},
      ${event.reportCount}, ${event.sourceCount}, ${event.heat}, ${now}
    )
    ON CONFLICT (story_id) DO UPDATE SET
      categories = EXCLUDED.categories,
      brand_ids = EXCLUDED.brand_ids,
      channel_types = EXCLUDED.channel_types,
      source_tiers = EXCLUDED.source_tiers,
      event_type = EXCLUDED.event_type,
      verification_status = CASE WHEN wc_event_meta.verification_status = 'disputed' THEN 'disputed' ELSE EXCLUDED.verification_status END,
      updated = EXCLUDED.updated,
      first_report_at = EXCLUDED.first_report_at,
      latest_at = EXCLUDED.latest_at,
      report_count = EXCLUDED.report_count,
      source_count = EXCLUDED.source_count,
      heat = EXCLUDED.heat,
      projected_at = EXCLUDED.projected_at`;
  await db`DELETE FROM wc_event_brands WHERE story_id = ${event.storyId}`;
  if (event.brandIds.length) {
    await db`
      INSERT INTO wc_event_brands (story_id, brand_id)
      SELECT ${event.storyId}, unnest(${event.brandIds}::text[])
      ON CONFLICT DO NOTHING`;
  }
}

/** Projects one live event; false when the story is missing or already merged. */
export async function projectEvent(storyId: number, options: ProjectEventOptions = {}): Promise<boolean> {
  const now = options.now ?? new Date();
  return sql.begin(async (tx) => {
    const event = await readEvent(tx, storyId, now);
    if (!event) return false;
    event.heat = options.heat ?? null;
    await writeEvent(tx, event, now);
    return true;
  });
}

function survivorOf(mergedInto: Map<number, number | null>, storyId: number): number | null {
  let current = storyId;
  const seen = new Set<number>();
  for (;;) {
    if (seen.has(current)) return null;
    seen.add(current);
    const next = mergedInto.get(current);
    if (next === null || next === undefined) return current;
    current = next;
  }
}

/**
 * Moves the workbench's event references from every merged story to its surviving story. The
 * projection schedule runs this first; it is also safe to run repeatedly.
 */
export async function migrateMergedEventReferences(): Promise<MergeMigrationResult> {
  const rows = await sql<{ id: number; merged_into: number | null; has_refs: boolean }[]>`
    SELECT s.id, s.merged_into, (
      EXISTS (SELECT 1 FROM wc_topics t WHERE t.story_id = s.id)
      OR EXISTS (SELECT 1 FROM wc_event_states e WHERE e.story_id = s.id)
      OR EXISTS (SELECT 1 FROM wc_event_brands b WHERE b.story_id = s.id)
      OR EXISTS (SELECT 1 FROM wc_alerts a WHERE a.story_id = s.id)
      OR EXISTS (SELECT 1 FROM wc_event_meta m WHERE m.story_id = s.id)
    ) AS has_refs
    FROM stories s WHERE s.merged_into IS NOT NULL`;
  const mergedInto = new Map(rows.map((row) => [row.id, row.merged_into]));
  const result: MergeMigrationResult = { stories: 0, topics: 0, states: 0, eventBrands: 0, alerts: 0, metas: 0, failures: [] };

  for (const row of rows) {
    if (!row.has_refs) continue;
    const survivor = survivorOf(mergedInto, row.id);
    if (survivor === null || survivor === row.id) continue;
    try {
      const moved = await sql.begin(async (tx) => {
        const topics = await tx<{ id: number }[]>`
          UPDATE wc_topics SET story_id = ${survivor}, updated_at = now() WHERE story_id = ${row.id} RETURNING id`;
        const states = await tx<{ story_id: number }[]>`
          INSERT INTO wc_event_states (story_id, read_at, starred_at, ignored_at, follow_up, manual_decision, decided_at, updated_at)
          SELECT ${survivor}, read_at, starred_at, ignored_at, follow_up, manual_decision, decided_at, updated_at
          FROM wc_event_states WHERE story_id = ${row.id}
          ON CONFLICT (story_id) DO UPDATE SET
            read_at = least(wc_event_states.read_at, EXCLUDED.read_at),
            starred_at = least(wc_event_states.starred_at, EXCLUDED.starred_at),
            ignored_at = least(wc_event_states.ignored_at, EXCLUDED.ignored_at),
            follow_up = wc_event_states.follow_up OR EXCLUDED.follow_up,
            manual_decision = coalesce(wc_event_states.manual_decision, EXCLUDED.manual_decision),
            decided_at = coalesce(wc_event_states.decided_at, EXCLUDED.decided_at),
            updated_at = greatest(wc_event_states.updated_at, EXCLUDED.updated_at)
          RETURNING story_id`;
        await tx`DELETE FROM wc_event_states WHERE story_id = ${row.id}`;
        const eventBrands = await tx<{ brand_id: string }[]>`
          INSERT INTO wc_event_brands (story_id, brand_id)
          SELECT ${survivor}, brand_id FROM wc_event_brands WHERE story_id = ${row.id}
          ON CONFLICT DO NOTHING RETURNING brand_id`;
        await tx`DELETE FROM wc_event_brands WHERE story_id = ${row.id}`;
        const alerts = await tx<{ id: number }[]>`
          UPDATE wc_alerts SET story_id = ${survivor} WHERE story_id = ${row.id} RETURNING id`;
        const metas = await tx<{ story_id: number }[]>`
          DELETE FROM wc_event_meta WHERE story_id = ${row.id} RETURNING story_id`;
        return {
          topics: topics.length,
          states: states.length,
          eventBrands: eventBrands.length,
          alerts: alerts.length,
          metas: metas.length,
        };
      });
      result.stories += 1;
      result.topics += moved.topics;
      result.states += moved.states;
      result.eventBrands += moved.eventBrands;
      result.alerts += moved.alerts;
      result.metas += moved.metas;
    } catch (error) {
      const failure = { storyId: row.id, error: errorText(error) };
      result.failures.push(failure);
      logProjectionError("wechathot merged event migration failed", row.id, error);
    }
  }
  return result;
}

/**
 * Projects the workbench event read model. `recent` is the five-minute schedule's 30-day window;
 * `all` is the repeatable first backfill. One event's failure never stops the rest.
 */
export async function projectEvents(options: ProjectionOptions = {}): Promise<ProjectionResult> {
  const scope = options.scope ?? "recent";
  const now = options.now ?? new Date();
  let merged: MergeMigrationResult | null = null;
  let mergeError: string | null = null;
  try {
    merged = await migrateMergedEventReferences();
  } catch (error) {
    mergeError = errorText(error);
    logProjectionError("wechathot merged event migration failed", null, error);
  }

  const stories = await sql<{ id: number }[]>`
    SELECT id FROM stories
    WHERE merged_into IS NULL
      ${scope === "recent" ? sql`AND updated_at >= ${now}::timestamptz - make_interval(days => ${RECENT_DAYS})` : sql``}
    ORDER BY id`;
  const ids = stories.map((story) => story.id);
  const heatByStory = new Map<number, number>();
  let heatError: string | null = null;
  if (ids.length) {
    try {
      for (const row of await heatRows(now, [], ids)) heatByStory.set(Number(row.story_id), heatIndex(Number(row.heat)));
    } catch (error) {
      heatError = errorText(error);
      logProjectionError("wechathot event heat read failed", null, error);
    }
  }

  let projected = 0;
  let failed = 0;
  const failures: ProjectionFailure[] = [];
  for (const story of stories) {
    try {
      if (await projectEvent(story.id, { now, heat: heatByStory.get(story.id) ?? null })) projected += 1;
    } catch (error) {
      failed += 1;
      if (failures.length < 20) failures.push({ storyId: story.id, error: errorText(error) });
      logProjectionError("wechathot event projection failed", story.id, error);
    }
  }
  return {
    scope,
    candidates: stories.length,
    projected,
    failed,
    failures,
    merged,
    mergeError,
    heatError,
  };
}

/** The five-minute worker schedule: recently updated live events only. */
export function projectRecentEvents(): Promise<ProjectionResult> {
  return projectEvents({ scope: "recent" });
}
