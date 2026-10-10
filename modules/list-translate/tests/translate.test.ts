// A list that asks for a translation (site/site.ts FEED_LISTS[].translate) gets a Chinese note for each
// of its posts, written by the model once and stored on the publication row the list already reads its
// lead from. Posts of a source no list asked about, and text that is already Chinese, are left alone;
// asking again about the same text reuses the finished receipt instead of paying twice.
import { stub, tag } from "../../../tests/setup.ts";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { closeDb, sql } from "@aihot/backend/db";
import { installModules } from "@aihot/backend/modules";
import { loadSourceList } from "@aihot/backend/publication/source-list";
import { FEED_LISTS } from "@aihot/site";
import { listTranslate } from "../server.ts";
import { translatePendingListNotes } from "../translate.ts";

const T = `listtranslate-${tag()}`;
const LIST = FEED_LISTS.find((list) => list.translate)!;
const OTHER = `${T}-other`;
const NOTE = "一个用 Rust 写的终端文本编辑器，支持插件与多光标。";
const id = (suffix: string) => `${T}-${suffix}`;

// The model: the same Chinese note for every project, and a hit count the tests can watch.
const provider = await stub(async () => ({
  id: "stub",
  choices: [{ message: { content: JSON.stringify({ t: NOTE }) } }],
  usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
}));
process.env.LIST_TRANSLATE_MODEL = "deepseek-flash";
process.env.DEEPSEEK_BASE_URL = `${provider.url}/v1`;
process.env.DEEPSEEK_API_KEY = "test-key";

after(async () => {
  await provider.close();
  await closeDb();
});

before(async () => {
  installModules([listTranslate]);
  await sql`INSERT INTO sources (id, name, kind, tier, participation_mode) VALUES (${LIST.sourceId}, ${T}, 'rss', 'T2', 'hot_signal')`;
  await sql`INSERT INTO sources (id, name, kind, tier) VALUES (${OTHER}, ${`${T}-other`}, 'rss', 'T2')`;
});

/** One collected post: the article the collector stored and the public row the publication layer wrote. */
async function add(suffix: string, options: { excerpt: string | null; summary?: string | null; source?: string; state?: string }) {
  const at = new Date("2026-02-01T00:00:00Z");
  const source = options.source ?? LIST.sourceId;
  await sql`INSERT INTO articles (id, source_id, identity_key, url, title, excerpt, discovered_at, timeline_at, processing_state)
    VALUES (${id(suffix)}, ${source}, ${id(suffix)}, ${`https://example.org/${id(suffix)}`}, ${id(suffix)}, ${options.excerpt}, ${at}, ${at}, ${options.state ?? "skipped"})`;
  await sql`INSERT INTO publications (article_id, title, original_title, summary, source_id, channel, tags, url, discovered_at, timeline_at, sort_at,
    selected, eligible, visibility, visible_after, search_text)
    VALUES (${id(suffix)}, ${id(suffix)}, null, ${options.summary ?? null}, ${source}, 'news', ${[]},
      ${`https://example.org/${id(suffix)}`}, ${at}, ${at}, ${at}, false, false, 'public', ${at}, '')`;
}

const summaryOf = async (suffix: string) =>
  (await sql<{ summary: string | null }[]>`SELECT summary FROM publications WHERE article_id = ${id(suffix)}`)[0]!.summary;

test("the model's note is stored on the post and the list shows it as the lead", async () => {
  await add("a", { excerpt: "A terminal text editor written in Rust with plugins and multiple cursors." });
  const run = await translatePendingListNotes();
  assert.equal(run.translated, 1);
  assert.equal(run.failed, 0);
  assert.equal(await summaryOf("a"), NOTE);
  const page = await loadSourceList(LIST.slug, 1);
  assert.equal(page?.items[0]?.excerpt, NOTE);
});

test("a post of another source, one already in Chinese, and a failed one are not asked about", async () => {
  await add("b", { excerpt: "Hand translated already.", summary: "已经有人翻好的说明。" });
  await add("c", { excerpt: "这是一个中文写的项目简介，不需要翻译。" });
  await add("d", { excerpt: "A post of a source no list asked about.", source: OTHER });
  await add("e", { excerpt: "A post that failed to process.", state: "failed" });
  const before_ = provider.hits();
  const run = await translatePendingListNotes();
  assert.equal(run.translated, 0);
  assert.equal(provider.hits(), before_);
  assert.equal(await summaryOf("b"), "已经有人翻好的说明。");
  assert.equal(await summaryOf("c"), null);
  assert.equal(await summaryOf("d"), null);
  assert.equal(await summaryOf("e"), null);
});

test("the same text asked again reuses the finished receipt instead of paying twice", async () => {
  await add("f", { excerpt: "A small HTTP router for Node." });
  const first = provider.hits();
  assert.equal((await translatePendingListNotes()).translated, 1);
  assert.equal(provider.hits(), first + 1);
  await sql`UPDATE publications SET summary = null WHERE article_id = ${id("f")}`;
  assert.equal((await translatePendingListNotes()).translated, 1);
  assert.equal(provider.hits(), first + 1);
  assert.equal(await summaryOf("f"), NOTE);
});
