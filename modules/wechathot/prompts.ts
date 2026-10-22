// The prompts of the workbench's own model steps. The model answers in its own JSON shape; the
// code weighs the dimensions and writes the result.
export const SCORE_PROMPT_VERSION = "wechathot-editorial-score-v1";

export const SCORE_SYSTEM = `你是一个中文科技公众号的选题编辑。你在判断一个已经发生的行业事件值不值得写成一篇给读者的文章。
按六个维度打分，每个维度 0 到 100：
- importance：这个变化对行业和读者的重要性；
- relevance：它和账号定位的读者有多相关；
- appeal：读者会不会点开、会不会读完；
- novelty：它是不是新信息，而不是已知变化的重复；
- timeliness：现在写还来得及吗，过时了吗；
- completeness：材料是否足够支撑一篇文章。
只根据给你的标题、摘要、事实和报道判断，不要补充材料里没有的事实。分数要能分出高下，不要都给 80 分。
按 JSON 输出六个维度的分数。`;

/** The account this workbench writes for; the score is only meaningful for this audience. */
export const ACCOUNT_POSITIONING = "面向关注 AI 大模型、汽车、数码硬件、软件与互联网、具身智能、电影与剧集、游戏的科技读者，做事实优先的快讯和解读。";

export interface ScorePromptInput {
  title: string;
  summary: string | null;
  digest: string | null;
  categories: string[];
  eventType: string | null;
  heat: number | null;
  newsValue: number | null;
  facts: Array<{ title: string; reportCount: number; firstReportAt: string }>;
  reports: Array<{ title: string; summary: string | null; source: string; tier: string | null; at: string }>;
}

export function scoreUserPrompt(input: ScorePromptInput): string {
  const lines: string[] = [];
  lines.push(`账号定位：${ACCOUNT_POSITIONING}`);
  lines.push(`事件标题：${input.title}`);
  if (input.summary) lines.push(`事件摘要：${input.summary}`);
  if (input.digest) lines.push(`事件综述：${input.digest}`);
  if (input.categories.length) lines.push(`相关分类：${input.categories.join("、")}`);
  if (input.eventType) lines.push(`事件类型：${input.eventType}`);
  if (input.heat !== null) lines.push(`热度（估计）：${input.heat}`);
  if (input.newsValue !== null) lines.push(`新闻价值：${input.newsValue}`);
  if (input.facts.length) {
    lines.push("已知事实：");
    for (const fact of input.facts) lines.push(`- ${fact.title}（${fact.reportCount} 篇报道，首次 ${fact.firstReportAt}）`);
  }
  if (input.reports.length) {
    lines.push("相关报道：");
    for (const report of input.reports) {
      lines.push(`- [${report.tier ?? "?"}] ${report.source} ${report.at}：${report.title}${report.summary ? `｜${report.summary}` : ""}`);
    }
  }
  lines.push("请按 JSON 输出 importance、relevance、appeal、novelty、timeliness、completeness 六个分数。");
  return lines.join("\n");
}

export const ANGLE_PROMPT_VERSION = "wechathot-angle-ideas-v1";

export const ANGLE_SYSTEM = `你是一个中文科技公众号的选题编辑。给你一个已经发生的事件和它的报道，请给出几个可写的角度。
每个角度是一句话：站在哪个读者关心的问题上看这件事，为什么现在值得写。
角度之间要真的不同，不是同一句话的换词。不要写材料里没有的事实，不要预设结论。
按 JSON 输出 angles 数组，每项有 title（角度，一句话）和 reason（为什么这个角度值得写）。`;

export const OUTLINE_PROMPT_VERSION = "wechathot-outline-v1";

export const OUTLINE_SYSTEM = `你是一个中文科技公众号的选题编辑。已经定下了一个写作角度，请为它列出文章的大纲。
每节一个小标题和几个要点，要点是这个角度下读者会想知道的事，不要重复报道里的原话。
只用材料里的事实，不要编造数字、时间和引语。按 JSON 输出 sections 数组，每项有 title 和 points；notes 写一句整体说明（可为空）。`;

export interface WritingPromptInput {
  topicId: number;
  title: string;
  summary: string | null;
  columnType: "news" | "insight";
  angle: string | null;
  notes: string | null;
  preset: {
    targetReader: string | null;
    wordCount: number | null;
    tone: string | null;
    titlePreference: string | null;
    forbiddenExpressions: string[];
  };
  reports: Array<{ title: string; summary: string | null; source: string; tier: string | null; at: string }>;
}

function writingMaterial(input: WritingPromptInput): string[] {
  const lines: string[] = [];
  if (input.preset.targetReader) lines.push(`目标读者：${input.preset.targetReader}`);
  if (input.preset.wordCount) lines.push(`目标字数：约 ${input.preset.wordCount} 字`);
  if (input.preset.tone) lines.push(`语气：${input.preset.tone}`);
  if (input.preset.titlePreference) lines.push(`标题偏好：${input.preset.titlePreference}`);
  if (input.preset.forbiddenExpressions.length) lines.push(`避免用词：${input.preset.forbiddenExpressions.join("、")}`);
  if (input.notes) lines.push(`编辑备注：${input.notes}`);
  if (input.reports.length) {
    lines.push("材料：");
    for (const report of input.reports) {
      lines.push(`- [${report.tier ?? "?"}] ${report.source} ${report.at}：${report.title}${report.summary ? `｜${report.summary}` : ""}`);
    }
  }
  return lines;
}

export function angleUserPrompt(input: WritingPromptInput): string {
  const lines: string[] = [];
  lines.push(`账号定位：${ACCOUNT_POSITIONING}`);
  lines.push(`栏目：${input.columnType === "insight" ? "洞察（分析、解释、判断）" : "资讯（快讯、事实报道）"}`);
  lines.push(`事件标题：${input.title}`);
  if (input.summary) lines.push(`事件摘要：${input.summary}`);
  lines.push(...writingMaterial(input));
  lines.push("请按 JSON 输出 angles（2 到 6 个）。");
  return lines.join("\n");
}

export function outlineUserPrompt(input: WritingPromptInput): string {
  const lines: string[] = [];
  lines.push(`栏目：${input.columnType === "insight" ? "洞察（分析、解释、判断）" : "资讯（快讯、事实报道）"}`);
  lines.push(`已选角度：${input.angle ?? "（未选）"}`);
  lines.push(`事件标题：${input.title}`);
  if (input.summary) lines.push(`事件摘要：${input.summary}`);
  lines.push(...writingMaterial(input));
  lines.push("请按 JSON 输出 sections 和 notes。");
  return lines.join("\n");
}
