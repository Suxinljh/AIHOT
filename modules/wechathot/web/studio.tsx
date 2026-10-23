// The hot list: every event the workbench has projected, filtered by the editor's own reading
// interests. The list speaks in days and the api receives an absolute time, so a bookmark keeps
// meaning "the last seven days" instead of freezing the day it was saved.
import { useState } from "react";
import { Link, useLoaderData, useNavigate, useSearchParams, useRouteError, type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { IconFlame, IconSearch } from "@aihot/web/components/icons";
import { adminGet } from "@aihot/web/lib/admin.server";
import { Badge, Button, ButtonLink, Field, FilterChips, Input, Pager } from "@aihot/web/features/admin/ui";
import { relativeTime } from "@aihot/web/lib/format";
import type { EventScope, EventSort, StudioEventList, StudioEventListItem } from "../studio-types.ts";
import { STUDIO_PRODUCT, studioMeta } from "./studio-nav";
import { EventScoreGrid, EventStateBadges, EventVerificationBadge, channelTypeLabel, industryLabel } from "./studio-event-ui";

const SORTS: Array<{ value: EventSort; label: string }> = [
  { value: "discovered", label: "最新发现" },
  { value: "latest", label: "最新进展" },
  { value: "heat", label: "热度" },
  { value: "recommend", label: "选题推荐" },
  { value: "followed", label: "关注优先" },
];

const DAYS = [1, 3, 7, 30];

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const days = Number(url.searchParams.get("days") ?? 30);
  const query = new URLSearchParams(url.searchParams);
  // The page speaks in days; only the api's own filters are forwarded.
  query.delete("days");
  if (Number.isFinite(days) && days > 0) {
    query.set("from", new Date(Date.now() - days * 86400_000).toISOString());
  }
  const suffix = query.size ? `?${query}` : "";
  try {
    const list = await adminGet<StudioEventList>(request, `/api/studio/events${suffix}`);
    return { list, days, q: url.searchParams.get("q") ?? "" };
  } catch (error) {
    if (typeof error === "object" && error && "status" in error && Number((error as { status: number }).status) === 401) {
      throw error;
    }
    throw new Response("热点列表加载失败", { status: 503 });
  }
}

export const meta: MetaFunction = () => studioMeta("热点发现");

export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <div className="rounded-panel bg-surface p-6 text-center ring-1 ring-line">
      <h1 className="text-[18px] font-semibold text-ink">热点列表加载失败</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-3">稍后再试，或刷新页面重新读取事件。</p>
      <div className="mt-4 flex justify-center">
        <ButtonLink to="/" tone="primary">重新加载</ButtonLink>
      </div>
    </div>
  );
}

function ScoreLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-ink-4">
      <span>新闻价值 = 沿用 AIHOT 精选分</span>
      <span>热度 = 已采集信源的传播估计</span>
      <span>推荐分 = 事件级选题评分</span>
    </div>
  );
}

