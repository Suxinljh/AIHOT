// The drafts: a topic turned into a piece of writing. The body is written section by section from
// the evidence pack, every paragraph says what kind of statement it is, and only the sources the
// model cited from the pack survive. Every change leaves a version behind.
import { z } from "zod";
import { sql } from "@aihot/backend/db";
import { modelFor } from "@aihot/backend/editorial/models";
import { chatJson } from "@aihot/backend/providers/llm";
import {
  BODY_PROMPT_VERSION,
  BODY_SYSTEM,
  TITLE_PROMPT_VERSION,
  TITLE_SYSTEM,
  bodyUserPrompt,
  titleUserPrompt,
  type ArticlePromptInput,
} from "./prompts-body.ts";
import { resolvePreset } from "./presets.ts";
import type { TopicSnapshot } from "./studio-types.ts";
import type { ExportSource } from "./export.ts";

export type ClaimKind = "official" | "media" | "unconfirmed" | "author";

export interface ArticleParagraph {
  text: string;
  kind: ClaimKind;
  /** The report ids this paragraph rests on; only ids from the evidence pack are kept. */
  sources: string[];
}

export interface ArticleSection {
  title: string;
  paragraphs: ArticleParagraph[];
}

/** Inline text inside a heading or paragraph; marks are the editor's bold/italic/link/code. */
export interface ArticleText {
  type: "text";
  text: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

/** One node of the draft: a section heading or a paragraph with its claim kind and sources. */
export type ArticleNode =
  | { type: "heading"; attrs: { level: number }; content: ArticleText[] }
  | { type: "paragraph"; content: ArticleText[]; attrs: { kind: ClaimKind; sources: string[] } };

export interface ArticleTitle {
  style: "direct" | "question" | "opinion";
  title: string;
}

/** One line of the review checklist. The status is the editor's own decision; the body is never changed by it. */
export interface ReviewItem {
  id: string;
  kind: "fact" | "number" | "date" | "source" | "exaggeration";
  text: string;
  detail?: string | null;
  status: "pending" | "confirmed" | "modified" | "ignored";
  note?: string | null;
}

export interface ArticleReview {
  items: ReviewItem[];
  generatedAt: string | null;
}

export interface ArticleDoc {
  type: "doc";
  content: ArticleNode[];
}

export interface StudioArticle {
  id: number;
  topicId: number | null;
  type: "news" | "insight";
  title: string;
  status: "draft" | "review" | "done" | "archived";
  mode: "quick" | "step";
  angle: string | null;
  outline: Array<{ title: string; points: string[] }>;
  content: ArticleDoc;
  titleOptions: ArticleTitle[];
  /** The citations the model made that the evidence pack does not have. */
  droppedSources: string[];
  stylePresetId: string | null;
  /** The formatting preset copied onto the draft: the layout choices belong to the article. */
  format: Record<string, unknown>;
  /** The review checklist and per-item decisions; never mixed into the body. */
  review: ArticleReview;
  /** The state of the last writing step: generating, done or failed with the reason. */
  writingState: { step: string; status: "pending" | "done" | "failed"; error: string | null; at: string } | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  topic: { id: number; angle: string | null; publicId: string | null } | null;
}

const KIND = ["official", "media", "unconfirmed", "author"] as const;

const BodySchema = z.object({
  sections: z.array(z.object({
    title: z.string().trim().min(1).max(200),
    paragraphs: z.array(z.object({
      text: z.string().trim().min(1).max(2000),
      kind: z.enum(KIND),
      sources: z.array(z.string().trim().max(120)).max(12).default([]),
    })).min(1).max(30),
  })).min(1).max(20),
});

const TitleSchema = z.object({
  titles: z.array(z.object({
    style: z.enum(["direct", "question", "opinion"]),
    title: z.string().trim().min(1).max(200),
  })).min(1).max(12),
});

interface ArticleRow {
  id: number;
  topic_id: number | null;
  type: "news" | "insight";
  title: string;
  status: "draft" | "review" | "done" | "archived";
  mode: "quick" | "step";
  angle: string | null;
  outline: Array<{ title: string; points: string[] }>;
  content: ArticleDoc;
  title_options: ArticleTitle[];
  style_preset_id: string | null;
  format: Record<string, unknown>;
  review: Record<string, unknown>;
  writing_state: { step: string; status: "pending" | "done" | "failed"; error: string | null; at: string } | null;
  version: number;
  created_at: Date;
  updated_at: Date;
  topic_angle: string | null;
  topic_public_id: string | null;
}

function articleView(row: ArticleRow, dropped: string[]): StudioArticle {
  return {
    id: Number(row.id),
    topicId: row.topic_id === null ? null : Number(row.topic_id),
    type: row.type,
    title: row.title,
    status: row.status,
    mode: row.mode,
    angle: row.angle,
    outline: row.outline ?? [],
    content: row.content ?? { type: "doc", content: [] },
    titleOptions: row.title_options ?? [],
    droppedSources: dropped,
    stylePresetId: row.style_preset_id,
    format: row.format ?? {},
    review: (row.review ?? { items: [], generatedAt: null }) as unknown as ArticleReview,
    writingState: row.writing_state ?? null,
    version: row.version,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    topic: row.topic_id === null ? null : { id: Number(row.topic_id), angle: row.topic_angle, publicId: row.topic_public_id },
  };
}

async function droppedSources(articleId: number): Promise<string[]> {
  const [row] = await sql<{ dropped: string[] }[]>`
    SELECT coalesce(
      (SELECT array_agg(value) FROM jsonb_array_elements_text(coalesce(review->'droppedSources', '[]'::jsonb))),
      '{}'
    ) AS dropped
    FROM wc_articles WHERE id = ${articleId}`;
  return row?.dropped ?? [];
}

export async function articleDetail(id: number): Promise<StudioArticle | null> {
  const [row] = await sql<ArticleRow[]>`
    SELECT a.id, a.topic_id, a.type, a.title, a.status, a.mode, a.angle, a.outline, a.content, a.title_options,
           a.style_preset_id, a.format, a.review, a.writing_state, a.version, a.created_at, a.updated_at, t.angle AS topic_angle,
           s.public_id::text AS topic_public_id
    FROM wc_articles a
    LEFT JOIN wc_topics t ON t.id = a.topic_id
    LEFT JOIN stories s ON s.id = t.story_id
    WHERE a.id = ${id}`;
  return row ? articleView(row, await droppedSources(id)) : null;
}

export async function articleOfTopic(topicId: number): Promise<StudioArticle | null> {
  const [row] = await sql<{ id: number }[]>`SELECT id FROM wc_articles WHERE topic_id = ${topicId} ORDER BY id DESC LIMIT 1`;
  return row ? articleDetail(Number(row.id)) : null;
}

/** The drafts list: every article, newest change first. The detail reads the body it lists. */
export async function listArticles(filters: { status?: string; q?: string } = {}): Promise<StudioArticle[]> {
  const status = filters.status && filters.status !== "all" ? filters.status : null;
  const pattern = filters.q?.trim() ? `%${filters.q.trim()}%` : null;
  const rows = await sql<{ id: number }[]>`
    SELECT id FROM wc_articles
    WHERE (${status}::text IS NULL OR status = ${status})
      AND (${pattern}::text IS NULL OR title ILIKE ${pattern})
    ORDER BY updated_at DESC, id DESC
    LIMIT 200`;
  const articles = await Promise.all(rows.map((row) => articleDetail(Number(row.id))));
  return articles.filter((article): article is StudioArticle => article !== null);
}

interface TopicMaterial {
  id: number;
  column_type: "news" | "insight";
  angle: string | null;
  notes: string | null;
  style_preset_id: string | null;
  source_snapshot: TopicSnapshot | null;
  writing: { outline?: { sections: Array<{ title: string; points: string[] }> } } | null;
}

/** The material a draft is written from: the topic's frozen evidence and its outline. */
async function topicMaterial(topicId: number): Promise<TopicMaterial | null> {
  const [row] = await sql<TopicMaterial[]>`
    SELECT id, column_type, angle, notes, style_preset_id, source_snapshot, writing
    FROM wc_topics WHERE id = ${topicId}`;
  return row ?? null;
}

async function promptInput(article: ArticleRow, topic: TopicMaterial | null): Promise<ArticlePromptInput> {
  const preset = await resolvePreset(article.type, article.style_preset_id ?? topic?.style_preset_id ?? null);
  const snapshot = topic?.source_snapshot ?? null;
  const outline = article.outline?.length ? article.outline : topic?.writing?.outline?.sections ?? [];
  return {
    articleId: article.id,
    title: article.title,
    type: article.type,
    angle: article.angle ?? topic?.angle ?? null,
    preset: {
      targetReader: preset?.targetReader ?? null,
      wordCount: preset?.wordCount ?? null,
      tone: preset?.tone ?? null,
      titlePreference: preset?.titlePreference ?? null,
      forbiddenExpressions: preset?.forbiddenExpressions ?? [],
    },
    outline,
    reports: (snapshot?.reports ?? []).map((report) => ({
      id: report.id,
      title: report.title,
      summary: report.summary,
      source: report.source,
      tier: report.tier,
      at: report.publishedAt,
    })),
  };
}

/** Creates the draft of a topic. The topic's outline and preset come along. */
export async function createArticleFromTopic(topicId: number, mode: "quick" | "step" = "step"): Promise<StudioArticle | null> {
  const topic = await topicMaterial(topicId);
  if (!topic) return null;
  const outline = topic.writing?.outline?.sections ?? [];
  // The column's formatting preset is copied onto the draft so later preset edits do not restyle it.
  const [formatPreset] = await sql<{ format: Record<string, unknown> }[]>`
    SELECT format FROM wc_style_presets
    WHERE kind = 'format' AND (column_type IS NULL OR column_type = ${topic.column_type})
    ORDER BY builtin DESC, column_type NULLS LAST LIMIT 1`;
  const [row] = await sql<ArticleRow[]>`
    INSERT INTO wc_articles (topic_id, type, title, status, mode, angle, outline, style_preset_id, format)
    VALUES (${topicId}, ${topic.column_type}, ${topic.angle ?? topic.source_snapshot?.title ?? "未命名稿件"}, 'draft',
            ${mode}, ${topic.angle}, ${sql.json(outline as never)}, ${topic.style_preset_id},
            ${sql.json((formatPreset?.format ?? {}) as never)})
    RETURNING id, topic_id, type, title, status, mode, angle, outline, content, title_options, style_preset_id,
              format, version, created_at, updated_at`;
  await sql`
    INSERT INTO wc_article_versions (article_id, version, title, content, reason)
    VALUES (${row!.id}, 1, ${row!.title}, ${sql.json(row!.content as never)}, '创建稿件')`;
  return articleDetail(Number(row!.id));
}

/** The claims the model made that the evidence pack does not have. */
function unknownSources(sections: Array<{ paragraphs: Array<{ sources: string[] }> }>, known: string[]): string[] {
  const knownIds = new Set(known);
  const unknown = new Set<string>();
  for (const section of sections) {
    for (const paragraph of section.paragraphs) {
      for (const source of paragraph.sources) {
        if (!knownIds.has(source)) unknown.add(source);
      }
    }
  }
  return [...unknown];
}

export interface BodyDeps {
  body?: (input: ArticlePromptInput, instruction?: string) => Promise<{ sections: ArticleSection[] }>;
}

export interface BodyResult {
  content: ArticleDoc;
  dropped: string[];
}

async function modelBody(input: ArticlePromptInput, instruction?: string): Promise<{ sections: ArticleSection[] }> {
  const model = await modelFor("body");
  const result = await chatJson({
    model,
    purpose: "article_body",
    subject: `article:${input.articleId}`,
    promptVersion: BODY_PROMPT_VERSION,
    system: BODY_SYSTEM,
    user: bodyUserPrompt(input, instruction),
    schema: BodySchema,
    temperature: 0.5,
    maxTokens: 4000,
  });
  return { sections: result.data.sections };
}

/** The evidence links the export appends: only reports the body actually cites, in snapshot order. */
export async function articleSources(articleId: number): Promise<ExportSource[]> {
  const article = await articleDetail(articleId);
  if (!article || article.topicId === null) return [];
  const [row] = await sql<{ snapshot: TopicSnapshot | null }[]>`
    SELECT source_snapshot AS snapshot FROM wc_topics WHERE id = ${article.topicId}`;
  const reports = row?.snapshot?.reports ?? [];
  const cited = new Set<string>();
  for (const node of article.content.content) {
    if (node.type === "paragraph") for (const id of node.attrs.sources) cited.add(id);
  }
  const wanted = cited.size ? reports.filter((report) => cited.has(report.id)) : reports;
  return wanted.map((report) => ({ id: report.id, title: report.title, source: report.source, url: report.url }));
}

/**
 * Writes the body. `sectionIndex` writes one section and leaves the others alone; without it the
 * whole article is written from the outline.
 */
export async function writeBody(articleId: number, options: { sectionIndex?: number; instruction?: string } = {}, deps: BodyDeps = {}): Promise<BodyResult> {
  const [article] = await sql<ArticleRow[]>`
    SELECT a.id, a.topic_id, a.type, a.title, a.status, a.mode, a.angle, a.outline, a.content, a.title_options,
           a.style_preset_id, a.format, a.writing_state, a.version, a.created_at, a.updated_at, NULL::text AS topic_angle, NULL::text AS topic_public_id
    FROM wc_articles a WHERE a.id = ${articleId}`;
  if (!article) throw new Error("稿件不存在");
  const topic = article.topic_id ? await topicMaterial(article.topic_id) : null;
  const input = await promptInput(article, topic);
  const known = input.reports.map((report) => report.id);
  const result = await (deps.body ?? modelBody)(input, options.instruction);
  const dropped = unknownSources(result.sections, known);

  // Only the citations the evidence pack has survive.
  const sections = result.sections.map((section) => ({
    title: section.title,
    paragraphs: section.paragraphs.map((paragraph) => ({
      text: paragraph.text,
      kind: paragraph.kind,
      sources: paragraph.sources.filter((source) => known.includes(source)),
    })),
  }));

  // The whole article is written from the outline; a rewrite of one section replaces only that
  // section's nodes and leaves the others as they are.
  const content: ArticleDoc = options.sectionIndex === undefined
    ? sectionsToDoc(sections)
    : replaceSection(article.content ?? { type: "doc", content: [] }, options.sectionIndex, sections[0]);
  const version = Number(article.version) + 1;
  await sql.begin(async (tx) => {
    await tx`
      UPDATE wc_articles SET content = ${sql.json(content as never)},
             review = coalesce(review, '{}'::jsonb) || ${sql.json({ droppedSources: dropped } as never)},
             version = ${version}, updated_at = now()
      WHERE id = ${articleId}`;
    await tx`
      INSERT INTO wc_article_versions (article_id, version, title, content, reason)
      VALUES (${articleId}, ${version}, ${article.title}, ${sql.json(content as never)}, ${options.sectionIndex === undefined ? "生成正文" : `重写第 ${options.sectionIndex + 1} 节`})`;
  });
  return { content, dropped };
}

/** The written sections as a document: a heading per section, then its paragraphs. */
export function sectionsToDoc(sections: ArticleSection[]): ArticleDoc {
  return {
    type: "doc",
    content: sections.flatMap((section) => [
      { type: "heading" as const, attrs: { level: 2 }, content: [{ type: "text" as const, text: section.title }] },
      ...section.paragraphs.map((paragraph) => ({
        type: "paragraph" as const,
        content: [{ type: "text" as const, text: paragraph.text }],
        attrs: { kind: paragraph.kind, sources: paragraph.sources },
      })),
    ]),
  };
}

/** Replaces the nodes of one section; the other sections keep their text and sources. */
export function replaceSection(doc: ArticleDoc, index: number, section: ArticleSection | undefined): ArticleDoc {
  const nodes = doc.content ?? [];
  const headings = nodes.map((node, position) => (node.type === "heading" ? position : -1)).filter((position) => position >= 0);
  const start = headings[index];
  if (start === undefined || !section) return doc;
  const end = headings[index + 1] ?? nodes.length;
  const replacement: ArticleNode[] = [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: section.title }] },
    ...section.paragraphs.map((paragraph) => ({
      type: "paragraph" as const,
      content: [{ type: "text" as const, text: paragraph.text }],
      attrs: { kind: paragraph.kind, sources: paragraph.sources },
    })),
  ];
  return { type: "doc", content: [...nodes.slice(0, start), ...replacement, ...nodes.slice(end)] };
}

