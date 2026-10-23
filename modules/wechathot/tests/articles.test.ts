// The drafts: a topic becomes an article, the body is written from the evidence pack, a citation the
// pack does not have is dropped, a section can be rewritten without touching the others, and every
// change leaves a version behind.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { tag } from "../../../tests/setup.ts";
import { config } from "@aihot/backend/config";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { installModules } from "@aihot/backend/modules";
import { buildApp } from "../../../apps/api/src/app.ts";
import { wechatHotServer } from "../server.ts";
import { createArticleFromTopic, generateReview, updateReview, writeBody, writeTitles } from "../articles.ts";
import type { StudioArticle } from "../articles.ts";

const T = tag();
const CSRF = "dev";
const originalDevAdmin = config.devAdmin;
let app: Awaited<ReturnType<typeof buildApp>>;
let topicId: number;

const snapshot = {
  title: `${T} 可写事件`,
  summary: `${T} 摘要`,
  categories: ["ai-models"],
  brands: ["openai"],
  score: 70,
  capturedAt: new Date().toISOString(),
  reports: [
    { id: "a-1", title: `${T} 官方发布`, summary: "官方公布了价格", source: "OpenAI 官网", url: "https://example.org/a1", tier: "T1", publishedAt: new Date().toISOString() },
    { id: "a-2", title: `${T} 媒体解读`, summary: null, source: "科技媒体", url: "https://example.org/a2", tier: "T2", publishedAt: new Date().toISOString() },
  ],
};

before(async () => {
  installModules([wechatHotServer]);
  config.devAdmin = { displayName: "WCH-19 articles test" };
  app = await buildApp();
  const [story] = await sql<{ id: number }[]>`
    INSERT INTO stories (public_id, title, summary, first_report_at, latest_at, created_at, updated_at)
    VALUES (${randomUUID()}, ${`${T} 可写事件`}, ${`${T} 摘要`}, now(), now(), now(), now()) RETURNING id`;
  const [topic] = await sql<{ id: number }[]>`
    INSERT INTO wc_topics (story_id, angle, column_type, status, source_snapshot, writing)
    VALUES (${story!.id}, ${`从价格变化看`}, 'news', 'ready', ${sql.json(snapshot as never)}, ${sql.json({
      outline: { sections: [{ title: "价格怎么变的", points: ["新价格", "旧价格下线"] }] },
    } as never)})
    RETURNING id`;
  topicId = Number(topic!.id);
});

after(async () => {
  await app.close();
  await stopBoss();
  config.devAdmin = originalDevAdmin;
  await closeDb();
});

async function api(method: "GET" | "POST" | "PATCH", url: string, payload?: unknown) {
  return app.inject({
    method,
    url,
    ...(payload === undefined ? {} : { payload: payload as never }),
    headers: {
      ...(payload === undefined ? {} : { "content-type": "application/json" }),
      ...(method === "GET" ? {} : { "x-csrf-token": CSRF }),
    },
  });
}

test("a topic becomes a draft with its outline, angle and first version", async () => {
  const article = await createArticleFromTopic(topicId);
  assert.ok(article);
  assert.equal(article!.type, "news");
  assert.equal(article!.angle, "从价格变化看");
  assert.equal(article!.outline.length, 1);
  assert.equal(article!.outline[0]?.title, "价格怎么变的");
  assert.equal(article!.version, 1);
  assert.deepEqual(article!.review.items, [], "a new draft has an empty review checklist");
  const [version] = await sql<{ version: number; reason: string }[]>`
    SELECT version, reason FROM wc_article_versions WHERE article_id = ${article!.id}`;
  assert.equal(version?.version, 1);
});

