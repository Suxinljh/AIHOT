// One brand's private dossier: identity, follow state, candidate channels and the related-event
// timeline. Edit and merge live here; the list page creates brands and starts a merge too.
import { useState } from "react";
import { Link, useLoaderData, useNavigate, type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { IconArrowLeft, IconClock, IconExternal, IconPlug, IconUsers } from "@aihot/web/components/icons";
import { adminGet } from "@aihot/web/lib/admin.server";
import { Badge, Button, Card, Field, Select, Textarea } from "@aihot/web/features/admin/ui";
import { monthDayTime, relativeTime } from "@aihot/web/lib/format";
import type { BrandDetail, BrandFollow, BrandListItem, BrandMergeResult } from "../studio-types.ts";
import { STUDIO_PRODUCT, studioMeta } from "./studio-nav";
import { useStudioAction } from "./studio-action";
import {
  BrandAvatar,
  BrandFormFields,
  EmptyPanel,
  IndustryBadges,
  StudioDialog,
  availabilityLabel,
  availabilityTone,
  brandDraft,
  brandPayload,
  channelTypeLabel,
  eventVerificationLabel,
  eventVerificationTone,
  followFrequencyLabel,
  followRuleLabel,
  hostOf,
  industryLabel,
  verificationLabel,
  verificationTone,
  type BrandDraft,
} from "./studio-brand-ui";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const id = params.id;
  if (!id) throw new Response("Not Found", { status: 404 });
  const [brand, all] = await Promise.all([
    adminGet<BrandDetail>(request, `/api/studio/brands/${encodeURIComponent(id)}`),
    adminGet<{ items: BrandListItem[] }>(request, "/api/studio/brands"),
  ]);
  return { brand, all: all.items };
}

export const meta: MetaFunction = () => studioMeta("品牌详情");

function FollowDetails({ follow }: { follow: BrandFollow }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">已关注</Badge>
        <span className="text-[12.5px] font-medium text-ink-2">{followRuleLabel(follow.rule)}</span>
        <Badge tone={follow.notify ? "ok" : "muted"}>{follow.notify ? "通知开启" : "通知关闭"}</Badge>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-[12.5px]">
        <div>
          <dt className="text-ink-4">通知频率</dt>
          <dd className="mt-0.5 text-ink-2">{followFrequencyLabel(follow.frequency)}</dd>
        </div>
        <div>
          <dt className="text-ink-4">静音</dt>
          <dd className="mt-0.5 text-ink-2">{follow.mutedUntil ? `至 ${monthDayTime(follow.mutedUntil)}` : "无"}</dd>
        </div>
      </dl>
      <div>
        <div className="text-[12px] text-ink-4">关键词</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {follow.keywords.length ? follow.keywords.map((keyword) => <Badge key={keyword} tone="muted">{keyword}</Badge>) : <span className="text-[12.5px] text-ink-4">—</span>}
        </div>
      </div>
      <div>
        <div className="text-[12px] text-ink-4">屏蔽词</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {follow.blockedKeywords.length ? follow.blockedKeywords.map((keyword) => <Badge key={keyword} tone="warn">{keyword}</Badge>) : <span className="text-[12.5px] text-ink-4">—</span>}
        </div>
      </div>
      <div>
        <div className="text-[12px] text-ink-4">事件类型</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {follow.eventTypes.length ? follow.eventTypes.map((type) => <span key={type} className="mono rounded-full bg-bg-sunk px-2 py-0.5 text-[11px] text-ink-3">{type}</span>) : <span className="text-[12.5px] text-ink-4">全部</span>}
        </div>
      </div>
    </div>
  );
}

