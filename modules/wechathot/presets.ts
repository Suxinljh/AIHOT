// The writing style presets: what a piece of writing should sound like. The built-in presets are
// the code's own; the editor may add more, edit any of them, and delete their own. A topic can use
// another preset for itself without changing the preset.
import { z } from "zod";
import { audit, Conflict } from "@aihot/backend/audit";
import { sql } from "@aihot/backend/db";
import type { StylePreset } from "./studio-types.ts";

/** A preset command that cannot be applied. */
export class PresetRejected extends Error {
  readonly statusCode = 400;
  readonly code = "invalid_request";
}

const SLUG = /^[a-z0-9][a-z0-9_-]{0,79}$/;

const PresetFields = z
  .object({
    name: z.string().trim().min(1, "预设名称不能为空").max(60),
    columnType: z.enum(["news", "insight"]).nullable().optional(),
    targetReader: z.string().trim().max(200).nullable().optional(),
    wordCount: z.number().int().min(100).max(20_000).nullable().optional(),
    tone: z.string().trim().max(300).nullable().optional(),
    titlePreference: z.string().trim().max(300).nullable().optional(),
    forbiddenExpressions: z.array(z.string().trim().max(60)).max(50).optional(),
    kind: z.enum(["writing", "format"]).optional(),
    format: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

const PresetSchema = PresetFields.refine((value) => Object.keys(value).length > 0, "请至少指定一项内容");

const UpdateSchema = PresetFields.partial().refine((value) => Object.keys(value).length > 0, "请至少指定一项内容");

interface PresetRow {
  id: string;
  kind: string;
  name: string;
  column_type: "news" | "insight" | null;
  target_reader: string | null;
  word_count: number | null;
  tone: string | null;
  title_preference: string | null;
  forbidden_expressions: string[];
  format: Record<string, unknown>;
  builtin: boolean;
}

function presetView(row: PresetRow): StylePreset {
  return {
    id: row.id,
    kind: row.kind as StylePreset["kind"],
    name: row.name,
    columnType: row.column_type,
    targetReader: row.target_reader,
    wordCount: row.word_count,
    tone: row.tone,
    titlePreference: row.title_preference,
    forbiddenExpressions: row.forbidden_expressions,
    format: row.format,
    builtin: row.builtin,
  };
}

export async function listStylePresets(): Promise<StylePreset[]> {
  const rows = await sql<PresetRow[]>`
    SELECT id, kind, name, column_type, target_reader, word_count, tone, title_preference,
           forbidden_expressions, format, builtin
    FROM wc_style_presets
    WHERE kind = 'writing'
    ORDER BY builtin DESC, column_type NULLS LAST, name`;
  return rows.map(presetView);
}

/** The preset a column uses: the editor's own first, then the built-in one. */
export async function resolvePreset(columnType: "news" | "insight" | null, overrideId?: string | null): Promise<StylePreset | null> {
  if (overrideId) {
    const [override] = await sql<PresetRow[]>`
      SELECT id, kind, name, column_type, target_reader, word_count, tone, title_preference,
             forbidden_expressions, format, builtin
      FROM wc_style_presets WHERE id = ${overrideId} AND kind = 'writing'`;
    if (override) return presetView(override);
  }
  if (!columnType) return null;
  const [fallback] = await sql<PresetRow[]>`
    SELECT id, kind, name, column_type, target_reader, word_count, tone, title_preference,
           forbidden_expressions, format, builtin
    FROM wc_style_presets
    WHERE kind = 'writing' AND column_type = ${columnType}
    ORDER BY builtin DESC, name
    LIMIT 1`;
  return fallback ? presetView(fallback) : null;
}

function slugify(name: string): string {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return base || "preset";
}

async function nextPresetId(base: string): Promise<string> {
  for (let suffix = 1; ; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`;
    if (SLUG.test(candidate) && !(await sql`SELECT 1 FROM wc_style_presets WHERE id = ${candidate}`).length) return candidate;
  }
}

/** A preset of the editor's own. */
export async function createStylePreset(input: unknown, actor: string): Promise<StylePreset> {
  const draft = PresetSchema.parse(input);
  const id = await nextPresetId(slugify(draft.name));
  const [row] = await sql<PresetRow[]>`
    INSERT INTO wc_style_presets (id, kind, name, column_type, target_reader, word_count, tone, title_preference, forbidden_expressions, format)
    VALUES (${id}, ${draft.kind ?? "writing"}, ${draft.name}, ${draft.columnType ?? null}, ${draft.targetReader ?? null}, ${draft.wordCount ?? null},
            ${draft.tone ?? null}, ${draft.titlePreference ?? null}, ${draft.forbiddenExpressions ?? []}::text[], ${sql.json((draft.format ?? {}) as never)})
    RETURNING id, kind, name, column_type, target_reader, word_count, tone, title_preference, forbidden_expressions, format, builtin`;
  await audit(actor, "preset.create", `preset:${id}`, null, null, draft, { db: sql });
  return presetView(row!);
}

/** Edits a preset. The built-in ones may be edited too; the seed never overwrites an edited row. */
export async function updateStylePreset(id: string, input: unknown, actor: string): Promise<StylePreset | null> {
  const patch = UpdateSchema.parse(input);
  return sql.begin(async (tx) => {
    const [before] = await tx<PresetRow[]>`
      SELECT id, kind, name, column_type, target_reader, word_count, tone, title_preference,
             forbidden_expressions, format, builtin
      FROM wc_style_presets WHERE id = ${id} FOR UPDATE`;
    if (!before) return null;
    if (patch.kind && patch.kind !== before.kind) throw new PresetRejected("预设类型不能修改");
    const format = patch.format === undefined ? before.format : patch.format;
    const [after] = await tx<PresetRow[]>`
      UPDATE wc_style_presets SET
        name = ${patch.name ?? before.name},
        column_type = ${patch.columnType === undefined ? before.column_type : patch.columnType},
        target_reader = ${patch.targetReader === undefined ? before.target_reader : patch.targetReader},
        word_count = ${patch.wordCount === undefined ? before.word_count : patch.wordCount},
        tone = ${patch.tone === undefined ? before.tone : patch.tone},
        title_preference = ${patch.titlePreference === undefined ? before.title_preference : patch.titlePreference},
        forbidden_expressions = ${patch.forbiddenExpressions === undefined ? before.forbidden_expressions : patch.forbiddenExpressions}::text[],
        format = ${sql.json(format as never)},
        updated_at = now()
      WHERE id = ${id}
      RETURNING id, kind, name, column_type, target_reader, word_count, tone, title_preference, forbidden_expressions, format, builtin`;
    await audit(actor, "preset.update", `preset:${id}`, null, before, after, { db: tx });
    return presetView(after!);
  });
}

export interface PresetDeleteResult {
  id: string;
  /** The preset the column falls back to when the deleted one was in use. */
  fallback: { id: string; name: string } | null;
}

/** Removes one of the editor's own presets. A built-in one stays. */
export async function deleteStylePreset(id: string, actor: string): Promise<PresetDeleteResult | null> {
  return sql.begin(async (tx) => {
    const [before] = await tx<PresetRow[]>`
      SELECT id, kind, name, column_type, target_reader, word_count, tone, title_preference,
             forbidden_expressions, format, builtin
      FROM wc_style_presets WHERE id = ${id} FOR UPDATE`;
    if (!before) return null;
    if (before.builtin) throw new Conflict("内置预设不能删除，可以改它的内容");
    const [fallback] = before.kind === "writing" ? await tx<{ id: string; name: string }[]>`
      SELECT id, name FROM wc_style_presets
      WHERE kind = 'writing' AND builtin AND (${before.column_type}::text IS NULL OR column_type = ${before.column_type})
      ORDER BY column_type NULLS LAST LIMIT 1` : [];
    await tx`DELETE FROM wc_style_presets WHERE id = ${id}`;
    await audit(actor, "preset.delete", `preset:${id}`, fallback ? `回退到 ${fallback.name}` : null, before, null, { db: tx });
    return { id, fallback: fallback ?? null };
  });
}

/** A topic's own preset choice: null means "follow the column". */
export async function setTopicPreset(topicId: number, presetId: string | null, actor: string): Promise<boolean> {
  if (presetId) {
    const [preset] = await sql`SELECT 1 FROM wc_style_presets WHERE id = ${presetId} AND kind = 'writing'`;
    if (!preset) throw new PresetRejected("这个风格预设不存在");
  }
  const [row] = await sql<{ id: number }[]>`
    UPDATE wc_topics SET style_preset_id = ${presetId}, updated_at = now() WHERE id = ${topicId} RETURNING id`;
  if (!row) return false;
  await audit(actor, "topic.preset", `topic:${topicId}`, presetId ?? "跟随栏目默认", null, { presetId }, { db: sql });
  return true;
}
