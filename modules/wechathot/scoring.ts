// The event's topic score. The model reads the event and gives the six dimensions, a value
// judgement and the reasons; the code weighs the dimensions, writes the result and keeps the
// fingerprint so the same evidence is never paid for twice.
import { createHash } from "node:crypto";
import { z } from "zod";
import { sql } from "@aihot/backend/db";
import { modelFor } from "@aihot/backend/editorial/models";
import { chatJson } from "@aihot/backend/providers/llm";
import { SCORE_PROMPT_VERSION, SCORE_SYSTEM, scoreUserPrompt, type ScorePromptInput } from "./prompts.ts";

export const SCORE_DIMENSIONS = ["importance", "relevance", "appeal", "novelty", "timeliness", "completeness"] as const;
export type ScoreDimension = (typeof SCORE_DIMENSIONS)[number];

export const SCORE_LABELS: Record<ScoreDimension, string> = {
  importance: "重要性",
  relevance: "账号相关度",
  appeal: "读者吸引力",
  novelty: "新颖性",
  timeliness: "时效性",
  completeness: "资料完整性",
};

/**
 * The weights the code applies. The model never sees them: it gives the dimensions and the
 * reasons, the code decides what the total means.
 */
export const SCORE_WEIGHTS: Record<ScoreDimension, number> = {
  importance: 0.25,
  relevance: 0.2,
  appeal: 0.2,
  novelty: 0.15,
  timeliness: 0.1,
  completeness: 0.1,
};

export const SCORE_ROUND_LIMIT = 10;

const ScoreSchema = z.object({
  importance: z.number().min(0).max(100),
  relevance: z.number().min(0).max(100),
  appeal: z.number().min(0).max(100),
  novelty: z.number().min(0).max(100),
  timeliness: z.number().min(0).max(100),
  completeness: z.number().min(0).max(100),
  verdict: z.string().trim().min(1).max(200),
  column: z.enum(["news", "insight"]),
  angles: z.array(z.string().trim().min(1).max(120)).max(5).default([]),
  missing: z.array(z.string().trim().min(1).max(120)).max(8).default([]),
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
});

export type ScoreDimensions = z.infer<typeof ScoreSchema>;

export interface ScoreOutcome {
  score: number;
  dims: Record<ScoreDimension, number>;
  reason: string;
  missing: string[];
  column: "news" | "insight";
  confidence: "high" | "medium" | "low";
  angles: string[];
  fingerprint: string;
}

/** The weighted total. The dimensions are the model's; the weights are ours. */
export function weightedScore(dims: Record<ScoreDimension, number>): number {
  const total = SCORE_DIMENSIONS.reduce((sum, key) => sum + (dims[key] ?? 0) * SCORE_WEIGHTS[key], 0);
  return Math.round(total * 10) / 10;
}

/** The evidence behind a score: new evidence or a new fact changes it, nothing else does. */
export function scoreFingerprint(input: { storyId: number; latestAt: Date | null; reportCount: number; factCount: number; summary: string | null }): string {
  return createHash("sha256")
    .update([input.storyId, input.latestAt?.toISOString() ?? "", input.reportCount, input.factCount, input.summary ?? ""].join("|"))
    .digest("hex");
}

interface CandidateRow {
  story_id: number;
  title: string;
  summary: string | null;
  digest: string | null;
  categories: string[];
  event_type: string | null;
  heat: number | string | null;
  news_value: number | string | null;
  report_count: number;
  latest_at: Date | null;
  first_report_at: Date | null;
  score_fingerprint: string | null;
  editorial_score: number | string | null;
}

interface FactRow {
  id: number;
  title: string;
  first_report_at: Date;
  report_count: number;
}

interface ReportRow {
  title: string;
  summary: string | null;
  source_name: string;
  source_tier: string | null;
  at: Date;
}

function numberOrNull(value: number | string | null): number | null {
  return value === null ? null : Number(value);
}

/** The event as the scoring prompt needs it. */
async function loadCandidate(storyId: number): Promise<{ candidate: CandidateRow; facts: FactRow[]; reports: ReportRow[] } | null> {
  const [candidate] = await sql<CandidateRow[]>`
    SELECT m.story_id, s.title, m.summary, s.digest, m.categories, m.event_type, m.heat, m.news_value,
           m.report_count, m.latest_at, m.first_report_at, m.score_fingerprint, m.editorial_score
    FROM wc_event_meta m
    JOIN stories s ON s.id = m.story_id
    WHERE m.story_id = ${storyId} AND s.merged_into IS NULL`;
  if (!candidate) return null;
  const [facts, reports] = await Promise.all([
    sql<FactRow[]>`
      SELECT f.id, f.title, min(coalesce(p.published_at, p.discovered_at)) AS first_report_at,
             count(p.article_id)::int AS report_count
      FROM facts f
      LEFT JOIN fact_articles fa ON fa.fact_id = f.id
      LEFT JOIN publications p ON p.article_id = fa.article_id
      WHERE f.story_id = ${storyId}
      GROUP BY f.id, f.title
      ORDER BY min(coalesce(p.published_at, p.discovered_at)) DESC
      LIMIT 8`,
    sql<ReportRow[]>`
      SELECT p.title, p.summary, s.name AS source_name, s.tier AS source_tier,
             coalesce(p.published_at, p.discovered_at) AS at
      FROM facts f
      JOIN fact_articles fa ON fa.fact_id = f.id
      JOIN publications p ON p.article_id = fa.article_id
      JOIN sources s ON s.id = p.source_id
      WHERE f.story_id = ${storyId}
      ORDER BY coalesce(p.published_at, p.discovered_at) DESC, p.article_id
      LIMIT 8`,
  ]);
  return { candidate, facts, reports };
}

