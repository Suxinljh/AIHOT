// The 公众号 source editor's parser: supported tags become the editor's document, unsupported markup
// is dropped, and links only keep http(s)/mailto addresses.
import assert from "node:assert/strict";
import { test } from "node:test";
import { htmlToDoc } from "../html-import.ts";
import { renderWechatHtml } from "../wechat-html.ts";

type Node = { type: string; attrs?: Record<string, any>; content?: Node[]; text?: string; marks?: Array<{ type: string; attrs?: Record<string, any> }> };

const html = `
  <h2>一级标题</h2>
  <p>普通 <strong>加粗</strong> <em>斜体</em> <s>删除</s> <code>inline</code>
     <a href="https://example.com/a">链接</a><br>换行</p>
  <ul><li>项目一</li><li>项目二</li></ul>
  <ol start="3"><li>第三项</li></ol>
  <blockquote><p>引用</p></blockquote>
  <pre><code>const x = 1;</code></pre>
  <img src="https://example.com/a.png" alt="图">
  <hr>
`;

test("the source parser keeps the structure the editor understands", () => {
  const nodes = htmlToDoc(html).content as unknown as Node[];
  assert.deepEqual(nodes.map((node) => node.type), [
    "heading", "paragraph", "bulletList", "orderedList", "blockquote", "codeBlock", "image", "horizontalRule",
  ]);

  const paragraph = nodes[1]!;
  assert.equal(paragraph.content?.some((node) => node.marks?.some((mark) => mark.type === "bold")), true);
  assert.equal(paragraph.content?.some((node) => node.marks?.some((mark) => mark.type === "italic")), true);
  assert.equal(paragraph.content?.some((node) => node.marks?.some((mark) => mark.type === "link" && mark.attrs?.href === "https://example.com/a")), true);
  assert.equal(paragraph.content?.some((node) => node.type === "hardBreak"), true);

  assert.equal(nodes[3]!.attrs?.start, 3);
  assert.equal(nodes[5]!.content?.[0]?.text, "const x = 1;");
  assert.equal(nodes[6]!.attrs?.src, "https://example.com/a.png");
});

test("unsupported tags and unsafe links are dropped without losing the text", () => {
  const nodes = htmlToDoc(`<div><script>alert(1)</script><p onclick="x()">保留 <a href="javascript:alert(1)">文字</a></p></div>`).content as unknown as Node[];
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0]!.type, "paragraph");
  const text = nodes[0]!.content!.map((node) => node.text).join("");
  assert.match(text, /保留 文字/);
  assert.equal(nodes[0]!.content!.some((node) => node.marks?.some((mark) => mark.type === "link")), false);
});

test("a parsed body can be serialized again", () => {
  const out = renderWechatHtml(htmlToDoc(html), {});
  for (const text of ["一级标题", "加粗", "链接", "项目一", "引用", "const x = 1;"]) assert.ok(out.includes(text), text);
  assert.ok(out.includes("<pre"));
  assert.ok(out.includes("<strong>加粗</strong>"));
});
