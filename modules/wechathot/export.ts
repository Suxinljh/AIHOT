// The draft as text and Markdown. Both follow the body's own structure (heading levels, lists, quotes,
// links and images) and never touch the editor's document; the optional source list is appended last.
import type { ArticleDoc, ArticleText } from "./articles.ts";

type Loose = { type?: string; attrs?: Record<string, unknown>; content?: Loose[]; text?: string; marks?: Array<{ type: string; attrs?: Record<string, unknown> }> };

export interface ExportSource {
  id: string;
  title: string;
  source: string;
  url: string;
}

function inlineText(nodes: Loose[] | undefined): string {
  return (nodes ?? []).map((node) => (node.type === "hardBreak" ? "\n" : node.type === "text" ? node.text ?? "" : inlineText(node.content))).join("");
}

function inlineMarkdown(nodes: Loose[] | undefined): string {
  return (nodes ?? []).map((node) => {
    if (node.type === "hardBreak") return "  \n";
    if (node.type !== "text") return inlineMarkdown(node.content);
    let text = node.text ?? "";
    for (const mark of node.marks ?? []) {
      if (mark.type === "bold") text = `**${text}**`;
      else if (mark.type === "italic") text = `*${text}*`;
      else if (mark.type === "strike") text = `~~${text}~~`;
      else if (mark.type === "code") text = `\`${text}\``;
      else if (mark.type === "link" && typeof mark.attrs?.href === "string") text = `[${text}](${mark.attrs.href})`;
    }
    return text;
  }).join("");
}

function listText(nodes: Loose[] | undefined, depth = 0): string {
  return (nodes ?? []).map((item) => {
    const children = item.content ?? [];
    const text = children.filter((child) => child.type === "paragraph").map((child) => inlineText(child.content)).join("");
    const nested = children.filter((child) => child.type === "bulletList" || child.type === "orderedList").map((child) => listText(child.content, depth + 1)).join("");
    return `${"  ".repeat(depth)}- ${text}\n${nested}`;
  }).join("");
}

function listMarkdown(nodes: Loose[] | undefined, ordered: boolean, depth = 0): string {
  return (nodes ?? []).map((item, index) => {
    const children = item.content ?? [];
    const text = children.filter((child) => child.type === "paragraph").map((child) => inlineMarkdown(child.content)).join("");
    const nested = children.filter((child) => child.type === "bulletList" || child.type === "orderedList")
      .map((child) => listMarkdown(child.content, child.type === "orderedList", depth + 1)).join("");
    return `${"  ".repeat(depth)}${ordered ? `${index + 1}.` : "-"} ${text}\n${nested}`;
  }).join("");
}

export function plainText(doc: ArticleDoc | null | undefined, sources: ExportSource[] = []): string {
  const parts = ((doc?.content ?? []) as unknown as Loose[]).map((node) => {
    switch (node.type) {
      case "heading": return `${inlineText(node.content)}\n`;
      case "paragraph": return `${inlineText(node.content)}\n`;
      case "bulletList":
      case "orderedList": return listText(node.content);
      case "blockquote": return `> ${inlineText((node.content ?? []).flatMap((child) => child.content ?? []))}\n`;
      case "image": return `${typeof node.attrs?.alt === "string" ? node.attrs.alt : "[图片]"}\n`;
      case "horizontalRule": return "---\n";
      default: return "";
    }
  }).filter(Boolean);
  const body = parts.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!sources.length) return body;
  const tail = sources.map((source) => `- ${source.title}（${source.source}）${source.url}`).join("\n");
  return `${body}\n\n来源：\n${tail}`.trim();
}

export function markdown(doc: ArticleDoc | null | undefined, sources: ExportSource[] = []): string {
  const parts = ((doc?.content ?? []) as unknown as Loose[]).map((node) => {
    switch (node.type) {
      case "heading": {
        const level = Math.min(Math.max(Number(node.attrs?.level ?? 2), 1), 6);
        return `${"#".repeat(level)} ${inlineMarkdown(node.content)}`;
      }
      case "paragraph": return inlineMarkdown(node.content);
      case "bulletList": return listMarkdown(node.content, false).trimEnd();
      case "orderedList": return listMarkdown(node.content, true).trimEnd();
      case "blockquote": return `> ${inlineMarkdown((node.content ?? []).flatMap((child) => child.content ?? []))}`;
      case "image": {
        const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
        return src ? `![${typeof node.attrs?.alt === "string" ? node.attrs.alt : ""}](${src})` : "";
      }
      case "horizontalRule": return "---";
      default: return "";
    }
  }).filter(Boolean);
  const body = parts.join("\n\n").trim();
  if (!sources.length) return `${body}\n`;
  const tail = sources.map((source) => `- [${source.title}](${source.url})（${source.source}）`).join("\n");
  return `${body}\n\n## 来源\n\n${tail}\n`;
}

