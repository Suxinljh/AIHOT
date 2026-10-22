// The text and Markdown exports follow the body's structure and append the cited sources only when
// asked; the editor's document is never modified.
import assert from "node:assert/strict";
import { test } from "node:test";
import { markdown, plainText } from "../export.ts";
import type { ArticleDoc } from "../articles.ts";

const doc: ArticleDoc = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "价格怎么变的" }] },
    {
      type: "paragraph",
      attrs: { kind: "official", sources: ["a-1"] },
      content: [
        { type: "text", text: "官方把新价格定为 " },
        { type: "text", text: "10 美元", marks: [{ type: "bold" }] },
        { type: "text", text: "，详见" },
        { type: "text", text: "公告", marks: [{ type: "link", attrs: { href: "https://example.org/a1" } }] },
        { type: "text", text: "。" },
      ],
    },
    { type: "paragraph", attrs: { kind: "author", sources: [] }, content: [{ type: "text", text: "对对手是压力。" }] },
  ],
};

const sources = [
  { id: "a-1", title: "官方公告", source: "OpenAI 官网", url: "https://example.org/a1" },
  { id: "a-2", title: "媒体解读", source: "科技媒体", url: "https://example.org/a2" },
];

test("Markdown keeps heading levels, marks and links, and appends sources when asked", () => {
  const withSources = markdown(doc, sources);
  assert.ok(withSources.startsWith("## 价格怎么变的"));
  assert.ok(withSources.includes("**10 美元**"));
  assert.ok(withSources.includes("[公告](https://example.org/a1)"));
  assert.ok(withSources.includes("## 来源"));
  assert.ok(withSources.includes("- [官方公告](https://example.org/a1)（OpenAI 官网）"));
  assert.ok(withSources.includes("- [媒体解读](https://example.org/a2)（科技媒体）"));

  const withoutSources = markdown(doc, []);
  assert.ok(!withoutSources.includes("## 来源"));
  assert.ok(withoutSources.includes("对对手是压力。"));

  // The document itself is untouched.
  assert.equal(doc.content[1]?.type, "paragraph");
});

test("plain text keeps the words and lists sources as traceable links", () => {
  const text = plainText(doc, sources);
  assert.ok(text.includes("价格怎么变的"));
  assert.ok(text.includes("官方把新价格定为 10 美元，详见公告。"));
  assert.ok(text.includes("来源："));
  assert.ok(text.includes("- 官方公告（OpenAI 官网）https://example.org/a1"));
  assert.ok(!text.includes("##"), "plain text has no Markdown heading marks");
});

test("empty documents and nested lists export without breaking", () => {
  assert.equal(markdown({ type: "doc", content: [] }, []), "\n");
  assert.equal(plainText({ type: "doc", content: [] }, []), "");

  const nested = {
    type: "doc",
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
  const md = markdown(nested, []);
  assert.ok(md.includes("- 第一条"));
  assert.ok(md.includes("  - 子项"));
  const text = plainText(nested, []);
  assert.ok(text.includes("- 第一条"));
  assert.ok(text.includes("  - 子项"));
});

test("Markdown source mode round-trips headings, paragraphs and marks", async () => {
  const { markdownToDoc, markdownLosesEvidence } = await import("../export.ts");
  const source = "## 价格怎么变的\n\n官方把新价格定为 **10 美元**，详见[公告](https://example.org/a1)。\n\n- 第一条\n  - 子项\n\n![图](https://example.org/a.png)\n";
  const doc = markdownToDoc(source);
  const types = doc.content.map((node) => node.type);
  assert.deepEqual(types, ["heading", "paragraph", "bulletList", "image"]);
  const paragraph = doc.content[1];
  assert.ok(paragraph && paragraph.type === "paragraph");
  assert.equal(paragraph.content.map((part) => part.text).join(""), "官方把新价格定为 10 美元，详见公告。");
  assert.deepEqual(paragraph.content[1]?.marks, [{ type: "bold" }]);
  assert.deepEqual(paragraph.content[3]?.marks, [{ type: "link", attrs: { href: "https://example.org/a1" } }]);

  // The export of the parsed document keeps the same structure.
  const again = markdown(doc, []);
  assert.ok(again.includes("## 价格怎么变的"));
  assert.ok(again.includes("**10 美元**"));
  assert.ok(again.includes("![图](https://example.org/a.png)"));

  // Citations are not representable in Markdown; the UI warns before applying.
  assert.equal(markdownLosesEvidence(doc), false);
  assert.equal(markdownLosesEvidence({ type: "doc", content: [{ type: "paragraph", attrs: { kind: "official", sources: ["a-1"] }, content: [{ type: "text", text: "有出处" }] }] }), true);
});
