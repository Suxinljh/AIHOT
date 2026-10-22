// The workbench's own numbers: how many pitches became drafts, how many drafts were finished or
// rewritten by hand, and what the models cost per draft and per hundred collected items. Every
// denominator that is zero returns null, so the page can say "—" instead of a misleading 0.
import { sql } from "@aihot/backend/db";

export interface StudioMetrics {
  from: string;
  to: string;
  topics: { created: number; adopted: number; adoptionRate: number | null };
  articles: { created: number; done: number; completionRate: number | null; rewritten: number; rewriteRate: number | null };
  collection: { items: number };
  cost: {
    total: number | null;
    currency: string | null;
    perArticle: number | null;
    perHundredItems: number | null;
    byPurpose: Array<{ purpose: string; amount: number; requests: number }>;
  };
}

export async function loadMetrics(from: Date, to: Date): Promise<StudioMetrics> {
  const [topicRow] = await sql<{ created: number; adopted: number }[]>`
    SELECT count(*)::int AS created,
           count(*) FILTER (WHERE EXISTS (SELECT 1 FROM wc_articles a WHERE a.topic_id = t.id))::int AS adopted
    FROM wc_topics t
    WHERE t.created_at >= ${from} AND t.created_at < ${to}`;
  const [articleRow] = await sql<{ created: number; done: number; rewritten: number }[]>`
    SELECT count(*)::int AS created,
           count(*) FILTER (WHERE a.status = 'done')::int AS done,
           count(*) FILTER (WHERE EXISTS (
             SELECT 1 FROM wc_article_versions v WHERE v.article_id = a.id AND v.reason = '手动修改'
           ))::int AS rewritten
    FROM wc_articles a
    WHERE a.created_at >= ${from} AND a.created_at < ${to}`;
  const [collectionRow] = await sql<{ items: number }[]>`
    SELECT count(*)::int AS items FROM articles WHERE discovered_at >= ${from} AND discovered_at < ${to}`;
  const [costRow] = await sql<{ total: string | null; currency: string | null; articles: number }[]>`
    SELECT sum(cost) AS total,
           max(currency) AS currency,
           count(DISTINCT subject) FILTER (WHERE subject LIKE 'article:%')::int AS articles
    FROM receipts
    WHERE created_at >= ${from} AND created_at < ${to} AND cost IS NOT NULL`;
  const byPurpose = await sql<{ purpose: string; amount: string; requests: number }[]>`
    SELECT purpose, sum(cost) AS amount, count(*)::int AS requests
    FROM receipts
    WHERE created_at >= ${from} AND created_at < ${to} AND cost IS NOT NULL
    GROUP BY purpose
    ORDER BY sum(cost) DESC`;

  const total = costRow?.total === null || costRow?.total === undefined ? null : Number(costRow.total);
  const currency = costRow?.currency ?? null;
  const items = Number(collectionRow?.items ?? 0);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    topics: {
      created: Number(topicRow?.created ?? 0),
      adopted: Number(topicRow?.adopted ?? 0),
      adoptionRate: topicRow && Number(topicRow.created) > 0 ? Number(topicRow.adopted) / Number(topicRow.created) : null,
    },
    articles: {
      created: Number(articleRow?.created ?? 0),
      done: Number(articleRow?.done ?? 0),
      completionRate: articleRow && Number(articleRow.created) > 0 ? Number(articleRow.done) / Number(articleRow.created) : null,
      rewritten: Number(articleRow?.rewritten ?? 0),
      rewriteRate: articleRow && Number(articleRow.created) > 0 ? Number(articleRow.rewritten) / Number(articleRow.created) : null,
    },
    collection: { items },
    cost: {
      total,
      currency,
      perArticle: total !== null && Number(costRow?.articles ?? 0) > 0 ? total / Number(costRow?.articles ?? 0) : null,
      perHundredItems: total !== null && items > 0 ? (total / items) * 100 : null,
      byPurpose: byPurpose.map((row) => ({ purpose: row.purpose, amount: Number(row.amount), requests: Number(row.requests) })),
    },
  };
}
