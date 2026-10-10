// A site-configured list of one source's own latest posts (site/site.ts FEED_LISTS): the raw feed
// listing behind a tab like GitHub 热榜. It is not an editorial surface — the publication row only
// decides that the post is public (氛围/hot_signal material has no item page and never enters the
// pool) — so the title and the link are the source's own. The lead is the source's too, unless the
// site asked for a Chinese note (FEED_LISTS[].translate): that one model-written line is stored on
// the publication row by the list-translate module and preferred over the source's wording.
import type { SourceListItem, SourceListResponse } from "@aihot/contracts/site";
import { FEED_LISTS, type FeedList } from "@aihot/site";
import { sql } from "../db.ts";
import { publicSourceName } from "./rules.ts";

/** The most a list page may hold, whatever the site config asks for. */
export const LIST_PAGE_MAX = 50;

/** The site's lists are configured, not discovered: an unknown slug has no page. */
export function findFeedList(slug: string): FeedList | null {
  return FEED_LISTS.find((l) => l.slug === slug) ?? null;
}

interface ListRow {
  id: string;
  title: string;
  original_title: string | null;
  summary: string | null;
  excerpt: string | null;
  url: string;
  source_name: string;
  published_at: Date | null;
  discovered_at: Date;
}

/**
 * One page of a list's items, newest batch first: within a batch (the posts one fetch found) the
 * source's own order is kept — that is the ranking GitHub publishes — and older batches follow.
 */
export async function loadSourceList(slug: string, page = 1): Promise<SourceListResponse | null> {
  const list = findFeedList(slug);
  if (!list) return null;
  const pageSize = Math.min(list.pageSize, LIST_PAGE_MAX);
  const current = Number.isSafeInteger(page) && page > 0 ? page : 1;
  const [source] = await sql<{ id: string; name: string }[]>`SELECT id, name FROM sources WHERE id = ${list.sourceId} AND enabled`;
  if (!source) return null;
  const rows = await sql<ListRow[]>`
    SELECT a.id, coalesce(p.title, a.title) AS title, p.original_title, p.summary,
           coalesce(a.excerpt, left(a.body_text, 400)) AS excerpt, a.url,
           s.name AS source_name, a.published_at, a.discovered_at
    FROM articles a
    JOIN sources s ON s.id = a.source_id
    JOIN publications p ON p.article_id = a.id AND p.visibility = 'public'
    WHERE a.source_id = ${list.sourceId} AND a.processing_state <> 'failed'
    ORDER BY a.discovered_at::date DESC, a.discovered_at ASC, a.id
    LIMIT ${pageSize + 1} OFFSET ${(current - 1) * pageSize}`;
  const name = publicSourceName(source.name);
  const items = rows.slice(0, pageSize).map((row): SourceListItem => ({
    id: row.id,
    title: row.title,
    originalTitle: row.original_title && row.original_title !== row.title ? row.original_title : null,
    excerpt: row.summary ?? row.excerpt?.trim() ?? null,
    url: row.url,
    source: { name },
    publishedAt: (row.published_at ?? row.discovered_at).toISOString(),
  }));
  return { source: { id: source.id, name }, items, page: current, pageSize, hasMore: rows.length > pageSize };
}

/**
 * Stores the site's own note for one list item — the Chinese line the list-translate module asked the
 * model for. The article keeps the source's own text; the note is what the list shows in its place.
 * Returns false when there is no public row to write (the item was withdrawn while the model answered).
 */
export async function setListSummary(articleId: string, summary: string): Promise<boolean> {
  const rows = await sql`
    UPDATE publications SET summary = ${summary}, updated_at = now()
    WHERE article_id = ${articleId} AND visibility = 'public'
    RETURNING article_id`;
  return rows.length > 0;
}