export interface TitleDeps {
  titles?: (input: ArticlePromptInput) => Promise<{ titles: ArticleTitle[] }>;
}

/** The title candidates for the draft. */
export async function writeTitles(articleId: number, deps: TitleDeps = {}): Promise<ArticleTitle[]> {
  const [article] = await sql<ArticleRow[]>`
    SELECT a.id, a.topic_id, a.type, a.title, a.status, a.mode, a.angle, a.outline, a.content, a.title_options,
           a.style_preset_id, a.writing_state, a.version, a.created_at, a.updated_at, NULL::text AS topic_angle, NULL::text AS topic_public_id
    FROM wc_articles a WHERE a.id = ${articleId}`;
  if (!article) throw new Error("稿件不存在");
  const topic = article.topic_id ? await topicMaterial(article.topic_id) : null;
  const input = await promptInput(article, topic);
  const call = deps.titles ?? (async (value: ArticlePromptInput) => {
    const model = await modelFor("titles");
    const result = await chatJson({
      model,
      purpose: "article_titles",
      subject: `article:${value.articleId}`,
      promptVersion: TITLE_PROMPT_VERSION,
      system: TITLE_SYSTEM,
      user: titleUserPrompt(value),
      schema: TitleSchema,
      temperature: 0.6,
      maxTokens: 1200,
    });
    return { titles: result.data.titles };
  });
  const { titles } = await call(input);
  await sql`UPDATE wc_articles SET title_options = ${sql.json(titles as never)}, updated_at = now() WHERE id = ${articleId}`;
  return titles;
}

