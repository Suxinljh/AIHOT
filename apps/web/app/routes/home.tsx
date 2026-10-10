import { redirect, useLoaderData } from "react-router";
import type { Route } from "./+types/home";
import type { SourceListResponse, TimelineResponse } from "@aihot/contracts/site";
import { FEED_LISTS, type FeedList } from "@aihot/site";
import { cachedPage, loadOr404 } from "../lib/api.server";
import { pageReuse } from "../lib/page-reuse";
import { filterParams, hasFeedFilters, itemListLd, listPath, pageMeta, readFilters, siteLd } from "../lib/seo";
import { inNav } from "../components/shell/nav";
import type { Screen } from "../components/shell/screens";
import { Timeline } from "../features/feed/Timeline";
import { HotTopics } from "../features/feed/HotTopics";
import { SourceList } from "../features/feed/SourceList";
import { ActiveFilters, CategoryTabs, FeedBar, SearchField } from "../features/feed/Filters";

export const handle: Screen = { tab: "featured", name: "精选" };
export { pageHeaders as headers } from "../lib/api.server";
export const { clientLoader, shouldRevalidate } = pageReuse<typeof loader>();

/**
 * The source list this address asks for (`?list=<slug>`, site/site.ts FEED_LISTS): a tab of 精选, not a
 * filter. An address the site no longer configures falls back to 精选 itself rather than 404.
 */
function wantedList(url: URL): { list: FeedList; page: number } | null {
  const slug = url.searchParams.get("list");
  const list = slug ? FEED_LISTS.find((l) => l.slug === slug) : undefined;
  if (!list) return null;
  const page = Number(url.searchParams.get("page") ?? 1);
  return { list, page: Number.isSafeInteger(page) && page > 0 ? page : 1 };
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  // Search lives on /all; keep the parameters so old links still land on results.
  if (q && q.trim()) throw redirect(`/all${url.search}`);
  const wanted = wantedList(url);
  if (wanted) {
    const upstream = new Headers();
    const data = await loadOr404<SourceListResponse>(listPath(`/api/site/lists/${wanted.list.slug}`, { page: wanted.page }), { responseHeaders: upstream, signal: request.signal });
    return cachedPage(60, { kind: "list" as const, list: wanted.list, page: wanted.page, data }, upstream);
  }
  const filters = readFilters(url.searchParams);
  const upstream = new Headers();
  const data = await loadOr404<TimelineResponse>(listPath("/api/site/timeline", filterParams(filters)), { responseHeaders: upstream, signal: request.signal });
  return cachedPage(60, { kind: "feed" as const, data, filters }, upstream);
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (loaderData?.kind === "list") {
    const { list, page } = loaderData;
    return pageMeta({
      path: `${listPath("/", { list: list.slug })}${page > 1 ? `&page=${page}` : ""}`,
      title: list.label,
      description: list.blurb,
      noindex: page > 1,
    });
  }
  const path = listPath("/", loaderData ? filterParams(loaderData.filters) : {});
  const titles = loaderData?.data.cards.map((c) => c.item.title) ?? [];
  return pageMeta({ path, noindex: hasFeedFilters(loaderData?.filters), jsonLd: path === "/" ? [...siteLd(), itemListLd("/", "精选", titles)] : undefined });
}

export default function Home() {
  const loaded = useLoaderData<typeof loader>();
  // A source list (GitHub 热榜): the same filter row, and one page of the source's own entries instead
  // of the feed — nothing here is selected, scored or written by the site.
  if (loaded.kind === "list") {
    return (
      <div className="pb-6">
        <FeedBar base="/" category={null} channel="all" list={loaded.list.slug} />
        <div className="hidden lg:mb-5 lg:mt-1 lg:block">
          <CategoryTabs base="/" category={null} channel="all" list={loaded.list.slug} layoutId="home-cat-desk" className="min-w-0" />
        </div>
        <SourceList list={loaded.list} data={loaded.data} page={loaded.page} />
      </div>
    );
  }
  const { data, filters } = loaded;
  const title = filters.tag ? `#${filters.tag}` : "精选";
  return (
    <div className="pb-6">
      {/* Phones: the bar (精选 | 全部, filter, search), the filter in use, today's hot topics, the feed. */}
      <FeedBar base="/" category={filters.category} channel={filters.channel} />
      <ActiveFilters base="/" category={filters.category} channel={filters.channel} tag={filters.tag} />
      <div className="hidden lg:block">
        <h1 className="text-[24px] font-semibold leading-[1.3] text-ink">{title}</h1>
        <div className="mb-5 mt-4 flex items-center justify-between gap-4">
          <CategoryTabs base="/" category={filters.category} channel={filters.channel} layoutId="home-cat-desk" className="min-w-0" />
          <SearchField keep={{ category: filters.category }} />
        </div>
      </div>

      {data.hot && inNav("/hot") && <HotTopics entries={data.hot} />}

      <Timeline initial={data} filters={data.filters} />
    </div>
  );
}