// ---------------------------------------------------------------------------------------------
// Markdown → document. The source mode only promises the subset the exporter writes: headings,
// paragraphs, lists, quotes, images, bold/italic/strike/code and links. Claim kinds and the
// paragraph→report links are not representable in Markdown, so switching back marks them as the
// author's own text; the UI warns about that before applying.

type MarkdownNode = { type: "paragraph"; content: ArticleText[]; attrs: { kind: "author"; sources: string[] } }
  | { type: "heading"; attrs: { level: number }; content: ArticleText[] };

function parseInline(text: string): ArticleText[] {
  const out: ArticleText[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) out.push({ type: "text", text: text.slice(last, index) });
    const token = match[0];
    if (token.startsWith("**")) out.push({ type: "text", text: token.slice(2, -2), marks: [{ type: "bold" }] });
    else if (token.startsWith("~~")) out.push({ type: "text", text: token.slice(2, -2), marks: [{ type: "strike" }] });
    else if (token.startsWith("`")) out.push({ type: "text", text: token.slice(1, -1), marks: [{ type: "code" }] });
    else if (token.startsWith("*")) out.push({ type: "text", text: token.slice(1, -1), marks: [{ type: "italic" }] });
    else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (link) out.push({ type: "text", text: link[1]!, marks: [{ type: "link", attrs: { href: link[2]! } }] });
      else out.push({ type: "text", text: token });
    }
    last = index + token.length;
  }
  if (last < text.length) out.push({ type: "text", text: text.slice(last) });
  return out.length ? out : [{ type: "text", text: "" }];
}

/** Parses the Markdown this module writes back into the editor's document. */
export function markdownToDoc(markdownText: string): ArticleDoc {
  const lines = markdownText.replace(/\r\n/g, "\n").split("\n");
  const content: Array<Record<string, unknown>> = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: Array<{ text: string; children: unknown[] }> } | null = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const text = paragraph.join(" ").trim();
    if (text) content.push({ type: "paragraph", attrs: { kind: "author", sources: [] }, content: parseInline(text) });
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    content.push({
      type: list.ordered ? "orderedList" : "bulletList",
      content: list.items.map((item) => ({ type: "listItem", content: [{ type: "paragraph", content: parseInline(item.text) }, ...item.children] })),
    });
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = /^(#{2,4})\s+(.*)$/.exec(line);
    const bullet = /^(\s*)[-*]\s+(.*)$/.exec(line);
    const ordered = /^(\s*)\d+\.\s+(.*)$/.exec(line);
    const image = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(line.trim());
    if (heading) {
      flushParagraph(); flushList();
      content.push({ type: "heading", attrs: { level: heading[1]!.length }, content: parseInline(heading[2]!) });
    } else if (image) {
      flushParagraph(); flushList();
      content.push({ type: "image", attrs: { src: image[2]!, alt: image[1]! } });
    } else if (!line.trim()) {
      flushParagraph(); flushList();
    } else if (/^---+\s*$/.test(line)) {
      flushParagraph(); flushList();
      content.push({ type: "horizontalRule" });
    } else if (line.startsWith(">")) {
      flushParagraph(); flushList();
      content.push({ type: "blockquote", content: [{ type: "paragraph", content: parseInline(line.replace(/^>\s?/, "")) }] });
    } else if (bullet || ordered) {
      flushParagraph();
      const orderedFlag = !bullet;
      const depth = Math.floor(((bullet ?? ordered)![1]!.length) / 2);
      if (!list || list.ordered !== orderedFlag) { flushList(); list = { ordered: orderedFlag, items: [] }; }
      const text = (bullet ?? ordered)![2]!;
      if (depth === 0 || !list.items.length) list.items.push({ text, children: [] });
      else {
        const parent = list.items[list.items.length - 1]!;
        parent.children.push({
          type: orderedFlag ? "orderedList" : "bulletList",
          content: [{ type: "listItem", content: [{ type: "paragraph", content: parseInline(text) }] }],
        });
      }
    } else {
      flushList();
      paragraph.push(line.trim());
    }
  }
  flushParagraph(); flushList();
  return { type: "doc", content: content as unknown as ArticleDoc["content"] };
}

/** Paragraph claim kinds and report citations are not expressible in Markdown. */
export function markdownLosesEvidence(doc: ArticleDoc | null | undefined): boolean {
  return ((doc?.content ?? []) as unknown as Loose[]).some((node) => node.type === "paragraph" && Array.isArray(node.attrs?.sources) && node.attrs!.sources.length > 0);
}