test("the body is written from the evidence pack and unknown sources are dropped", async () => {
  const article = await createArticleFromTopic(topicId);
  const result = await writeBody(article!.id, {}, {
    body: async () => ({
      sections: [{
        title: "价格怎么变的",
        paragraphs: [
          { text: "官方把新价格定为 10 美元。", kind: "official" as const, sources: ["a-1"] },
          { text: "媒体认为这会压低对手的价格。", kind: "media" as const, sources: ["a-2"] },
          { text: "还有人说会降到 5 美元。", kind: "unconfirmed" as const, sources: ["a-9"] },
        ],
      }],
    }),
  });
  assert.deepEqual(result.dropped, ["a-9"]);
  const paragraph = result.content.content.find((node) => node.type === "paragraph" && node.content[0]?.text.includes("5 美元"));
  assert.ok(paragraph && paragraph.type === "paragraph");
  assert.deepEqual(paragraph!.attrs.kind, "unconfirmed");
  assert.deepEqual(paragraph!.attrs.sources, [], "a source the pack does not have is dropped");
  const official = result.content.content.find((node) => node.type === "paragraph" && node.content[0]?.text.includes("10 美元"));
  assert.ok(official && official.type === "paragraph");
  assert.deepEqual(official!.attrs.sources, ["a-1"]);

  const after = (await api("GET", `/api/studio/articles/${article!.id}`)).json() as StudioArticle;
  assert.equal(after.version, 2);
  assert.deepEqual(after.droppedSources, ["a-9"]);
  const versions = await sql<{ version: number; reason: string }[]>`
    SELECT version, reason FROM wc_article_versions WHERE article_id = ${article!.id} ORDER BY version`;
  assert.equal(versions.length, 2);
  assert.match(versions[1]!.reason, /生成正文/);
});

test("one section can be rewritten without touching the others", async () => {
  const article = await createArticleFromTopic(topicId);
  await writeBody(article!.id, {}, {
    body: async () => ({
      sections: [
        { title: "价格怎么变的", paragraphs: [{ text: "第一段。", kind: "official" as const, sources: ["a-1"] }] },
        { title: "对谁有影响", paragraphs: [{ text: "第二段。", kind: "author" as const, sources: [] }] },
      ],
    }),
  });
  const before = (await api("GET", `/api/studio/articles/${article!.id}`)).json() as StudioArticle;
  assert.equal(before.content.content.length, 4);

  await writeBody(article!.id, { sectionIndex: 1, instruction: "扩写这一节" }, {
    body: async () => ({
      sections: [{ title: "对谁有影响", paragraphs: [{ text: "扩写后的第二段。", kind: "author" as const, sources: [] }] }],
    }),
  });
  const after = (await api("GET", `/api/studio/articles/${article!.id}`)).json() as StudioArticle;
  const texts = after.content.content.filter((node) => node.type === "paragraph").map((node) => (node.type === "paragraph" ? node.content[0]?.text : ""));
  assert.deepEqual(texts, ["第一段。", "扩写后的第二段。"]);
  assert.equal(after.version, 3);
});

test("the title candidates are kept next to the draft", async () => {
  const article = await createArticleFromTopic(topicId);
  const titles = await writeTitles(article!.id, {
    titles: async () => ({
      titles: [
        { style: "direct" as const, title: "OpenAI 把新价格定为 10 美元" },
        { style: "question" as const, title: "这次调价会影响谁？" },
        { style: "opinion" as const, title: "降价是防守，不是进攻" },
      ],
    }),
  });
  assert.equal(titles.length, 3);
  const after = (await api("GET", `/api/studio/articles/${article!.id}`)).json() as StudioArticle;
  assert.equal(after.titleOptions.length, 3);
  assert.equal(after.titleOptions[0]?.style, "direct");
});

