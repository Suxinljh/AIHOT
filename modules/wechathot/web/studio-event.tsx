// One event's private page: the evidence, the scores with their reasons, and the editor's own
// decisions. Everything here comes from the studio API; nothing is written to the public layer.
import { useState } from "react";
import { Link, useLoaderData, useRouteError, type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { IconArrowLeft, IconBookmark, IconCheck, IconClock, IconExternal, IconFlame, IconInfo } from "@aihot/web/components/icons";
import { adminGet } from "@aihot/web/lib/admin.server";
import { Badge, Button, ButtonLink, Field, Input, Select } from "@aihot/web/features/admin/ui";
import { monthDayTime, relativeTime } from "@aihot/web/lib/format";
import type { EventManualDecision, StudioEventDetail } from "../studio-types.ts";
import { STUDIO_PRODUCT, studioMeta } from "./studio-nav";
import { useStudioAction } from "./studio-action";
import { StudioDialog } from "./studio-brand-ui";
import {
  EventScoreGrid,
  EventSection,
  EventStateBadges,
  EventVerificationBadge,
  channelTypeLabel,
  decisionLabel,
  industryLabel,
  scoreText,
  scoreTone,
} from "./studio-event-ui";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const publicId = params.publicId;
  if (!publicId) throw new Response("Not Found", { status: 404 });
  const event = await adminGet<StudioEventDetail>(request, `/api/studio/events/${encodeURIComponent(publicId)}`);
  return { event };
}

export const meta: MetaFunction = () => studioMeta("事件详情");

export function ErrorBoundary() {
  const error = useRouteError();
  const status = typeof error === "object" && error && "status" in error ? Number((error as { status: number }).status) : 500;
  return (
    <div className="rounded-panel bg-surface p-6 text-center ring-1 ring-line">
      <h1 className="text-[18px] font-semibold text-ink">{status === 404 ? "这个事件不存在" : "事件详情加载失败"}</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-3">
        {status === 404 ? "它可能已经被合并，或者还没有投影到工作台。" : "稍后再试，或回到热点发现重新进入。"}
      </p>
      <div className="mt-4 flex justify-center">
        <ButtonLink to="/studio" tone="primary">回到热点发现</ButtonLink>
      </div>
    </div>
  );
}

const DECISIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "未判断" },
  { value: "recommend", label: "推荐" },
  { value: "ignore", label: "忽略" },
  { value: "later", label: "稍后" },
  { value: "reported", label: "已报道" },
];

