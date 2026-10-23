// The 公众号 body: only whitelisted tags, every rule inline, and the cleanup pass that drops scripts,
// event handlers and disallowed styles before anything reaches the clipboard.
import assert from "node:assert/strict";
import { test } from "node:test";
import { renderWechatHtml, sanitizeWechatHtml, toWechatHtml } from "../wechat-html.ts";
import type { ArticleDoc } from "../articles.ts";

const format = {
  title: { fontSize: 22, fontWeight: 700, lineHeight: 1.35, marginBottom: 18, color: "#1a1a1a" },
  body: { fontSize: 16, lineHeight: 1.85, color: "#333333", letterSpacing: 0.5, paragraphSpacing: 16, align: "justify" as const },
  image: { borderRadius: 4 },
};

const doc = {
  type: "doc" as const,
  content: [
    { type: "heading" as const, attrs: { level: 2 }, content: [{ type: "text" as const, text: "价格怎么变的" }] },
    {
      type: "paragraph" as const,
      attrs: { kind: "official" as const, sources: ["a-1"] },
      content: [
        { type: "text" as const, text: "官方把新价格定为 " },
        { type: "text" as const, text: "10 美元", marks: [{ type: "bold" }] },
        { type: "text" as const, text: "。" },
      ],
    },
  ],
};

test("the serializer writes whitelisted tags with inline styles", () => {
  const html = toWechatHtml(doc, format);
  assert.match(html, /<h2 style="font-size:22px;font-weight:700;line-height:1.35;margin-bottom:18px;color:#1a1a1a">价格怎么变的<\/h2>/);
  assert.match(html, /<p style="font-size:16px;line-height:1.85;letter-spacing:0.5px;margin-bottom:16px;color:#333333;text-align:justify">/);
  assert.ok(html.includes("<strong>10 美元</strong>"));
  assert.ok(!html.includes("class="), "no classes reach WeChat");
  assert.ok(!html.includes("flex"), "no layout systems reach WeChat");
});

test("a font family survives serialization and cleanup", () => {
  const fontFormat = {
    ...format,
    title: { ...format.title, fontFamily: "Optima-Regular, PingFangTC-light" },
    body: { ...format.body, fontFamily: "PingFang SC, Microsoft YaHei, sans-serif" },
  };
  const html = renderWechatHtml(doc, fontFormat);
  assert.ok(html.includes("font-family:Optima-Regular, PingFangTC-light"), "heading keeps the title font");
  assert.ok(html.includes("font-family:PingFang SC, Microsoft YaHei, sans-serif"), "paragraph keeps the body font");
  assert.ok(!sanitizeWechatHtml(`<p style="font-family:Bad;position:fixed">x</p>`).includes("position"));
});

test("the cleanup drops scripts, event handlers and unknown styles", () => {
  const hostile = `<p style="font-size:16px;position:fixed" onclick="alert(1)">正文<script>alert(2)</script></p><img src="https://example.org/a.png" onerror="alert(3)"><div class="x">丢弃</div>`;
  const clean = sanitizeWechatHtml(hostile);
  assert.ok(!clean.includes("<script"), "scripts are removed");
  assert.ok(!clean.includes("onclick"), "event handlers are removed");
  assert.ok(!clean.includes("onerror"), "image event handlers are removed");
  assert.ok(!clean.includes("position"), "unknown styles are removed");
  assert.ok(!clean.includes("class="), "classes are removed");
  assert.ok(!clean.includes("<div"), "unknown tags are removed");
  assert.match(clean, /<img[^>]*style="[^"]*max-width:100%/, "images are capped to the body width");
});

test("empty, nested-list and image inputs never produce invalid HTML", () => {
  assert.equal(toWechatHtml({ type: "doc", content: [] }, format), "");
  assert.equal(toWechatHtml(null, format), "");

  const nested = {
    type: "doc" as const,
    content: [{
      type: "bulletList",
      content: [{
        type: "listItem",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "第一条" }] },
          { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "子项" }] }] }] },
        ],
      }],
    }],
  } as unknown as ArticleDoc;
  const nestedHtml = sanitizeWechatHtml(toWechatHtml(nested, format));
  assert.match(nestedHtml, /^<ul[^>]*><li[^>]*>第一条<ul[^>]*><li[^>]*>子项<\/li><\/ul><\/li><\/ul>$/);

  const imageDoc = {
    type: "doc" as const,
    content: [{ type: "image", attrs: { src: "https://example.org/a.png", alt: "图", width: 2000 } }],
  } as unknown as ArticleDoc;
  const imageHtml = renderWechatHtml(imageDoc, format);
  assert.match(imageHtml, /<img src="https:\/\/example\.org\/a\.png" alt="图"[^>]*style="[^"]*max-width:100%;height:auto/);
  assert.ok(!imageHtml.includes("2000"), "a source width does not survive as a fixed width");
});