test("the article endpoints read, queue and edit a draft", async () => {
  const devAdmin = config.devAdmin;
  config.devAdmin = null;
  try {
    const guest = await app.inject({ method: "GET", url: "/api/studio/articles/1" });
    assert.equal(guest.statusCode, 401);
  } finally {
    config.devAdmin = devAdmin;
  }

  const created = await api("POST", `/api/studio/topics/${topicId}/article`, { mode: "step" });
  assert.equal(created.statusCode, 201, created.body);
  const article = created.json() as StudioArticle;

  const queued = await api("POST", `/api/studio/articles/${article.id}/body`, {});
  assert.equal(queued.statusCode, 202, queued.body);
  const state = (await api("GET", `/api/studio/articles/${article.id}`)).json() as StudioArticle;
  assert.equal(state.writingState?.status, "pending");

  const edited = await api("PATCH", `/api/studio/articles/${article.id}`, { title: "改过的标题", status: "review" });
  assert.equal(edited.statusCode, 200, edited.body);
  const after = edited.json() as StudioArticle;
  assert.equal(after.title, "改过的标题");
  assert.equal(after.status, "review");
  assert.equal(after.version, 2);

  // The layout choices belong to the draft and must survive a reload, not just the local form state.
  const formatted = await api("PATCH", `/api/studio/articles/${article.id}`, { format: { body: { fontSize: 18, lineHeight: 2 } } });
  assert.equal(formatted.statusCode, 200, formatted.body);
  const reloaded = await api("GET", `/api/studio/articles/${article.id}`);
  assert.deepEqual((reloaded.json() as StudioArticle).format, { body: { fontSize: 18, lineHeight: 2 } });

  // The 公众号 source mode parses the edited HTML back into the draft.
  const applied = await api("POST", `/api/studio/articles/${article.id}/html`, {
    html: `<h2>新的小标题</h2><p>新的 <strong>正文</strong></p><ul><li>要点</li></ul>`,
  });
  assert.equal(applied.statusCode, 200, applied.body);
  const editedDoc = applied.json() as StudioArticle;
  assert.equal(editedDoc.content.content[0]?.type, "heading");
  assert.equal(editedDoc.content.content[2]?.type, "bulletList");
  assert.ok(editedDoc.version > reloaded.json<StudioArticle>().version);
  const empty = await api("POST", `/api/studio/articles/${article.id}/html`, { html: "<script>x</script>" });
  assert.equal(empty.statusCode, 400);

  const missing = await api("GET", "/api/studio/articles/999999");
  assert.equal(missing.statusCode, 404);
  const noTopic = await api("POST", "/api/studio/topics/999999/article", {});
  assert.equal(noTopic.statusCode, 404);
});


test("a draft gets a review checklist that can be decided without touching the body", async () => {
  const article = await createArticleFromTopic(topicId);
  assert.ok(article);

  await writeBody(article!.id, {}, {
    body: async () => ({
      sections: [{ title: "价格怎么变的", paragraphs: [{ text: "官方把新价格定为 10 美元。", kind: "official" as const, sources: ["a-1"] }] }],
    }),
  });
  const before = await api("GET", `/api/studio/articles/${article!.id}`);
  const beforeBody = (before.json() as StudioArticle).content;
  const beforeVersion = (before.json() as StudioArticle).version;

  const reviewed = await generateReview(article!.id, {
    review: async () => ({ items: [{ id: "r1", kind: "number", text: "10 美元", detail: "确认官方报价" }] }),
  });
  assert.ok(reviewed);
  assert.equal(reviewed!.review.items.length, 1);
  assert.deepEqual(reviewed!.content, beforeBody, "generating the review never rewrites the body");
  assert.equal(reviewed!.version, beforeVersion, "the version stays put");

  // A failing model call leaves the draft and its earlier checklist intact.
  const failed = await generateReview(article!.id, { review: async () => { throw new Error("model refused"); } });
  assert.ok(failed, "a failed review still returns the article");
  assert.equal(failed!.review.items.length, 1, "the earlier checklist is kept");

  // Each item can be confirmed, modified or ignored; the decision is persisted separately.
  const decided = reviewed!.review.items.map((item) => ({ ...item, status: "confirmed" as const }));
  const patched = await updateReview(article!.id, decided);
  assert.ok(patched);
  assert.equal(patched!.review.items[0]?.status, "confirmed");

  const after = await api("GET", `/api/studio/articles/${article!.id}`);
  assert.equal((after.json() as StudioArticle).review.items[0]?.status, "confirmed");
  assert.deepEqual((after.json() as StudioArticle).content, beforeBody, "deciding never touches the body");
});