/** The editor's own change to the draft; it leaves a version behind like the model's work does. */
const ReviewSchema = z.object({
  items: z.array(z.object({
    id: z.string().trim().min(1).max(64),
    kind: z.enum(["fact", "number", "date", "source", "exaggeration"]),
    text: z.string().trim().min(1).max(500),
    detail: z.string().trim().max(500).nullable().optional(),
  })).max(50),
});

/** The evidence pack a review is written from: the body's claim kinds and sources. */
function bodyText(content: ArticleDoc): string {
  return content.content
    .map((node) => (node.type === "heading" ? `# ${node.content.map((p) => p.text).join("")}` : node.content.map((p) => p.text).join("")))
    .join("\n");
}

/** Generates the review checklist from the draft's body; the body itself is never changed. */
export async function generateReview(articleId: number, deps: { review?: (input: { title: string; type: string; body: string }) => Promise<{ items: Array<{ id: string; kind: ReviewItem["kind"]; text: string; detail?: string | null }> }> } = {}): Promise<StudioArticle | null> {
  const article = await articleDetail(articleId);
  if (!article) return null;
  const body = bodyText(article.content);
  if (!body.trim()) return article;
  let result: { items: Array<{ id: string; kind: ReviewItem["kind"]; text: string; detail?: string | null }> };
  try {
    result = await (deps.review ?? (async (input: { title: string; type: string; body: string }) => {
    const model = await modelFor("structure");
    const response = await chatJson<typeof ReviewSchema>({
      model,
      purpose: "article_review",
      subject: `article:${articleId}:review`,
      promptVersion: "review-v1",
      system: "你是一名事实核对编辑。列出稿件中所有需要核对的关键事实、数字、日期、来源和潜在夸大表述，每项简短，不改写正文。返回 JSON：{ items: [{ id, kind, text, detail }] }，kind 取 fact/number/date/source/exaggeration。",
      user: `标题：${input.title}\n类型：${input.type}\n\n${input.body}`,
      schema: ReviewSchema as any,
      temperature: 0.2,
      maxTokens: 2000,
    });
    return response.data;
  }))({ title: article.title, type: article.type, body });
  } catch {
    // A failed review leaves the draft and its earlier checklist untouched (AC3).
    return article;
  }
  const items: ReviewItem[] = (result as { items: Array<{ id: string; kind: ReviewItem["kind"]; text: string; detail?: string | null }> }).items.map((item, index) => ({
    id: item.id || `r${index + 1}`,
    kind: item.kind,
    text: item.text,
    detail: item.detail ?? null,
    status: "pending",
    note: null,
  }));
  const review: ArticleReview = { items, generatedAt: new Date().toISOString() };
  await sql`
    UPDATE wc_articles SET review = ${sql.json(review as never)}, updated_at = now()
    WHERE id = ${articleId}`;
  return await articleDetail(articleId);
}

