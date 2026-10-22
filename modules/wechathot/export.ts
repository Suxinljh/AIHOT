// The draft as text and Markdown. Both follow the body's own structure (heading levels, lists, quotes,
// links and images) and never touch the editor's document; the optional source list is appended last.
import type { ArticleDoc } from "./articles.ts";

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