function promptInput(candidate: CandidateRow, facts: FactRow[], reports: ReportRow[]): ScorePromptInput {
  return {
    title: candidate.title,
    summary: candidate.summary,
    digest: candidate.digest,
    categories: candidate.categories,
    eventType: candidate.event_type,
    heat: numberOrNull(candidate.heat),
    newsValue: numberOrNull(candidate.news_value),
    facts: facts.map((fact) => ({
      title: fact.title,
      reportCount: fact.report_count,
      firstReportAt: fact.first_report_at.toISOString(),
    })),
    reports: reports.map((report) => ({
      title: report.title,
      summary: report.summary,
      source: report.source_name,
      tier: report.source_tier,
      at: report.at.toISOString(),
    })),
  };
}

/** The model call, replaceable in tests. */
export type ScoreCaller = (input: ScorePromptInput) => Promise<ScoreDimensions>;

const callModel: ScoreCaller = async (input) => {
  const model = await modelFor("editorialScore");
  const result = await chatJson({
    model,
    purpose: "editorial_score_event",
    subject: `event:${input.title}`,
    promptVersion: SCORE_PROMPT_VERSION,
    system: SCORE_SYSTEM,
    user: scoreUserPrompt(input),
    schema: ScoreSchema,
    temperature: 0,
    maxTokens: 1200,
  });
  return result.data;
};

/** Scores one event; the caller has already decided the event is worth the call. */
export async function scoreEvent(
  storyId: number,
  deps: { call?: ScoreCaller } = {},
): Promise<ScoreOutcome | null> {
  const loaded = await loadCandidate(storyId);
  if (!loaded) return null;
  const { candidate, facts, reports } = loaded;
  const fingerprint = scoreFingerprint({
    storyId: candidate.story_id,
    latestAt: candidate.latest_at,
    reportCount: candidate.report_count,
    factCount: facts.length,
    summary: candidate.summary,
  });
  const data = await (deps.call ?? callModel)(promptInput(candidate, facts, reports));
  const dims = Object.fromEntries(SCORE_DIMENSIONS.map((key) => [key, data[key]])) as Record<ScoreDimension, number>;
  return {
    score: weightedScore(dims),
    dims,
    reason: data.verdict,
    missing: data.missing,
    column: data.column,
    confidence: data.confidence,
    angles: data.angles,
    fingerprint,
  };
}

export interface ScoreRunResult {
  candidates: number;
  scored: number;
  skipped: number;
  failed: number;
  errors: string[];
}

/**
 * One round of scoring: the events worth an editor's attention, newest first, without the ones
 * that were already scored on the same evidence and without the ones a person has judged.
 */
export async function scoreCandidateEvents(options: { limit?: number; call?: ScoreCaller } = {}): Promise<ScoreRunResult> {
  const limit = options.limit ?? SCORE_ROUND_LIMIT;
  const rows = await sql<CandidateRow[]>`
    SELECT m.story_id, s.title, m.summary, s.digest, m.categories, m.event_type, m.heat, m.news_value,
           m.report_count, m.latest_at, m.first_report_at, m.score_fingerprint, m.editorial_score
    FROM wc_event_meta m
    JOIN stories s ON s.id = m.story_id
    WHERE s.merged_into IS NULL
      AND (m.selected_count > 0 OR m.evidence_source_count >= 2)
      AND NOT EXISTS (
        SELECT 1 FROM wc_event_states e
        WHERE e.story_id = m.story_id AND e.manual_decision IS NOT NULL
      )
    ORDER BY m.latest_at DESC NULLS LAST, m.story_id DESC
    LIMIT ${limit * 4}`;
  const result: ScoreRunResult = { candidates: rows.length, scored: 0, skipped: 0, failed: 0, errors: [] };

  for (const row of rows) {
    if (result.scored >= limit) break;
    const loaded = await loadCandidate(row.story_id);
    if (!loaded) continue;
    const fingerprint = scoreFingerprint({
      storyId: row.story_id,
      latestAt: row.latest_at,
      reportCount: row.report_count,
      factCount: loaded.facts.length,
      summary: row.summary,
    });
    // The same evidence was already scored: no second call, no new receipt.
    if (row.score_fingerprint === fingerprint) {
      result.skipped += 1;
      continue;
    }
    try {
      const outcome = await scoreEvent(row.story_id, { call: options.call });
      if (!outcome) continue;
      await sql`
        UPDATE wc_event_meta SET
          editorial_score = ${outcome.score},
          score_dims = ${sql.json({
            ...outcome.dims,
            column: outcome.column,
            confidence: outcome.confidence,
            angles: outcome.angles,
          } as never)},
          score_reason = ${outcome.reason},
          score_missing = ${outcome.missing}::text[],
          score_fingerprint = ${outcome.fingerprint},
          scored_at = now()
        WHERE story_id = ${row.story_id}`;
      result.scored += 1;
    } catch (error) {
      // A failed or refused call leaves the event unscored; the list keeps working.
      result.failed += 1;
      if (result.errors.length < 5) result.errors.push(String((error as Error).message).slice(0, 200));
      console.error(JSON.stringify({ level: "error", msg: "wechathot editorial score failed", storyId: row.story_id, error: String((error as Error).message) }));
    }
  }
  return result;
}