/** Updates the per-item decisions; the body stays untouched. */
export async function updateReview(articleId: number, items: ReviewItem[]): Promise<StudioArticle | null> {
  const article = await articleDetail(articleId);
  if (!article) return null;
  const review: ArticleReview = { items, generatedAt: article.review.generatedAt ?? new Date().toISOString() };
  await sql`
    UPDATE wc_articles SET review = ${sql.json(review as never)}, updated_at = now()
    WHERE id = ${articleId}`;
  return await articleDetail(articleId);
}

export async function updateArticle(
  id: number,
  patch: { title?: string; content?: ArticleDoc; status?: "draft" | "review" | "done" | "archived" },
): Promise<StudioArticle | null> {
  const [before] = await sql<ArticleRow[]>`
    SELECT a.id, a.topic_id, a.type, a.title, a.status, a.mode, a.angle, a.outline, a.content, a.title_options,
           a.style_preset_id, a.writing_state, a.version, a.created_at, a.updated_at, NULL::text AS topic_angle, NULL::text AS topic_public_id
    FROM wc_articles a WHERE a.id = ${id}`;
  if (!before) return null;
  const version = Number(before.version) + 1;
  const content = patch.content ?? before.content;
  await sql.begin(async (tx) => {
    await tx`
      UPDATE wc_articles SET
        title = ${patch.title === undefined ? before.title : patch.title},
        content = ${sql.json(content as never)},
        status = ${patch.status ?? before.status},
        version = ${version}, updated_at = now()
      WHERE id = ${id}`;
    await tx`
      INSERT INTO wc_article_versions (article_id, version, title, content, reason)
      VALUES (${id}, ${version}, ${patch.title ?? before.title}, ${sql.json(content as never)}, '手动修改')`;
  });
  return articleDetail(id);
}
