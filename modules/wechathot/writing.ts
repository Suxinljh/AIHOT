// The writing steps: candidate angles and the outline. Both are model calls, so both run in the
// module's own queue: the editor's click returns at once, the worker does the paid call, and a
// failure leaves the earlier step's result untouched.
import { z } from "zod";
import { defineQueue, type ModuleQueue } from "@aihot/backend/modules";
import { enqueueOn } from "@aihot/backend/jobs/queue";
import { sql } from "@aihot/backend/db";
import { modelFor } from "@aihot/backend/editorial/models";
import { chatJson } from "@aihot/backend/providers/llm";
import {
  ANGLE_PROMPT_VERSION,
  ANGLE_SYSTEM,
  OUTLINE_PROMPT_VERSION,
  OUTLINE_SYSTEM,
  angleUserPrompt,
  outlineUserPrompt,
  type WritingPromptInput,
} from "./prompts.ts";
import { resolvePreset } from "./presets.ts";
import { writeBody, writeTitles, type ArticleSection, type ArticleTitle } from "./articles.ts";
import type { ArticlePromptInput } from "./prompts-body.ts";
import type { TopicAngle, TopicOutline, TopicOutlineSection, TopicSnapshot, TopicWriting } from "./studio-types.ts";

export type { TopicAngle, TopicOutline, TopicOutlineSection, TopicWriting };

export type WriteStep = "angles" | "outline" | "body" | "titles" | "bodySection";

export interface WriteJob {
  step: WriteStep;
  topicId?: number;
  articleId?: number;
  /** Which section a body rewrite touches; the other sections stay as they are. */
  sectionIndex?: number;
  /** "扩写"、"精简" or a tone change, for a rewrite of one section. */
  instruction?: string;
}

const AngleSchema = z.object({
  angles: z.array(z.object({
    title: z.string().trim().min(1).max(200),
    reason: z.string().trim().min(1).max(400),
  })).min(2).max(6),
});

const OutlineSchema = z.object({
  sections: z.array(z.object({
    title: z.string().trim().min(1).max(200),
    points: z.array(z.string().trim().min(1).max(300)).min(1).max(8),
  })).min(1).max(10),
  note: z.string().trim().max(400).default(""),
});

interface TopicRow {
  id: number;
  story_id: number;
  angle: string | null;
  column_type: "news" | "insight";
  notes: string | null;
  source_snapshot: TopicSnapshot | null;
  style_preset_id: string | null;
  writing: TopicWriting | null;
}

/** The material a writing step reads: the topic's frozen evidence and the style preset. */
async function writingInput(topic: TopicRow): Promise<WritingPromptInput> {
  const preset = await resolvePreset(topic.column_type, topic.style_preset_id);
  const snapshot = topic.source_snapshot;
  return {
    topicId: topic.id,
    title: snapshot?.title ?? "事件",
    summary: snapshot?.summary ?? null,
    columnType: topic.column_type,
    angle: topic.angle,
    notes: topic.notes,
    preset: {
      targetReader: preset?.targetReader ?? null,
      wordCount: preset?.wordCount ?? null,
      tone: preset?.tone ?? null,
      titlePreference: preset?.titlePreference ?? null,
      forbiddenExpressions: preset?.forbiddenExpressions ?? [],
    },
    reports: (snapshot?.reports ?? []).map((report) => ({
      title: report.title,
      summary: report.summary,
      source: report.source,
      tier: report.tier,
      at: report.publishedAt,
    })),
  };
}

async function loadTopic(topicId: number): Promise<TopicRow | null> {
  const [row] = await sql<TopicRow[]>`
    SELECT id, story_id, angle, column_type, notes, source_snapshot, style_preset_id, writing
    FROM wc_topics WHERE id = ${topicId}`;
  return row ?? null;
}

async function writeState(topicId: number, state: NonNullable<TopicWriting["state"]>, extra: Partial<TopicWriting> = {}): Promise<void> {
  await sql`
    UPDATE wc_topics SET writing = coalesce(writing, '{}'::jsonb) || ${sql.json({ ...extra, state } as never)}, updated_at = now()
    WHERE id = ${topicId}`;
}

/** The model calls a writing step makes; replaceable in tests. */
export interface WriteDeps {
  angles?: (input: WritingPromptInput) => Promise<TopicAngle[]>;
  outline?: (input: WritingPromptInput) => Promise<TopicOutline>;
  body?: (input: ArticlePromptInput, instruction?: string) => Promise<{ sections: ArticleSection[] }>;
  titles?: (input: ArticlePromptInput) => Promise<{ titles: ArticleTitle[] }>;
}

async function modelAngles(input: WritingPromptInput): Promise<TopicAngle[]> {
  const model = await modelFor("angleIdeas");
  const result = await chatJson({
    model,
    purpose: "topic_angles",
    subject: `topic:${input.topicId}:angles`,
    promptVersion: ANGLE_PROMPT_VERSION,
    system: ANGLE_SYSTEM,
    user: angleUserPrompt(input),
    schema: AngleSchema,
    temperature: 0.4,
    maxTokens: 1200,
  });
  return result.data.angles;
}

