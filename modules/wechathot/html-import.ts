// The reverse of wechat-html.ts: paste the studio's own 公众号 HTML back into the draft. Only the
// structure the editor understands survives (headings, paragraphs, lists, quotes, code, images and
// inline marks); inline styles, classes and scripts are dropped on purpose because TipTap cannot
// store them and 公众号 strips most of them anyway.
import { load } from "cheerio";
import type { AnyNode, Element } from "domhandler";
import type { ArticleDoc } from "./articles.ts";

type Json = Record<string, unknown>;
type Mark = { type: string; attrs?: Record<string, unknown> };

const INLINE_MARK: Record<string, string> = {
  strong: "bold",
  b: "bold",
  em: "italic",
  i: "italic",
  s: "strike",
  strike: "strike",
  del: "strike",
  code: "code",
};

function isElement(node: AnyNode): node is Element {
  return node.type === "tag" || node.type === "script" || node.type === "style";
}

function nameOf(node: AnyNode): string {
  return isElement(node) ? node.tagName.toLowerCase() : "";
}

function textOf(node: AnyNode): string {
  if (node.type === "text") return node.data;
  if (!isElement(node)) return "";
  return node.children.map(textOf).join("");
}

/** Only addresses the editor can keep: links are http(s)/mailto, images are http(s)/data. */
function safeUrl(value: string | undefined, link = false): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value, "https://wechathot.invalid");
    const allowed = link ? ["http:", "https:", "mailto:"] : ["http:", "https:", "data:"];
    return allowed.includes(url.protocol) ? value : null;
  } catch {
    return null;
  }
}

function inline(nodes: AnyNode[], marks: Mark[] = []): Json[] {
  const out: Json[] = [];
  for (const node of nodes) {
    if (node.type === "text") {
      if (!node.data) continue;
      out.push(marks.length ? { type: "text", text: node.data, marks } : { type: "text", text: node.data });
      continue;
    }
    if (!isElement(node)) continue;
    const tag = nameOf(node);
    if (tag === "script" || tag === "style" || tag === "head") continue;
    if (tag === "br") {
      out.push({ type: "hardBreak" });
      continue;
    }
    if (INLINE_MARK[tag]) {
      out.push(...inline(node.children, [...marks, { type: INLINE_MARK[tag]! }]));
      continue;
    }
    if (tag === "a") {
      const href = safeUrl(node.attribs?.href, true);
      out.push(...inline(node.children, href ? [...marks, { type: "link", attrs: { href } }] : marks));
      continue;
    }
    if (tag === "img") continue; // block images are handled by blocks()
    out.push(...inline(node.children, marks));
  }
  return out;
}

function paragraph(nodes: AnyNode[]): Json | null {
  const content = inline(nodes);
  return content.length ? { type: "paragraph", attrs: { kind: "author", sources: [] }, content } : null;
}

function list(nodes: AnyNode[], ordered: boolean, start: number): Json | null {
  const items: Json[] = [];
  for (const node of nodes) {
    if (nameOf(node) !== "li" || !isElement(node)) continue;
    const inner = blocks(node.children);
    if (!inner.length) {
      const only = paragraph(node.children);
      if (only) inner.push(only);
    }
    if (inner.length) items.push({ type: "listItem", content: inner });
  }
  if (!items.length) return null;
  return ordered
    ? { type: "orderedList", attrs: { start }, content: items }
    : { type: "bulletList", content: items };
}

function blocks(nodes: AnyNode[]): Json[] {
  const out: Json[] = [];
  for (const node of nodes) {
    if (node.type === "text") {
      if (!node.data.trim()) continue;
      const p = paragraph([node]);
      if (p) out.push(p);
      continue;
    }
    if (!isElement(node)) continue;
    const tag = nameOf(node);
    if (tag === "script" || tag === "style" || tag === "head" || tag === "title") continue;

    if (/^h[1-6]$/.test(tag)) {
      const content = inline(node.children);
      if (content.length) out.push({ type: "heading", attrs: { level: Number(tag[1]) }, content });
      continue;
    }
    if (tag === "p") {
      const p = paragraph(node.children);
      if (p) out.push(p);
      continue;
    }
    if (tag === "ul" || tag === "ol") {
      const start = Number(node.attribs?.start ?? 1);
      const result = list(node.children, tag === "ol", Number.isFinite(start) ? start : 1);
      if (result) out.push(result);
      continue;
    }
    if (tag === "blockquote") {
      const inner = blocks(node.children);
      if (inner.length) out.push({ type: "blockquote", content: inner });
      continue;
    }
    if (tag === "pre") {
      const text = textOf(node).replace(/\n$/, "");
      if (text.trim()) out.push({ type: "codeBlock", content: [{ type: "text", text }] });
      continue;
    }
    if (tag === "img") {
      const src = safeUrl(node.attribs?.src);
      if (src) out.push({ type: "image", attrs: { src, alt: node.attribs?.alt ?? "" } });
      continue;
    }
    if (tag === "hr") {
      out.push({ type: "horizontalRule" });
      continue;
    }
    if (tag === "br") continue;
    if (INLINE_MARK[tag] || tag === "a" || tag === "span" || tag === "font") {
      const p = paragraph([node]);
      if (p) out.push(p);
      continue;
    }
    // section/div/article/html/body and anything unknown: keep what is inside.
    out.push(...blocks(node.children));
  }
  return out;
}

/** Parse a 公众号 body into the editor's document. Empty or purely unsupported input yields an empty doc. */
export function htmlToDoc(html: string): ArticleDoc {
  const $ = load(html);
  const content = blocks($.root().children().toArray());
  return { type: "doc", content } as unknown as ArticleDoc;
}
