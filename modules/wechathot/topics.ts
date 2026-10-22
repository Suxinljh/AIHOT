// The pitch board's write side: a topic is a private editorial task derived from an event. The
// event's evidence is frozen into a snapshot when the topic is created, so a later report never
// rewrites a topic behind the editor's back.
import { z } from "zod";
import { audit } from "@aihot/backend/audit";
import { sql, type Db } from "@aihot/backend/db";
import { resolvePreset } from "./presets.ts";
import type { EventVerification, StudioTopic, TopicSnapshot, TopicStatus, TopicWriting } from "./studio-types.ts";

/** A topic command that cannot be applied. */
export class TopicRejected extends Error {
  readonly statusCode = 400;
  readonly code = "invalid_request";
}

/** The event already has a topic; the caller has to confirm before another one is made. */
export class TopicExists extends Error {
  readonly statusCode = 409;
  readonly code = "conflict";
  readonly existing: StudioTopic[];
  constructor(existing: StudioTopic[]) {
    super("这个事件已经有选题了");
    this.existing = existing;
  }
}

export const TOPIC_STATUSES: TopicStatus[] = ["pending", "researching", "ready", "writing", "done", "ignored", "archived"];

/** Where a topic may go next. A topic that is done can be reopened; a topic can always be ignored. */
const TRANSITIONS: Record<TopicStatus, TopicStatus[]> = {
  pending: ["researching", "ignored", "archived"],
  researching: ["ready", "pending", "ignored", "archived"],
  ready: ["writing", "researching", "ignored", "archived"],
  writing: ["done", "ready", "ignored", "archived"],
  done: ["writing", "archived"],
  ignored: ["pending", "archived"],
  archived: ["pending", "ignored"],
};

export const TOPIC_STATUS_LABELS: Record<TopicStatus, string> = {
  pending: "待评估",
  researching: "待研究",
  ready: "待写作",
  writing: "写作中",
  done: "已完成",
  ignored: "已忽略",
  archived: "归档",
};

const CreateSchema = z
  .object({
    storyId: z.number().int().positive(),
    angle: z.string().trim().max(200).nullable().optional(),
    columnType: z.enum(["news", "insight"]).optional(),
    notes: z.string().trim().max(4000).nullable().optional(),
    /** The editor has seen the existing topics and wants another angle anyway. */
    force: z.boolean().optional(),
  })
  .strict();

const OutlineSchema = z.object({
  sections: z.array(z.object({
    title: z.string().trim().min(1).max(200),
    points: z.array(z.string().trim().min(1).max(300)).max(20),
  })).min(1).max(20),
  note: z.string().trim().max(1000).default(""),
});