async function modelOutline(input: WritingPromptInput): Promise<TopicOutline> {
  const model = await modelFor("outline");
  const result = await chatJson({
    model,
    purpose: "topic_outline",
    subject: `topic:${input.topicId}:outline`,
    promptVersion: OUTLINE_PROMPT_VERSION,
    system: OUTLINE_SYSTEM,
    user: outlineUserPrompt(input),
    schema: OutlineSchema,
    temperature: 0.3,
    maxTokens: 1500,
  });
  return { sections: result.data.sections, note: result.data.note };
}

/** One writing step. The model call is the only paid step; a retry with the same input is free. */
export async function runWriteStep(job: WriteJob, deps: WriteDeps = {}): Promise<{ step: WriteStep; ok: boolean; error?: string }> {
  if (job.step === "body" || job.step === "bodySection" || job.step === "titles") {
    if (!job.articleId) return { step: job.step, ok: false, error: "缺少稿件" };
    return runArticleStep(job, deps);
  }
  const topicId = job.topicId;
  if (!topicId) return { step: job.step, ok: false, error: "缺少选题" };
  const topic = await loadTopic(topicId);
  if (!topic) return { step: job.step, ok: false, error: "选题不存在" };
  const input = await writingInput(topic);
  try {
    if (job.step === "angles") {
      const angles = await (deps.angles ?? modelAngles)(input);
      await writeState(topicId, { step: "angles", status: "done", jobId: null, error: null, at: new Date().toISOString() }, { angles });
      return { step: "angles", ok: true };
    }
    if (!input.angle) {
      await writeState(topicId, { step: "outline", status: "failed", jobId: null, error: "先选定一个角度", at: new Date().toISOString() });
      return { step: "outline", ok: false, error: "先选定一个角度" };
    }
    const outline = await (deps.outline ?? modelOutline)(input);
    await writeState(topicId, { step: "outline", status: "done", jobId: null, error: null, at: new Date().toISOString() }, { outline });
    return { step: "outline", ok: true };
  } catch (error) {
    const message = String((error as Error).message).slice(0, 300);
    await writeState(topicId, { step: job.step, status: "failed", jobId: null, error: message, at: new Date().toISOString() });
    throw error;
  }
}

/** The module's own queue: one writing step at a time, retried a couple of times. */
export const writeQueue: ModuleQueue<WriteJob> = defineQueue<WriteJob>({
  name: "wechathot.write",
  options: { policy: "short", retryLimit: 2, retryDelay: 30, retryBackoff: true, expireInSeconds: 900 },
  worker: { batchSize: 1 },
  run: async (jobs) => {
    const results: Array<{ step: WriteStep; ok: boolean; error?: string }> = [];
    for (const job of jobs) {
      try {
        results.push(await runWriteStep(job));
      } catch (error) {
        results.push({ step: job.step, ok: false, error: String((error as Error).message).slice(0, 200) });
        throw error;
      }
    }
    return results;
  },
});

/** The article steps: the body of a draft and its title candidates. */
async function runArticleStep(job: WriteJob, deps: WriteDeps): Promise<{ step: WriteStep; ok: boolean; error?: string }> {
  const articleId = job.articleId!;
  try {
    if (job.step === "titles") {
      const titles = await writeTitles(articleId, { titles: deps.titles });
      await sql`
        UPDATE wc_articles SET writing_state = ${sql.json({ step: "titles", status: "done", error: null, at: new Date().toISOString() } as never)}
        WHERE id = ${articleId}`;
      return { step: "titles", ok: true, ...(titles ? {} : {}) };
    }
    const result = await writeBody(articleId, {
      ...(job.sectionIndex === undefined ? {} : { sectionIndex: job.sectionIndex }),
      ...(job.instruction ? { instruction: job.instruction } : {}),
    }, { body: deps.body });
    await sql`
      UPDATE wc_articles SET writing_state = ${sql.json({ step: "body", status: "done", error: null, at: new Date().toISOString() } as never)}
      WHERE id = ${articleId}`;
    return { step: job.step, ok: true, ...(result.dropped.length ? {} : {}) };
  } catch (error) {
    const message = String((error as Error).message).slice(0, 300);
    await sql`
      UPDATE wc_articles SET writing_state = ${sql.json({ step: job.step, status: "failed", error: message, at: new Date().toISOString() } as never)}
      WHERE id = ${articleId}`;
    throw error;
  }
}

/** Puts a step in the queue. The editor's click returns at once; the worker does the paid call. */
export async function queueWriteStep(topicId: number, step: WriteStep): Promise<string | null> {
  const at = new Date().toISOString();
  await writeState(topicId, { step, status: "pending", jobId: null, error: null, at });
  const jobId = await enqueueOn(writeQueue, { topicId, step });
  if (jobId) await writeState(topicId, { step, status: "pending", jobId, error: null, at });
  return jobId;
}

/** The same, for a draft's own steps. */
export async function queueArticleStep(job: Omit<WriteJob, "step"> & { step: WriteStep }): Promise<string | null> {
  const at = new Date().toISOString();
  if (job.articleId) {
    await sql`
      UPDATE wc_articles SET writing_state = ${sql.json({ step: job.step, status: "pending", error: null, at } as never)}
      WHERE id = ${job.articleId}`;
  }
  const jobId = await enqueueOn(writeQueue, job);
  if (jobId && job.articleId) {
    await sql`
      UPDATE wc_articles SET writing_state = ${sql.json({ step: job.step, status: "pending", jobId, error: null, at } as never)}
      WHERE id = ${job.articleId}`;
  }
  return jobId;
}