export default function StudioBrand() {
  const { brand, all } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { run, pending } = useStudioAction();
  const targets = all.filter((item) => item.id !== brand.id);

  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState<BrandDraft>(() => brandDraft(brand));
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeInto, setMergeInto] = useState("");
  const [mergeReason, setMergeReason] = useState("合并重复品牌");

  function openEdit() {
    setDraft(brandDraft(brand));
    setEditOpen(true);
  }

  async function saveBrand() {
    const updated = await run<BrandDetail>("PATCH", `/api/studio/brands/${encodeURIComponent(brand.id)}`, {
      ...brandPayload(draft),
      version: brand.updatedAt,
    }, {
      label: "brand-edit",
      success: "品牌资料已保存",
    });
    if (updated) setEditOpen(false);
  }

  function openMerge() {
    setMergeInto("");
    setMergeReason("合并重复品牌");
    setMergeOpen(true);
  }

  async function mergeBrand() {
    if (!mergeInto) return;
    const merged = await run<BrandMergeResult>("POST", `/api/studio/brands/${encodeURIComponent(brand.id)}/merge`, {
      into: mergeInto,
      reason: mergeReason.trim() || undefined,
    }, {
      label: "brand-merge",
      success: "品牌已合并",
    });
    if (!merged) return;
    setMergeOpen(false);
    navigate(`/studio/brands/${encodeURIComponent(merged.brand.id)}`);
  }

  return (
    <div>
      <Link to="/studio/brands" className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-4 transition-colors hover:text-ink">
        <IconArrowLeft size={14} />品牌库
      </Link>

      <header className="mt-3 rounded-panel bg-surface p-5 ring-1 ring-line lg:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <BrandAvatar brand={brand} size={64} />
            <div className="min-w-0">
              <div className="mono text-[10px] uppercase tracking-[0.16em] text-ink-4">{STUDIO_PRODUCT} / 品牌档案 / {brand.id}</div>
              <h1 className="mt-1.5 text-[26px] font-black leading-[1.15] tracking-[-0.03em] text-ink sm:text-[32px]">{brand.name}</h1>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-3">
                {brand.aliases.length ? `别名：${brand.aliases.join("、")}` : "还没有别名"}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <IndustryBadges industries={brand.industries} />
                <Badge tone={verificationTone(brand.verifiedStatus)}>{verificationLabel(brand.verifiedStatus)}</Badge>
                <Badge tone={brand.followed ? "accent" : "muted"}>{brand.followed ? "已关注" : "未关注"}</Badge>
              </div>
              <p className="mt-2 text-[11.5px] text-ink-4">{brand.counts.events} 个相关事件 · {brand.counts.channels} 个候选渠道</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button tone="secondary" onClick={openEdit}>编辑资料</Button>
            <Button tone="primary" onClick={openMerge} disabled={!targets.length} title={!targets.length ? "没有其他品牌可以合并" : undefined}>合并品牌</Button>
          </div>
        </div>

        <p className="mt-5 max-w-[72em] text-[13px] leading-[1.8] text-ink-2">
          {brand.notes || "还没有备注。编辑资料可以记录品牌的产品线、判断依据或需要继续确认的信息。"}
        </p>

        <dl className="mt-5 grid gap-4 border-t border-line-soft pt-4 text-[12.5px] sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-ink-4">官网</dt>
            <dd className="mt-0.5 truncate text-ink-2">
              {brand.website ? (
                <a href={brand.website} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 text-accent hover:underline">
                  <span className="truncate">{hostOf(brand.website)}</span><IconExternal size={12} className="shrink-0" />
                </a>
              ) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-ink-4">实体 ID</dt>
            <dd className="mono mt-0.5 truncate text-ink-2">{brand.entityId ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-ink-4">创建</dt>
            <dd className="mt-0.5 text-ink-2">{monthDayTime(brand.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-ink-4">最近更新</dt>
            <dd className="mt-0.5 text-ink-2" title={monthDayTime(brand.updatedAt)}>{relativeTime(brand.updatedAt)}</dd>
          </div>
        </dl>
      </header>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <Card title="相关事件" right={<span>{brand.counts.events} 个</span>} pad={false}>
            {brand.events.length ? (
              <ol className="px-4 py-4">
                {brand.events.map((event, index) => {
                  const at = event.latestAt ?? event.firstReportAt;
                  return (
                    <li key={event.storyId} className="relative flex gap-3 pb-5 last:pb-0">
                      {index < brand.events.length - 1 && <span className="absolute left-[5px] top-3 h-full w-px bg-line" />}
                      <span className="relative z-10 mt-1 size-2.5 shrink-0 rounded-full bg-accent ring-4 ring-surface" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink-4">
                          <span>{at ? monthDayTime(at) : "时间待确认"}</span>
                          <span>·</span>
                          <span>{event.reportCount} 篇报道</span>
                          <span>·</span>
                          <span>{event.sourceCount} 个来源</span>
                          <Badge tone={eventVerificationTone(event.verificationStatus)}>{eventVerificationLabel(event.verificationStatus)}</Badge>
                        </div>
                        <h3 className="mt-1 text-[14px] font-semibold leading-snug text-ink">{event.title}</h3>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {event.categories.map((category) => <Badge key={category} tone="muted">{industryLabel(category)}</Badge>)}
                          {event.eventType && <span className="mono text-[10.5px] text-ink-4">{event.eventType}</span>}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="p-4">
                <EmptyPanel
                  icon={IconClock}
                  title="还没有关联事件"
                  body="事件投影会按品牌名和别名把报道归到这里。品牌名越准确、别名越完整，归组越可靠。"
                />
              </div>
            )}
            {brand.counts.events > brand.events.length && (
              <p className="border-t border-line-soft px-4 py-2.5 text-[11.5px] text-ink-4">只显示最近 {brand.events.length} 个事件，共 {brand.counts.events} 个。</p>
            )}
          </Card>
        </div>

        <aside className="space-y-5">
          <Card title="关注状态">
            {brand.follow ? (
              <FollowDetails follow={brand.follow} />
            ) : (
              <EmptyPanel
                icon={IconUsers}
                title="还没有关注这个品牌"
                body="关注后，符合规则的更新会进入热点发现。关注规则和通知频率会在后续接入。"
              />
            )}
          </Card>

          <Card title="候选渠道" right={<span>{brand.counts.channels} 个</span>} pad={false}>
            {brand.channels.length ? (
              <ul className="divide-y divide-line">
                {brand.channels.map((channel) => (
                  <li key={channel.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[13px] font-medium text-ink">{channel.displayName}</span>
                      <Badge tone="muted">{channelTypeLabel(channel.type)}</Badge>
                      <Badge tone={verificationTone(channel.verification)}>{verificationLabel(channel.verification)}</Badge>
                      <Badge tone={availabilityTone(channel.availability)}>{availabilityLabel(channel.availability)}</Badge>
                    </div>
                    <a href={channel.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1 text-[12px] text-accent hover:underline">
                      <span className="truncate">{hostOf(channel.url)}</span><IconExternal size={12} className="shrink-0" />
                    </a>
                    {channel.note && <p className="mt-1.5 text-[12px] leading-relaxed text-ink-3">{channel.note}</p>}
                    {channel.provider && <div className="mono mt-1.5 text-[10.5px] text-ink-4">{channel.provider}{channel.sourceId ? ` · ${channel.sourceId}` : ""}</div>}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4">
                <EmptyPanel
                  icon={IconPlug}
                  title="还没有候选渠道"
                  body="关注品牌后，从官网、X、公众号和 GitHub 发现的候选渠道会显示在这里。"
                />
              </div>
            )}
          </Card>
        </aside>
      </div>

      <StudioDialog
        open={editOpen}
        title="编辑品牌"
        description="名称、别名和行业会影响搜索、事件归组和选题筛选。"
        onClose={() => setEditOpen(false)}
        onSubmit={saveBrand}
        busy={pending === "brand-edit"}
        submitLabel="保存"
        submitDisabled={!draft.name.trim()}
      >
        <BrandFormFields draft={draft} setDraft={setDraft} autoFocus />
      </StudioDialog>

      <StudioDialog
        open={mergeOpen}
        title="合并品牌"
        description={`当前品牌「${brand.name}」会被并入存活品牌。别名、渠道、事件关系和关注状态会一起迁移，当前品牌随后删除。`}
        onClose={() => setMergeOpen(false)}
        onSubmit={mergeBrand}
        busy={pending === "brand-merge"}
        submitLabel="确认合并"
        submitDisabled={!mergeInto}
        danger
      >
        <Field label="存活品牌" hint="保留这个品牌及其详情页">
          <Select value={mergeInto} onChange={(event) => setMergeInto(event.target.value)}>
            <option value="">选择存活品牌</option>
            {targets.map((target) => <option key={target.id} value={target.id}>{target.name}（{target.id}）</option>)}
          </Select>
        </Field>
        <div className="mt-4">
          <Field label="合并原因" hint="会写入审计日志，可选">
            <Textarea value={mergeReason} onChange={(event) => setMergeReason(event.target.value)} rows={3} placeholder="例如：同一个公司的中英文名重复建档" />
          </Field>
        </div>
        <div className="mt-4 rounded-control bg-bg-sunk px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-3">
          原始报道与渠道本身不会被删除；合并后如果发现归组有误，可以在存活品牌的详情页继续调整。
        </div>
      </StudioDialog>
    </div>
  );
}
