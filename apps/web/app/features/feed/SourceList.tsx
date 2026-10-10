// A site-configured source list (site/site.ts FEED_LISTS), opened from the tab after the categories on
// 精选: one page of one source's own latest posts, as the source published them. Nothing here is the
// site's own writing — the title, the lead and the link are the feed's, except the Chinese note a list
// with translate asked the model for (modules/list-translate) — so every row leaves for the source.
import { Link } from "react-router";
import type { SourceListResponse } from "@aihot/contracts/site";
import type { FeedList } from "@aihot/site";
import { IconArrowRight } from "../../components/icons";
import { monthDayTime } from "../../lib/format";

/** The list's own address: the 精选 page with this list chosen, one page per request. */
export function listHref(slug: string, page = 1): string {
  return page > 1 ? `/?list=${encodeURIComponent(slug)}&page=${page}` : `/?list=${encodeURIComponent(slug)}`;
}

const pager = "inline-flex h-10 items-center gap-1 rounded-full px-4 text-[13.5px] font-medium text-ink-2 transition-colors hover:bg-bg-sunk hover:text-accent active:bg-bg-sunk";

export function SourceList({ list, data, page }: { list: FeedList; data: SourceListResponse; page: number }) {
  const host = list.officialUrl ? safeHost(list.officialUrl) : null;
  return (
    <div>
      <header className="mb-4">
        <h1 className="text-[24px] font-semibold leading-[1.3] text-ink">{list.label}</h1>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px] leading-[1.6] text-ink-3">
          <span>{list.blurb}</span>
          {host && (
            <a href={list.officialUrl} target="_blank" rel="noreferrer noopener" className="group inline-flex items-center gap-1 font-medium text-accent transition-opacity active:opacity-60">
              去 {host} 看完整榜单
              <IconArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
          )}
        </p>
      </header>

      {data.items.length === 0 ? (
        <p className="card px-4 py-8 text-center text-[14px] text-ink-3">这个信源还没有采到公开条目，等下一轮采集。</p>
      ) : (
        <ol className="card divide-y divide-line-soft overflow-hidden">
          {data.items.map((item, i) => (
            <li key={item.id}>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer noopener"
                className="group flex gap-3 px-3.5 py-3 transition-colors hover:bg-bg-sunk/70 active:bg-bg-sunk lg:px-4"
              >
                <span className="num w-6 shrink-0 pt-[3px] text-center text-[14px] font-bold text-ink-4">{(page - 1) * data.pageSize + i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold leading-[1.5] text-ink transition-colors group-hover:text-accent">{item.title}</span>
                  {item.originalTitle && <span className="mt-0.5 block text-[12.5px] leading-[1.5] text-ink-4">{item.originalTitle}</span>}
                  {item.excerpt && <span className="mt-1 line-clamp-2 block text-[13px] leading-[1.6] text-ink-3">{item.excerpt}</span>}
                  <span className="mt-1.5 block text-[12px] text-ink-4">
                    {monthDayTime(item.publishedAt)} · {item.source.name}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ol>
      )}

      <nav className="mt-3 flex items-center justify-between gap-3" aria-label="翻页">
        {page > 1 ? (
          <Link to={listHref(list.slug, page - 1)} className={pager} prefetch="intent">
            上一页
          </Link>
        ) : (
          <span />
        )}
        <span className="text-[12.5px] text-ink-4">第 {page} 页</span>
        {data.hasMore ? (
          <Link to={listHref(list.slug, page + 1)} className={pager} prefetch="intent">
            下一页
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}

/** The bare host of the source's own page, for the "go and see" link. */
function safeHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
