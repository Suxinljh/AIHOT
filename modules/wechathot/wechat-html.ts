// The draft's TipTap document as WeChat-safe HTML: only the tags the editor accepts in a 公众号 body,
// every visual rule written as an inline style, no classes, flex/grid, web fonts or scripts. The
// serializer is deliberately small: WeChat strips what it does not know, so anything else is lost anyway.
import sanitizeHtml from "sanitize-html";
import type { ArticleDoc } from "./articles.ts";
import type { ArticleFormat } from "./studio-types.ts";

type Format = {
  title?: Partial<ArticleFormat["title"]>;
  body?: Partial<ArticleFormat["body"]>;
  image?: Partial<ArticleFormat["image"]>;
};
type Loose = { type?: string; attrs?: Record<string, unknown>; content?: Loose[]; text?: string; marks?: Array<{ type: string; attrs?: Record<string, unknown> }> };

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Properties whose number is not a length (px): font-weight and line-height stay unitless. */
const UNITLESS = new Set(["font-weight", "line-height", "opacity"]);

function style(pairs: Record<string, string | number | null | undefined>): string {
  const rules = Object.entries(pairs)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key}:${typeof value === "number" && !UNITLESS.has(key) ? `${value}px` : value}`);
  return rules.length ? ` style="${rules.join(";")}"` : "";
}

function titleStyle(format: Format): string {
  const title = format.title ?? {};
  return style({
    "font-size": title.fontSize ? `${title.fontSize}px` : undefined,
    "font-weight": title.fontWeight ?? 700,
    "line-height": title.lineHeight ?? 1.35,
    "margin-bottom": title.marginBottom ? `${title.marginBottom}px` : undefined,
    color: title.color ?? "#1a1a1a",
  });
}

function bodyStyle(format: Format): string {
  const body = format.body ?? {};
  return style({
    "font-size": body.fontSize ? `${body.fontSize}px` : undefined,
    "line-height": body.lineHeight ?? 1.85,
    "letter-spacing": body.letterSpacing !== undefined ? `${body.letterSpacing}px` : undefined,
    "margin-bottom": body.paragraphSpacing !== undefined ? `${body.paragraphSpacing}px` : undefined,
    color: body.color ?? "#333333",
    "text-align": body.align ?? "justify",
  });
}

function imageStyle(format: Format): string {
  const radius = format.image?.borderRadius;
  return style({ width: "100%", "max-width": "100%", height: "auto", "border-radius": radius !== undefined ? `${radius}px` : undefined });
}

/** Inline marks inside one paragraph: bold, italic, code, strike and links, in WeChat's own tags. */
function inline(nodes: Loose[] | undefined, format: Format): string {
  return (nodes ?? []).map((node) => {
    if (node.type === "hardBreak") return "<br/>";
    if (node.type !== "text") return inline(node.content, format);
    let text = escapeHtml(node.text ?? "");
    for (const mark of node.marks ?? []) {
      if (mark.type === "bold") text = `<strong>${text}</strong>`;
      else if (mark.type === "italic") text = `<em>${text}</em>`;
      else if (mark.type === "strike") text = `<s>${text}</s>`;
      else if (mark.type === "code") text = `<code${style({ "font-size": `${(format.body?.fontSize ?? 16) - 2}px`, "background-color": "#f5f5f5", padding: "2px 4px", "border-radius": "3px" })}>${text}</code>`;
      else if (mark.type === "link" && typeof mark.attrs?.href === "string") {
        text = `<a href="${escapeHtml(mark.attrs.href)}"${style({ color: "#576b95", "text-decoration": "none" })}>${text}</a>`;
      }
    }
    return text;
  }).join("");
}

function list(nodes: Loose[] | undefined, ordered: boolean, format: Format, depth = 0): string {
  const tag = ordered ? "ol" : "ul";
  const items = (nodes ?? []).map((item) => {
    const children = item.content ?? [];
    const text = children.filter((child) => child.type === "paragraph").map((child) => inline(child.content, format)).join("");
    const nested = children.filter((child) => child.type === "bulletList" || child.type === "orderedList")
      .map((child) => list(child.content, child.type === "orderedList", format, depth + 1)).join("");
    return `<li${style({ "font-size": `${format.body?.fontSize ?? 16}px`, "line-height": format.body?.lineHeight ?? 1.85, "margin-bottom": "6px" })}>${text}${nested}</li>`;
  }).join("");
  return `<${tag}${style({ padding: "0 0 0 1.4em", margin: "0 0 16px", color: format.body?.color ?? "#333333" })}>${items}</${tag}>`;
}

function block(node: Loose, format: Format): string {
  switch (node.type) {
    case "heading": {
      const level = Number(node.attrs?.level ?? 2);
      const tag = level <= 1 || level === 2 ? "h2" : "h3";
      return `<${tag}${titleStyle(format)}>${inline(node.content, format)}</${tag}>`;
    }
    case "paragraph":
      return `<p${bodyStyle(format)}>${inline(node.content, format)}</p>`;
    case "bulletList":
      return list(node.content, false, format);
    case "orderedList":
      return list(node.content, true, format);
    case "blockquote": {
      const inner = (node.content ?? []).map((child) => block(child, format)).join("");
      return `<blockquote${style({ margin: "0 0 16px", padding: "8px 12px", "border-left": "3px solid #d9d9d9", color: "#666666" })}>${inner}</blockquote>`;
    }
    case "image": {
      const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
      if (!src) return "";
      const alt = typeof node.attrs?.alt === "string" ? escapeHtml(node.attrs.alt) : "";
      return `<img src="${escapeHtml(src)}" alt="${alt}"${imageStyle(format)}/>`;
    }
    case "horizontalRule":
      return `<hr${style({ border: "none", "border-top": "1px solid #e5e5e5", margin: "20px 0" })}/>`;
    default:
      return (node.content ?? []).map((child) => block(child, format)).join("");
  }
}

/** The whole draft as a body WeChat accepts; `format` is the article's own layout copy. */
export function toWechatHtml(doc: ArticleDoc | null | undefined, format: Format = {}): string {
  const nodes = (doc?.content ?? []) as unknown as Loose[];
  return nodes.map((node) => block(node, format)).join("\n");
}

/**
 * The last guard before the HTML reaches the clipboard: unknown tags and attributes are dropped, and a
 * wide image is capped so it cannot push the body sideways in the 公众号 editor.
 */
export function sanitizeWechatHtml(html: string): string {
  const clean = sanitizeHtml(html, {
    allowedTags: ["section", "p", "h2", "h3", "h4", "strong", "em", "s", "a", "img", "ul", "ol", "li", "blockquote", "br", "code", "pre", "hr", "span"],
    allowedAttributes: { a: ["href"], img: ["src", "alt", "style"], "*": ["style"] },
    allowedSchemes: ["http", "https", "data"],
    allowedStyles: {
      "*": {
        "font-size": [/^\d+(\.\d+)?px$/],
        "font-weight": [/^\d{3}$/, /^bold$/, /^normal$/],
        "line-height": [/^\d+(\.\d+)?$/],
        color: [/^#[0-9a-fA-F]{3,8}$/, /^rgb/],
        "background-color": [/^#[0-9a-fA-F]{3,8}$/, /^rgb/],
        "text-align": [/^(left|right|center|justify)$/],
        margin: [/^[\d.]+px( [\d.]+px){0,3}$/, /^0( [\d.]+px){0,3}$/],
        "margin-bottom": [/^\d+(\.\d+)?px$/],
        "margin-top": [/^\d+(\.\d+)?px$/],
        "letter-spacing": [/^-?\d+(\.\d+)?px$/],
        "max-width": [/^100%$/],
        width: [/^\d+(\.\d+)?(px|%)$/],
        height: [/^auto$/, /^\d+(\.\d+)?px$/],
        "border-radius": [/^\d+(\.\d+)?px$/],
        padding: [/^[\d.]+px( [\d.]+px){0,3}$/, /^0( [\d.]+px){0,3}$/],
        "border-left": [/^\d+px solid #[0-9a-fA-F]{3,8}$/],
        "border-top": [/^\d+px solid #[0-9a-fA-F]{3,8}$/],
        border: [/^none$/],
        "text-decoration": [/^none$/],
      },
    },
  });
  return clean.replace(/<img\b([^>]*?)>/g, (tag, attrs: string) => {
    if (/style="/.test(attrs)) {
      if (/max-width/.test(attrs)) return tag;
      return `<img${attrs.replace(/style="([^"]*)"/, (_m, css: string) => `style="${css};width:100%;max-width:100%;height:auto"`)}>`;
    }
    return `<img${attrs} style="width:100%;max-width:100%;height:auto">`;
  });
}

/**
 * Serialize and clean in one call: what the studio copies into the 公众号 editor. `baseUrl` turns the
 * studio's own `/api/studio/uploads/...` images into absolute addresses WeChat can fetch.
 */
export function renderWechatHtml(doc: ArticleDoc | null | undefined, format: Format = {}, baseUrl?: string): string {
  const html = sanitizeWechatHtml(toWechatHtml(doc, format));
  if (!baseUrl) return html;
  return html.replace(/src="\/api\/studio\/uploads\//g, `src="${baseUrl.replace(/\/+$/, "")}/api/studio/uploads/`);
}