const UpdateSchema = z
  .object({
    angle: z.string().trim().max(200).nullable().optional(),
    columnType: z.enum(["news", "insight"]).optional(),
    notes: z.string().trim().max(4000).nullable().optional(),
    status: z.enum(TOPIC_STATUSES as [TopicStatus, ...TopicStatus[]]).optional(),
    /** The outline the editor rewrote by hand. */
    outline: OutlineSchema.nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "请至少指定一项内容");

interface TopicRow {
  id: number;
  story_id: number;
  angle: string | null;
  column_type: "news" | "insight";
  status: TopicStatus;
  notes: string | null;
  source_snapshot: TopicSnapshot | null;
  style_preset_id: string | null;
  writing: TopicWriting | null;
  created_at: Date;
  updated_at: Date;
  public_id: string | null;
  event_title: string | null;
  verification_status: EventVerification | null;
  heat: number | string | null;
  editorial_score: number | string | null;
  latest_at: Date | null;
}

function numberOrNull(value: number | string | null): number | null {
  return value === null ? null : Number(value);
}

async function topicView(row: TopicRow): Promise<StudioTopic> {
  const stylePreset = await resolvePreset(row.column_type, row.style_preset_id);
  return {
    id: Number(row.id),
    storyId: Number(row.story_id),
    publicId: row.public_id,
    eventTitle: row.event_title,
    angle: row.angle,
    columnType: row.column_type,
    status: row.status,
    notes: row.notes,
    snapshot: row.source_snapshot ?? null,
    writing: row.writing ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    stylePresetId: row.style_preset_id,
    stylePreset,
    event: row.public_id
      ? {
        publicId: row.public_id,
        title: row.event_title ?? "事件",
        verificationStatus: row.verification_status ?? "unverified",
        heat: numberOrNull(row.heat),
        recommendationScore: numberOrNull(row.editorial_score),
        latestAt: row.latest_at?.toISOString() ?? null,
      }
      : null,
  };
}

const SELECT_TOPIC = sql`
  SELECT t.id, t.story_id, t.angle, t.column_type, t.status, t.notes, t.source_snapshot, t.style_preset_id, t.writing,
         t.created_at, t.updated_at, s.public_id::text AS public_id, s.title AS event_title,
         m.verification_status, m.heat, m.editorial_score, m.latest_at
  FROM wc_topics t
  LEFT JOIN stories s ON s.id = t.story_id
  LEFT JOIN wc_event_meta m ON m.story_id = t.story_id`;

/** The event's evidence, frozen at the moment the topic was created. */
export async function buildSnapshot(storyId: number): Promise<TopicSnapshot | null> {
  const [event] = await sql<{ title: string; summary: string | null; brands: string[]; categories: string[]; editorial_score: number | string | null }[]>`
    SELECT s.title, m.summary, m.brand_ids, m.categories, m.editorial_score
    FROM stories s
    LEFT JOIN wc_event_meta m ON m.story_id = s.id
    WHERE s.id = ${storyId}`;
  if (!event) return null;
  const reports = await sql<{ id: string; title: string; summary: string | null; source_name: string; url: string; tier: string | null; at: Date }[]>`
    SELECT p.article_id AS id, p.title, p.summary, s.name AS source_name, p.url, s.tier,
           coalesce(p.published_at, p.discovered_at) AS at
    FROM facts f
    JOIN fact_articles fa ON fa.fact_id = f.id
    JOIN publications p ON p.article_id = fa.article_id
    JOIN sources s ON s.id = p.source_id
    WHERE f.story_id = ${storyId}
    ORDER BY coalesce(p.published_at, p.discovered_at) DESC, p.article_id
    LIMIT 20`;
  return {
    title: event.title,
    summary: event.summary,
    categories: event.categories,
    brands: event.brands,
    score: numberOrNull(event.editorial_score),
    capturedAt: new Date().toISOString(),
    reports: reports.map((report) => ({
      id: report.id,
      title: report.title,
      summary: report.summary,
      source: report.source_name,
      url: report.url,
      tier: report.tier,
      publishedAt: report.at.toISOString(),
    })),
  };
}

export interface TopicFilters {
  status?: TopicStatus | "all";
  columnType?: "news" | "insight";
  storyId?: number;
  q?: string;
  limit?: number;
}

export async function listTopics(filters: TopicFilters = {}): Promise<StudioTopic[]> {
  const status = filters.status ?? "all";
  const pattern = filters.q?.trim() ? `%${filters.q.trim()}%` : null;
  const rows = await sql<TopicRow[]>`
    ${SELECT_TOPIC}
    WHERE (${status}::text = 'all' OR t.status = ${status})
      AND (${filters.columnType ?? null}::text IS NULL OR t.column_type = ${filters.columnType ?? null})
      AND (${filters.storyId ?? null}::bigint IS NULL OR t.story_id = ${filters.storyId ?? null})
      AND (${pattern}::text IS NULL OR t.angle ILIKE ${pattern} OR s.title ILIKE ${pattern})
    ORDER BY t.updated_at DESC, t.id DESC
    LIMIT ${Math.min(Math.max(filters.limit ?? 200, 1), 500)}`;
  return Promise.all(rows.map(topicView));
}

export async function topicDetail(id: number): Promise<StudioTopic | null> {
  const [row] = await sql<TopicRow[]>`${SELECT_TOPIC} WHERE t.id = ${id}`;
  return row ? await topicView(row) : null;
}

export async function topicsOfStory(storyId: number): Promise<StudioTopic[]> {
  const rows = await sql<TopicRow[]>`${SELECT_TOPIC} WHERE t.story_id = ${storyId} ORDER BY t.created_at DESC`;
  return Promise.all(rows.map(topicView));
}

/** Creates a topic. An event that already has one asks first instead of making a duplicate. */
export async function createTopic(input: unknown, actor: string): Promise<StudioTopic> {
  const draft = CreateSchema.parse(input);
  const snapshot = await buildSnapshot(draft.storyId);
  if (!snapshot) throw new TopicRejected("事件不存在");

  const existing = (await topicsOfStory(draft.storyId)).filter((topic) => topic.status !== "archived");
  if (existing.length && !draft.force) throw new TopicExists(existing);

  const [row] = await sql<TopicRow[]>`
    INSERT INTO wc_topics (story_id, angle, column_type, status, notes, source_snapshot)
    VALUES (${draft.storyId}, ${draft.angle ?? null}, ${draft.columnType ?? "news"}, 'pending', ${draft.notes ?? null}, ${sql.json(snapshot as never)})
    RETURNING id, story_id, angle, column_type, status, notes, source_snapshot, style_preset_id, writing, created_at, updated_at`;
  await audit(actor, "topic.create", `topic:${row!.id}`, draft.angle ?? null, null, { storyId: draft.storyId, columnType: row!.column_type }, { db: sql });
  return await topicView({ ...row!, public_id: null, event_title: snapshot.title, verification_status: null, heat: null, editorial_score: null, latest_at: null });
}

/** The topic's own row, locked for an edit. The joined view is read separately. */
async function lockTopic(tx: Db, id: number): Promise<TopicRow | null> {
  const [row] = await tx<TopicRow[]>`
    SELECT t.id, t.story_id, t.angle, t.column_type, t.status, t.notes, t.source_snapshot, t.style_preset_id, t.writing,
           t.created_at, t.updated_at, NULL::text AS public_id, NULL::text AS event_title,
           NULL::text AS verification_status, NULL::numeric AS heat, NULL::numeric AS editorial_score,
           NULL::timestamptz AS latest_at
    FROM wc_topics t
    WHERE t.id = ${id}
    FOR UPDATE OF t`;
  return row ?? null;
}

/** Edits a topic. The status may only move along the pipeline. */
export async function updateTopic(id: number, input: unknown, actor: string): Promise<StudioTopic | null> {
  const patch = UpdateSchema.parse(input);
  return sql.begin(async (tx) => {
    const locked = await lockTopic(tx, id);
    if (!locked) return null;
    const [before] = await tx<TopicRow[]>`${SELECT_TOPIC} WHERE t.id = ${id}`;
    if (!before) return null;
    if (patch.status && patch.status !== before.status && !TRANSITIONS[before.status].includes(patch.status)) {
      throw new TopicRejected(`${TOPIC_STATUS_LABELS[before.status]}不能直接变成${TOPIC_STATUS_LABELS[patch.status]}`);
    }
    const [after] = await tx<TopicRow[]>`
      UPDATE wc_topics SET
        angle = ${patch.angle === undefined ? locked.angle : patch.angle},
        column_type = ${patch.columnType ?? locked.column_type},
        notes = ${patch.notes === undefined ? locked.notes : patch.notes},
        status = ${patch.status ?? locked.status},
        writing = CASE WHEN ${patch.outline === undefined} THEN writing
                       ELSE coalesce(writing, '{}'::jsonb) || ${sql.json({ outline: patch.outline } as never)} END,
        updated_at = now()
      WHERE id = ${id}
      RETURNING id, story_id, angle, column_type, status, notes, source_snapshot, style_preset_id, writing, created_at, updated_at`;
    await audit(actor, "topic.update", `topic:${id}`, patch.status && patch.status !== before.status ? `状态 ${TOPIC_STATUS_LABELS[before.status]} → ${TOPIC_STATUS_LABELS[patch.status]}` : null, before, after, { db: tx });
    return await topicView({
      ...after!,
      public_id: before.public_id,
      event_title: before.event_title,
      verification_status: before.verification_status,
      heat: before.heat,
      editorial_score: before.editorial_score,
      latest_at: before.latest_at,
    });
  });
}

/** Takes the event's evidence again. Only an explicit refresh changes a topic's snapshot. */
export async function refreshTopicSnapshot(id: number, actor: string): Promise<StudioTopic | null> {
  return sql.begin(async (tx) => {
    const locked = await lockTopic(tx, id);
    if (!locked) return null;
    const [before] = await tx<TopicRow[]>`${SELECT_TOPIC} WHERE t.id = ${id}`;
    if (!before) return null;
    const snapshot = await buildSnapshot(before.story_id);
    if (!snapshot) throw new TopicRejected("事件不存在");
    const [after] = await tx<TopicRow[]>`
      UPDATE wc_topics SET source_snapshot = ${sql.json(snapshot as never)}, updated_at = now()
      WHERE id = ${id}
      RETURNING id, story_id, angle, column_type, status, notes, source_snapshot, style_preset_id, writing, created_at, updated_at`;
    await audit(actor, "topic.snapshot", `topic:${id}`, "刷新来源快照", before.source_snapshot, snapshot, { db: tx });
    return await topicView({
      ...after!,
      public_id: before.public_id,
      event_title: before.event_title,
      verification_status: before.verification_status,
      heat: before.heat,
      editorial_score: before.editorial_score,
      latest_at: before.latest_at,
    });
  });
}
