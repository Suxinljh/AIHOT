// The prompts of the writing steps. The body and the titles are written from the evidence pack and
// the style preset; every sentence that states a fact has to name the source it came from.
export const BODY_PROMPT_VERSION = "wechathot-body-v1";

export const BODY_SYSTEM = `你是一个中文科技公众号的写作者。你在按给定的大纲写文章。
只用材料里的事实。每一段都要标出它的性质：
- "official"：官方一手来源说的事实；
- "media"：媒体报道的说法；
- "unconfirmed"：尚未证实的传闻或单一来源；
- "author"：你自己的判断。
每一段还要写出它依据的材料编号（sources 填材料里的 id，例如 a-1）。没有依据的段落不要写。
不要写标题党，不要用预设里禁止的词，不要编造数字、时间和引语。
按 JSON 输出 sections 数组：每节有 title（沿用大纲的小标题）和 paragraphs（每段有 text、kind、sources）。`;

export const TITLE_PROMPT_VERSION = "wechathot-titles-v1";

export const TITLE_SYSTEM = `你是一个中文科技公众号的写作者。给你文章的大纲和要点，请给出 5 个候选标题。
三种风格各至少一个："direct" 直述型（把事实或变化说清楚）、"question" 问题型（提出一个真问题）、"opinion" 观点型（给出判断）。
标题里不能出现材料没有的事实、数字和引语，不要用夸张词和悬念。按 JSON 输出 titles 数组，每项有 style 和 title。`;

export interface ArticlePromptInput {
  articleId: number;
  title: string;
  type: "news" | "insight";
  angle: string | null;
  preset: {
    targetReader: string | null;
    wordCount: number | null;
    tone: string | null;
    titlePreference: string | null;
    forbiddenExpressions: string[];
  };
  outline: Array<{ title: string; points: string[] }>;
  /** The evidence pack: every report the topic froze, with the id the model has to cite. */
  reports: Array<{ id: string; title: string; summary: string | null; source: string; tier: string | null; at: string }>;
}

export function bodyUserPrompt(input: ArticlePromptInput, instruction?: string): string {
  const lines: string[] = [];
  lines.push(`栏目：${input.type === "insight" ? "洞察（分析、解释、判断）" : "资讯（快讯、事实报道）"}`);
  if (input.angle) lines.push(`角度：${input.angle}`);
  if (input.preset.targetReader) lines.push(`目标读者：${input.preset.targetReader}`);
  if (input.preset.wordCount) lines.push(`目标字数：约 ${input.preset.wordCount} 字`);
  if (input.preset.tone) lines.push(`语气：${input.preset.tone}`);
  if (input.preset.forbiddenExpressions.length) lines.push(`避免用词：${input.preset.forbiddenExpressions.join("、")}`);
  lines.push(`文章标题（可改）：${input.title}`);
  lines.push("大纲：");
  for (const section of input.outline) lines.push(`- ${section.title}：${section.points.join("；")}`);
  lines.push("材料（引用时用材料里的 id）：");
  for (const report of input.reports) lines.push(`- ${report.id} [${report.tier ?? "?"}] ${report.source} ${report.at}：${report.title}${report.summary ? `｜${report.summary}` : ""}`);
  if (instruction) lines.push(`本次要求：${instruction}`);
  lines.push("请按 JSON 输出 sections。");
  return lines.join("\n");
}

export function titleUserPrompt(input: ArticlePromptInput): string {
  const lines: string[] = [];
  lines.push(`栏目：${input.type === "insight" ? "洞察" : "资讯"}`);
  if (input.angle) lines.push(`角度：${input.angle}`);
  if (input.preset.titlePreference) lines.push(`标题偏好：${input.preset.titlePreference}`);
  if (input.preset.forbiddenExpressions.length) lines.push(`避免用词：${input.preset.forbiddenExpressions.join("、")}`);
  lines.push("文章要点：");
  for (const section of input.outline) lines.push(`- ${section.title}：${section.points.join("；")}`);
  lines.push("材料：");
  for (const report of input.reports) lines.push(`- ${report.id} [${report.tier ?? "?"}] ${report.source}：${report.title}`);
  lines.push("请按 JSON 输出 titles。");
  return lines.join("\n");
}