export default function StudioEvent() {
  const { event } = useLoaderData<typeof loader>();
  const { run, pending } = useStudioAction();
  const [topicOpen, setTopicOpen] = useState(false);
  const [angle, setAngle] = useState("");
  const [columnType, setColumnType] = useState<"news" | "insight">("news");

  function openTopic() {
    setAngle("");
    setColumnType("news");
    setTopicOpen(true);
  }

  async function createTopic() {
    const created = await run<{ id: number }>("POST", "/api/studio/topics", {
      storyId: event.storyId,
      angle: angle.trim() || null,
      columnType,
      // The editor has seen the existing topics; another angle is a deliberate choice.
      force: event.pitchCount > 0,
    }, { label: "topic-create", success: "选题已创建" });
    if (!created) return;
    setTopicOpen(false);
  }

  async function patch(body: Record<string, unknown>, label: string, success: string) {
    await run<StudioEventDetail>("PATCH", `/api/studio/events/${encodeURIComponent(event.publicId)}/state`, body, { label, success });
  }

  const state = event.state;

  return (
    <div>
      <Link to="/studio" className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-4 transition-colors hover:text-ink">
        <IconArrowLeft size={14} />热点发现
      </Link>

      <header className="mt-3 rounded-panel bg-surface p-5 ring-1 ring-line lg:p-6">
        <div className="mono text-[10px] uppercase tracking-[0.16em] text-ink-4">{STUDIO_PRODUCT} / 事件详情</div>
        <h1 className="mt-2 text-[24px] font-black leading-[1.25] tracking-[-0.03em] text-ink sm:text-[30px]">{event.title}</h1>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {event.categories.map((category) => <Badge key={category} tone="info">{industryLabel(category)}</Badge>)}
          {event.eventType && <Badge tone="muted">{event.eventType}</Badge>}
          <EventVerificationBadge status={event.verificationStatus} updated={event.updated} />
          <EventStateBadges state={state} pitchCount={event.pitchCount} />
          {event.followed && <Badge tone="accent">已关注品牌</Badge>}
        </div>

        {event.mergedFrom && (
          <p className="mt-3 rounded-control bg-accent-soft px-3 py-2 text-[12.5px] leading-relaxed text-accent">
            这个事件已被合并，现在显示的是存活事件。
          </p>
        )}

        <p className="mt-4 max-w-[72em] text-[13.5px] leading-[1.9] text-ink-2">
          {event.digest || event.summary || event.excerpt?.text || "还没有综述。事件投影补齐摘要后，这里会显示可核实的说明。"}
        </p>

        <dl className="mt-4 grid gap-3 border-t border-line-soft pt-4 text-[12.5px] sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-ink-4">首发时间</dt>
            <dd className="mt-0.5 text-ink-2">{event.firstReportAt ? monthDayTime(event.firstReportAt) : "—"}</dd>
          </div>
          <div>
            <dt className="text-ink-4">最近更新</dt>
            <dd className="mt-0.5 text-ink-2" title={event.latestAt ? monthDayTime(event.latestAt) : undefined}>
              {event.latestAt ? relativeTime(event.latestAt) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-ink-4">聚合条目</dt>
            <dd className="mt-0.5 text-ink-2">{event.reportCount} 篇报道 · {event.sourceCount} 个来源</dd>
          </div>
          <div>
            <dt className="text-ink-4">主要来源</dt>
            <dd className="mt-0.5 truncate text-ink-2">{event.primarySource ?? "—"}</dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line-soft pt-4">
          <Button
            tone={state.read ? "secondary" : "primary"}
            busy={pending === "event-read"}
            onClick={() => patch({ read: !state.read }, "event-read", state.read ? "已标记为未读" : "已标记为已读")}
          >
            <IconCheck size={14} />{state.read ? "标为未读" : "标为已读"}
          </Button>
          <Button
            tone={state.starred ? "primary" : "secondary"}
            busy={pending === "event-star"}
            onClick={() => patch({ starred: !state.starred }, "event-star", state.starred ? "已取消收藏" : "已收藏")}
          >
            <IconBookmark size={14} filled={state.starred} />{state.starred ? "取消收藏" : "收藏"}
          </Button>
          <Button
            tone={state.ignored ? "danger" : "secondary"}
            busy={pending === "event-ignore"}
            onClick={() => patch({ ignored: !state.ignored }, "event-ignore", state.ignored ? "已取消忽略" : "已忽略")}
          >
            {state.ignored ? "取消忽略" : "忽略"}
          </Button>
          <Button
            tone={state.followUp ? "primary" : "secondary"}
            busy={pending === "event-follow-up"}
            onClick={() => patch({ followUp: !state.followUp }, "event-follow-up", state.followUp ? "已取消关注后续" : "会关注后续")}
          >
            {state.followUp ? "已关注后续" : "关注后续"}
          </Button>
          <div className="ml-auto w-full sm:w-[168px]">
            <Select
              aria-label="人工判断"
              value={state.manualDecision ?? ""}
              onChange={(event_) => {
                const value = event_.target.value as EventManualDecision | "";
                patch({ manualDecision: value || null }, "event-decision", value ? `已标记为${decisionLabel(value)}` : "已清除人工判断");
              }}
            >
              {DECISIONS.map((decision) => <option key={decision.value} value={decision.value}>{decision.label}</option>)}
            </Select>
          </div>
        </div>
      </header>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 space-y-5">
          <EventSection title="时间线与原始报道" right={<span>{event.timeline.length} 篇</span>}>
            {event.timeline.length ? (
              <ol className="space-y-3">
                {event.timeline.map((report) => (
                  <li key={report.id} className="rounded-control border border-line-soft bg-bg-sunk/40 px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink-4">
                      <span className="inline-flex items-center gap-1"><IconClock size={12} />{monthDayTime(report.publishedAt)}</span>
                      <span>·</span>
                      <span className="truncate">{report.source.name}</span>
                      {report.source.firstParty && <Badge tone="ok">一手来源</Badge>}
                      {report.selected && <Badge tone="accent">精选</Badge>}
                    </div>
                    <h3 className="mt-1.5 text-[13.5px] font-semibold leading-snug text-ink">{report.title}</h3>
                    {report.summary && (
                      <details className="group mt-1.5">
                        <summary className="cursor-pointer list-none text-[12px] text-ink-4 transition-colors hover:text-ink-2">展开摘要</summary>
                        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-3">{report.summary}</p>
                      </details>
                    )}
                    {report.url && (
                      <a href={report.url} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[12px] text-accent hover:underline">
                        阅读原文<IconExternal size={12} />
                      </a>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-[13px] text-ink-4">还没有可展示的报道。事件投影补齐后会出现在这里。</p>
            )}
          </EventSection>

          <EventSection title="事实与证据" right={<span>{event.facts.length} 个进展</span>}>
            {event.facts.length ? (
              <ul className="space-y-3">
                {event.facts.map((fact) => (
                  <li key={fact.factId} className="border-l-2 border-line pl-3">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink-4">
                      <span>{monthDayTime(fact.firstReportAt)}</span>
                      <span>·</span>
                      <span>{fact.reportCount} 篇报道</span>
                    </div>
                    <h3 className="mt-1 text-[13.5px] font-semibold leading-snug text-ink">{fact.title}</h3>
                    <p className="mt-1 text-[12px] text-ink-4">代表报道：{fact.representative.title}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-ink-4">这个事件还没有拆出独立事实。</p>
            )}
          </EventSection>
        </div>

        <aside className="space-y-5">
          <EventSection title="三套分数">
            <EventScoreGrid heat={event.heat} newsValue={event.newsValue} recommendation={event.recommendation?.score ?? null} />
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-4">
              热度是基于已采集信源的估计，不等于全网热度；新闻价值沿用 AIHOT 的精选分；选题推荐分由事件级评分单独给出。
            </p>
            {event.recommendation ? (
              <div className="mt-3 border-t border-line-soft pt-3">
                <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
                  <span className="text-ink-4">选题推荐分</span>
                  <Badge tone={scoreTone(event.recommendation.score)}>{scoreText(event.recommendation.score)}</Badge>
                  {event.recommendation.scoredAt && <span className="text-[11.5px] text-ink-4">{monthDayTime(event.recommendation.scoredAt)}</span>}
                </div>
                {event.recommendation.reason && <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">{event.recommendation.reason}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px] text-ink-4">
                  {event.recommendation.column && <Badge tone="info">{event.recommendation.column === "news" ? "推荐资讯" : "推荐洞察"}</Badge>}
                  {event.recommendation.confidence && (
                    <Badge tone={event.recommendation.confidence === "high" ? "ok" : event.recommendation.confidence === "low" ? "warn" : "muted"}>
                      置信度 {event.recommendation.confidence === "high" ? "高" : event.recommendation.confidence === "low" ? "低" : "中"}
                    </Badge>
                  )}
                </div>
                {event.recommendation.angles?.length ? (
                  <div className="mt-2">
                    <div className="text-[12px] text-ink-4">候选角度</div>
                    <ul className="mt-1 space-y-1">
                      {event.recommendation.angles.map((angle) => <li key={angle} className="text-[12.5px] leading-relaxed text-ink-2">· {angle}</li>)}
                    </ul>
                  </div>
                ) : null}
                {Object.keys(event.recommendation.dims).length > 0 && (
                  <dl className="mt-2 flex flex-wrap gap-1.5">
                    {Object.entries(event.recommendation.dims).map(([dim, value]) => (
                      <span key={dim} className="mono rounded-full bg-bg-sunk px-2 py-0.5 text-[11px] text-ink-3">{dim} {Number(value).toFixed(0)}</span>
                    ))}
                  </dl>
                )}
                {event.recommendation.missing.length > 0 && (
                  <p className="mt-2 flex items-start gap-1.5 text-[12px] leading-relaxed text-ink-4">
                    <IconInfo size={13} className="mt-0.5 shrink-0" />
                    资料缺口：{event.recommendation.missing.join("、")}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-3 border-t border-line-soft pt-3 text-[12.5px] text-ink-4">事件还没有评分，评分流水线接入后这里会给出理由。</p>
            )}
          </EventSection>

          <EventSection title="品牌" right={<span>{event.brands.length} 个</span>}>
            {event.brands.length ? (
              <ul className="flex flex-wrap gap-1.5">
                {event.brands.map((brand) => (
                  <li key={brand.id}>
                    <Link
                      to={`/studio/brands/${encodeURIComponent(brand.id)}`}
                      className="inline-flex items-center gap-1 rounded-full bg-bg-sunk px-2.5 py-1 text-[12.5px] text-ink-2 transition-colors hover:bg-bg-sunk hover:text-ink"
                    >
                      {brand.name}
                      {brand.followed && <span className="size-1.5 rounded-full bg-accent" />}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-ink-4">这个事件还没有关联品牌。</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line-soft pt-3 text-[11.5px] text-ink-4">
              {event.channelTypes.map((type) => <Badge key={type} tone="muted">{channelTypeLabel(type)}</Badge>)}
              {event.sourceTiers.map((tier) => <Badge key={tier} tone="muted">{tier}</Badge>)}
            </div>
          </EventSection>

          <EventSection title="已有选题" right={<span>{event.pitchCount} 个</span>}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              {event.pitches.length ? (
                <ul className="min-w-0 flex-1 space-y-2">
                  {event.pitches.map((pitch) => (
                    <li key={pitch.id} className="flex flex-wrap items-center gap-2 text-[12.5px]">
                      <Link to={`/studio/topics/${pitch.id}`} className="min-w-0 flex-1 truncate text-ink-2 hover:text-accent">
                        {pitch.angle || "未填写角度"}
                      </Link>
                      <Badge tone="muted">{pitch.status}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="min-w-0 flex-1 text-[13px] text-ink-4">还没有选题。创建后，这个事件就会变成一件创作任务。</p>
              )}
              <Button tone="primary" onClick={openTopic}>创建选题</Button>
            </div>
          </EventSection>

          <EventSection title="为什么上热">
            <dl className="grid grid-cols-2 gap-2 text-[12.5px]">
              <div>
                <dt className="text-ink-4">48 小时参与方</dt>
                <dd className="mt-0.5 text-ink-2">{event.whyHot.participants48h}</dd>
              </div>
              <div>
                <dt className="text-ink-4">6 小时新增</dt>
                <dd className="mt-0.5 text-ink-2">{event.whyHot.newParticipants6h}</dd>
              </div>
              <div>
                <dt className="text-ink-4">24 小时报道</dt>
                <dd className="mt-0.5 text-ink-2">{event.whyHot.recentReports24h}</dd>
              </div>
              <div>
                <dt className="text-ink-4">榜单排名</dt>
                <dd className="mt-0.5 text-ink-2">{event.whyHot.rank ?? "—"}</dd>
              </div>
            </dl>
            {!event.whyHot.observationComplete && (
              <p className="mt-2 flex items-start gap-1.5 text-[12px] leading-relaxed text-ink-4">
                <IconFlame size={13} className="mt-0.5 shrink-0" />部分信源最近没更新，热度可能偏低。
              </p>
            )}
          </EventSection>
        </aside>
      </div>

      <StudioDialog
        open={topicOpen}
        title="创建选题"
        description="选题会记住此刻的事件与来源，之后事件新增的报道不会改写它。"
        onClose={() => setTopicOpen(false)}
        onSubmit={createTopic}
        busy={pending === "topic-create"}
        submitLabel={event.pitchCount > 0 ? "仍然创建另一个角度" : "创建选题"}
      >
        {event.pitchCount > 0 && (
          <div className="mb-4 rounded-control bg-bg-sunk px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-3">
            这个事件已经有 {event.pitchCount} 个选题。同一事件可以有不同角度的多个选题，确认后再建。
          </div>
        )}
        <Field label="角度" hint="这个选题准备怎么写">
          <Input aria-label="角度" value={angle} onChange={(e) => setAngle(e.target.value)} placeholder="例如：从开发者视角看这次 API 变更" />
        </Field>
        <div className="mt-4">
          <Field label="栏目">
            <Select aria-label="栏目" value={columnType} onChange={(e) => setColumnType(e.target.value as "news" | "insight")}>
              <option value="news">资讯</option>
              <option value="insight">洞察</option>
            </Select>
          </Field>
        </div>
      </StudioDialog>
    </div>
  );
}
