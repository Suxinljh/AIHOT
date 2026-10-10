// A site-configured source list (site/site.ts FEED_LISTS): only the configured source's public posts,
// newest batch first with the source's own order inside a batch, one page at a time, and nothing that
// needs a model. Titles and leads stay the source's own; an address the site does not configure has no
// page at all.
import { tag } from "./setup.ts";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { closeDb, sql } from "@aihot/backend/db";
import { loadSourceList } from "@aihot/backend/publication/source-list";
import { FEED_LISTS } from "@aihot/site";

const T = `sourcelist-${tag()}`;
const LIST = FEED_LISTS[0]!;
const OTHER = `${T}-other`;
const id = (suffix: string) => `${T}-${suffix}`;
after(closeDb);

before(async () => {
  await sql`INSERT INTO sources (id, name, kind, tier, participation_mode) VALUES (${LIST.sourceId}, ${T}, 'rss', 'T2', 'hot_signal')`;
  await sql`INSERT INTO sources (id, name, kind, tier) VALUES (${OTHER}, ${`${T}-other`}, 'rss', 'T1')`;
});

/** One collected post: the article the collector stored and the public row the publication layer wrote. */
async function add(suffix: string, options: {
  at: string; title?: string; sourceTitle?: string; excerpt?: string | null; summary?: string | null;
  state?: string; visibility?: string; source?: string;
}) {
  const articleTitle = options.title ?? id(suffix);
  const source = options.source ?? LIST.sourceId;
  const at = new Date(options.at);
  await sql`INSERT INTO articles (id, source_id, identity_key, url, title, excerpt, discovered_at, timeline_at, processing_state)
    VALUES (${id(suffix)}, ${source}, ${id(suffix)}, ${`https://example.org/${id(suffix)}`}, ${articleTitle}, ${options.excerpt ?? null}, ${at}, ${at}, ${options.state ?? "skipped"})`;
  const published = options.sourceTitle ?? articleTitle;
  await sql`INSERT INTO publications (article_id, title, original_title, summary, source_id, channel, tags, url, discovered_at, timeline_at, sort_at,
    selected, eligible, visibility, visible_after, search_text)
    VALUES (${id(suffix)}, ${published}, ${published === articleTitle ? null : articleTitle}, ${options.summary ?? null}, ${source}, 'news', ${[]},
      ${`https://example.org/${id(suffix)}`}, ${at}, ${at}, ${at}, false, false, ${options.visibility ?? "public"}, ${at}, '')`;
}

test("lists the configured source only, newest batch first, source order inside a batch", async () => {
  await add("a1", { at: "2026-01-01T09:00:01Z", title: "older one", excerpt: "第一条" });
  await add("a2", { at: "2026-01-01T09:00:02Z", title: "older two" });
  await add("b1", { at: "2026-01-02T09:00:01Z", title: "newer one" });
  await add("b2", { at: "2026-01-02T09:00:02Z", title: "newer two" });
  await add("other", { at: "2026-01-03T09:00:01Z", title: "another source", source: OTHER });
  const page = await loadSourceList(LIST.slug);
  assert.ok(page);
  assert.deepEqual(page.items.map((item) => item.id), ["b1", "b2", "a1", "a2"].map(id), "the newest batch first, the batch's own order kept");
  assert.equal(page.items[2]!.excerpt, "第一条");
  assert.equal(page.hasMore, false);
});

test("keeps the source's own title, and shows its original only when the site's differs", async () => {
  await add("own", { at: "2026-01-04T09:00:01Z", title: "owner/repo — a repository", excerpt: "A repository about things." });
  await add("translated", { at: "2026-01-04T09:00:02Z", title: "owner/other", sourceTitle: "一个仓库", summary: "站点写的摘要。" });
  const page = await loadSourceList(LIST.slug);
  const [translated, own] = [page!.items.find((i) => i.id === id("translated"))!, page!.items.find((i) => i.id === id("own"))!];
  assert.equal(own.title, "owner/repo — a repository");
  assert.equal(own.originalTitle, null);
  assert.equal(translated.title, "一个仓库");
  assert.equal(translated.originalTitle, "owner/other");
  assert.equal(translated.excerpt, "站点写的摘要。");
});

test("hides withdrawn, failed and unpublished material, and configures nothing for unknown slugs", async () => {
  await add("withdrawn", { at: "2026-01-05T09:00:01Z", visibility: "withdrawn" });
  await add("failed", { at: "2026-01-05T09:00:02Z", state: "failed" });
  const page = await loadSourceList(LIST.slug);
  assert.deepEqual(page!.items.filter((i) => i.id.startsWith(id("withdrawn")) || i.id.startsWith(id("failed"))), []);
  assert.equal(await loadSourceList("no-such-list"), null);
});

test("pages through the list, one configured page at a time", async () => {
  for (let i = 0; i < 12; i += 1) await add(`page-${i}`, { at: `2026-02-01T09:00:${String(i).padStart(2, "0")}Z`, title: `item ${i}` });
  const first = await loadSourceList(LIST.slug, 1);
  assert.equal(first!.items.length, LIST.pageSize);
  assert.equal(first!.items[0]!.id, id("page-0"), "within the batch the source's own order is kept");
  assert.equal(first!.page, 1);
  assert.equal(first!.hasMore, true);
  const second = await loadSourceList(LIST.slug, 2);
  assert.deepEqual(second!.items.slice(0, 2).map((i) => i.id), [id("page-10"), id("page-11")], "the next page carries on inside the newest batch");
  assert.equal(second!.hasMore, false, "the run of older batches ends here");
  const beyond = await loadSourceList(LIST.slug, 9);
  assert.deepEqual([beyond!.items.length, beyond!.hasMore], [0, false]);
  assert.equal((await loadSourceList(LIST.slug, 0))!.page, 1, "a page that is not a positive integer falls back to the first");
});