function EventCard({ item }: { item: StudioEventListItem }) {
  return (
    <article className="rounded-panel bg-surface p-4 ring-1 ring-line transition-shadow hover:shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <EventVerificationBadge status={item.verificationStatus} updated={item.updated} />
        {item.followed && <Badge tone="accent">关注品牌</Badge>}
        {item.eventType && <Badge tone="info">{item.eventType}</Badge>}
        {item.state.starred && <Badge tone="accent">已收藏</Badge>}
        {item.state.ignored && <Badge tone="bad">已忽略</Badge>}
      </div>

      <h2 className="mt-2.5 text-[16px] font-semibold leading-[1.5] text-ink">
        <Link to={`/events/${encodeURIComponent(item.publicId)}`} className="hover:text-accent">
          {item.title}
        </Link>
      </h2>
      {item.summary && <p className="mt-1.5 line-clamp-2 text-[13px] leading-[1.75] text-ink-3">{item.summary}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-ink-4">
        {item.primarySource && <span className="text-ink-3">{item.primarySource}</span>}
        <span>{item.reportCount} 篇报道</span>
        <span>{item.sourceCount} 个来源</span>
        {item.topicCount > 0 && <Badge tone="info">{item.topicCount} 个选题</Badge>}
        <span>{relativeTime(item.latestAt ?? item.firstReportAt ?? new Date().toISOString())}</span>
      </div>

      {item.brands.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {item.brands.slice(0, 6).map((brand) => (
            <span key={brand.id} className="rounded-full bg-bg-sunk px-2 py-0.5 text-[11px] text-ink-3">
              {brand.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {item.categories.slice(0, 3).map((key) => (
          <Badge key={key} tone="muted">{industryLabel(key)}</Badge>
        ))}
        {item.channelTypes.slice(0, 3).map((type) => (
          <span key={type} className="text-[11px] text-ink-4">{channelTypeLabel(type)}</span>
        ))}
      </div>

      <div className="mt-3">
        <EventScoreGrid heat={item.heat} newsValue={item.newsValue} recommendation={item.recommendationScore} />
      </div>
      {item.recommendationReason && <p className="mt-2 text-[11.5px] leading-[1.7] text-ink-4">{item.recommendationReason}</p>}
    </article>
  );
}

export default function StudioHotspots() {
  const { list, days, q } = useLoaderData<typeof loader>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(q);

  const scope = list.scope;
  const filtersActive = ["q", "industry", "brand", "channel", "eventType", "sourceTier", "read"].some((key) => params.get(key));

  function withParams(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    next.delete("page");
    const search = next.toString();
    return search ? `/?${search}` : "/";
  }

  const industryOptions = [
    { value: "", label: "全部行业" },
    ...list.facets.industries.map((facet) => ({ value: facet.value, label: facet.label, count: facet.count })),
  ];

  return (
    <div>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mono text-[11px] uppercase tracking-[0.18em] text-ink-4">{STUDIO_PRODUCT} / Studio</div>
          <h1 className="mt-2 text-[28px] font-black leading-[1.2] tracking-[-0.03em] text-ink sm:text-[34px]">热点发现</h1>
          <p className="mt-3 max-w-[52em] text-[14px] leading-[1.8] text-ink-3">
            跨行业聚合事件、推荐榜和关注更新。先看清发生了什么，再决定值不值得写。
          </p>
        </div>
        <form
          className="flex w-full max-w-[380px] items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            navigate(withParams({ q: query.trim() || null }));
          }}
        >
          <div className="flex-1">
            <Field label="搜索事件">
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="标题、摘要或品牌" />
            </Field>
          </div>
          <Button type="submit" tone="secondary"><IconSearch size={15} /> 搜索</Button>
        </form>
      </header>

      <div className="mt-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <FilterChips
            param="scope"
            options={[
              { value: "curated", label: "有编辑价值" },
              { value: "all", label: "全部事件" },
            ]}
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="排序"
              className="rounded-control border border-line bg-surface px-2.5 py-1.5 text-[12.5px] text-ink-2"
              value={list.sort}
              onChange={(event) => navigate(withParams({ sort: event.target.value }))}
            >
              {SORTS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select
              aria-label="时间范围"
              className="rounded-control border border-line bg-surface px-2.5 py-1.5 text-[12.5px] text-ink-2"
              value={days}
              onChange={(event) => navigate(withParams({ days: event.target.value }))}
            >
              {DAYS.map((value) => <option key={value} value={value}>近 {value} 天</option>)}
            </select>
            <FilterChips
              param="read"
              options={[
                { value: "", label: "全部" },
                { value: "false", label: "未读" },
                { value: "true", label: "已读" },
              ]}
            />
          </div>
        </div>
        {industryOptions.length > 1 && <FilterChips param="industry" options={industryOptions} />}
        <ScoreLegend />
      </div>

      {list.items.length === 0 ? (
        <section className="mt-8 rounded-panel border border-dashed border-line-strong bg-surface/60 px-5 py-12 text-center sm:px-8 sm:py-16">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
            <IconFlame size={22} />
          </div>
          {filtersActive ? (
            <>
              <h2 className="mt-4 text-[17px] font-semibold text-ink">没有匹配的事件</h2>
              <p className="mx-auto mt-2 max-w-[38em] text-[13.5px] leading-[1.8] text-ink-3">
                换个行业、时间或搜索词试试，也可以清除筛选回到全部事件。
              </p>
              <div className="mt-4 flex justify-center">
                <ButtonLink to="/" tone="secondary">清除筛选</ButtonLink>
              </div>
            </>
          ) : (
            <>
              <h2 className="mt-4 text-[17px] font-semibold text-ink">还没有可用的热点事件</h2>
              <p className="mx-auto mt-2 max-w-[38em] text-[13.5px] leading-[1.8] text-ink-3">
                工作台已经连接。事件投影和首轮评分完成后，热点会按七个行业出现在这里。
              </p>
              <div className="mt-4 flex justify-center">
                <ButtonLink to={withParams({ scope: "all", read: null })} tone="secondary">查看全部已采集事件</ButtonLink>
              </div>
            </>
          )}
        </section>
      ) : (
        <>
          <div className="mt-5 flex items-center justify-between px-1 text-[12px] text-ink-4">
            <span>共 {list.total} 个事件</span>
            <span>第 {list.page} / {Math.max(list.totalPages, 1)} 页</span>
          </div>
          <div className="mt-2 grid gap-3">
            {list.items.map((item) => <EventCard key={item.storyId} item={item} />)}
          </div>
          <div className="mt-5 flex justify-center">
            <Pager page={list.page} hasMore={list.page < list.totalPages} />
          </div>
          {scope === "curated" && (
            <div className="mt-4 text-center">
              <ButtonLink to={withParams({ scope: "all" })} tone="secondary">查看全部已采集事件</ButtonLink>
            </div>
          )}
        </>
      )}
    </div>
  );
}
