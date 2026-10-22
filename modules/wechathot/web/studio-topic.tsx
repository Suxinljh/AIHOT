// One topic: the angle, the notes, the event it came from and the source snapshot taken when it was
// created. The snapshot only changes when the editor refreshes it.
import { useEffect, useState } from "react";
import { Link, useLoaderData, useNavigate, useRevalidator, type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { IconArrowLeft, IconExternal, IconHistory } from "@aihot/web/components/icons";
import { adminGet } from "@aihot/web/lib/admin.server";
import { Badge, Button, Field, Input, Select, Textarea } from "@aihot/web/features/admin/ui";
import { fullDateTime, monthDayTime, relativeTime } from "@aihot/web/lib/format";
import type { StudioPresets, StudioTopic, TopicOutlineSection, TopicStatus } from "../studio-types.ts";
import { STUDIO_PRODUCT, studioMeta } from "./studio-nav";
import { useStudioAction } from "./studio-action";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const id = params.id;
  if (!id) throw new Response("Not Found", { status: 404 });
  const [topic, presets] = await Promise.all([
    adminGet<StudioTopic>(request, `/api/studio/topics/${encodeURIComponent(id)}`),
    adminGet<StudioPresets>(request, "/api/studio/presets"),
  ]);
  return { topic, presets: presets.writing };
}

export const meta: MetaFunction = () => studioMeta("选题详情");

const STATUS_LABEL: Record<TopicStatus, string> = {
  pending: "待评估",
  researching: "待研究",
  ready: "待写作",
  writing: "写作中",
  done: "已完成",
  ignored: "已忽略",
  archived: "归档",
};
const NEXT_STATUS: Partial<Record<TopicStatus, TopicStatus>> = {
  pending: "researching",
  researching: "ready",
  ready: "writing",
  writing: "done",
  done: "archived",
  ignored: "pending",
  archived: "pending",
};

export default function StudioTopic() {
  const { topic, presets } = useLoaderData<typeof loader>();
  const { run, pending } = useStudioAction();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const [angle, setAngle] = useState(topic.angle ?? "");
  const [notes, setNotes] = useState(topic.notes ?? "");
  const [columnType, setColumnType] = useState<"news" | "insight">(topic.columnType);
  const [outline, setOutline] = useState<TopicOutlineSection[]>(topic.writing?.outline?.sections ?? []);

  // The writing steps run in the queue: while one is pending, this page refreshes itself.
  const writingState = topic.writing?.state;
  useEffect(() => {
    if (writingState?.status !== "pending") return;
    const timer = setTimeout(() => revalidator.revalidate(), 2500);
    return () => clearTimeout(timer);
  }, [writingState?.status, writingState?.at, revalidator]);

  function setOutlineSection(index: number, section: TopicOutlineSection) {
    setOutline(outline.map((item, position) => (position === index ? section : item)));
  }

  async function save() {
    await run("PATCH", `/api/studio/topics/${topic.id}`, { angle: angle.trim() || null, notes: notes.trim() || null, columnType }, {
      label: `topic-save-${topic.id}`,
      success: "选题已保存",
    });
  }

  async function setStatus(status: TopicStatus) {
    await run("PATCH", `/api/studio/topics/${topic.id}`, { status }, { label: `topic-${topic.id}`, success: `已移到${STATUS_LABEL[status]}` });
  }

  return (
    <div>
      <Link to="/studio/topics" className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-4 transition-colors hover:text-ink">
        <IconArrowLeft size={14} />选题管理
      </Link>

      <header className="mt-3 rounded-panel bg-surface p-5 ring-1 ring-line lg:p-6">
        <div className="mono text-[10px] uppercase tracking-[0.16em] text-ink-4">{STUDIO_PRODUCT} / 选题详情 / #{topic.id}</div>
        <h1 className="mt-2 text-[24px] font-black leading-[1.25] tracking-[-0.03em] text-ink sm:text-[30px]">
          {topic.angle || topic.eventTitle || "未命名选题"}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge tone={topic.columnType === "insight" ? "info" : "muted"}>{topic.columnType === "insight" ? "洞察" : "资讯"}</Badge>
          <Badge tone="accent">{STATUS_LABEL[topic.status]}</Badge>
          {topic.event && (
            <Link to={`/studio/events/${encodeURIComponent(topic.event.publicId)}`} className="inline-flex items-center gap-1 text-[12.5px] text-accent hover:underline">
              {topic.event.title}<IconExternal size={12} />
            </Link>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line-soft pt-4">
          {NEXT_STATUS[topic.status] && (
            <Button tone="primary" busy={pending === `topic-${topic.id}`} onClick={() => setStatus(NEXT_STATUS[topic.status]!)}>
              移到{STATUS_LABEL[NEXT_STATUS[topic.status]!]}
            </Button>
          )}
          <Button
            tone="secondary"
            busy={pending === `topic-article-${topic.id}`}
            onClick={async () => {
              const article = await run<{ id: number }>("POST", `/api/studio/topics/${topic.id}/article`, { mode: "step" }, {
                label: `topic-article-${topic.id}`,
                success: "稿件已创建",
              });
              if (article) navigate(`/studio/articles/${article.id}`);
            }}
          >
            创建稿件
          </Button>
          {topic.status !== "ignored" && <Button tone="secondary" onClick={() => setStatus("ignored")}>忽略</Button>}
          {topic.status !== "archived" && <Button tone="ghost" onClick={() => setStatus("archived")}>归档</Button>}
          <span className="text-[11.5px] text-ink-4">创建于 {monthDayTime(topic.createdAt)}，更新于 {relativeTime(topic.updatedAt)}</span>
        </div>
      </header>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <section className="rounded-panel bg-surface p-4 ring-1 ring-line sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[14px] font-semibold text-ink">候选角度与大纲</h2>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  tone="secondary"
                  busy={pending === `topic-angles-${topic.id}`}
                  onClick={() => run("POST", `/api/studio/topics/${topic.id}/angles`, undefined, { label: `topic-angles-${topic.id}`, success: "角度生成中" })}
                >
                  {topic.writing?.angles?.length ? "重新生成角度" : "生成角度"}
                </Button>
                <Button
                  size="sm"
                  tone="primary"
                  disabled={!topic.angle}
                  busy={pending === `topic-outline-${topic.id}`}
                  onClick={() => run("POST", `/api/studio/topics/${topic.id}/outline`, undefined, { label: `topic-outline-${topic.id}`, success: "大纲生成中" })}
                >
                  {topic.writing?.outline ? "重新生成大纲" : "生成大纲"}
                </Button>
              </div>
            </div>

            {topic.writing?.state?.status === "pending" && (
              <p className="mt-2 text-[12.5px] text-ink-3">正在生成，完成后这一页会自动更新。</p>
            )}
            {topic.writing?.state?.status === "failed" && (
              <p className="mt-2 rounded-control bg-bg-sunk px-3 py-2 text-[12.5px] leading-relaxed text-hot">
                上一次生成失败：{topic.writing.state.error ?? "未知原因"}。可以再点一次重试。
              </p>
            )}

            {topic.writing?.angles?.length ? (
              <ul className="mt-3 space-y-2">
                {topic.writing.angles.map((angle) => (
                  <li key={angle.title} className="rounded-control bg-bg-sunk px-3 py-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <span className="min-w-0 flex-1 text-[13px] font-medium text-ink">{angle.title}</span>
                      {topic.angle === angle.title
                        ? <Badge tone="accent">已选</Badge>
                        : (
                          <Button
                            size="sm"
                            tone="secondary"
                            busy={pending === `topic-angle-${topic.id}`}
                            onClick={() => run("PATCH", `/api/studio/topics/${topic.id}`, { angle: angle.title }, { label: `topic-angle-${topic.id}`, success: "已选定这个角度" })}
                          >
                            选用
                          </Button>
                        )}
                    </div>
                    <p className="mt-1 text-[12px] leading-relaxed text-ink-3">{angle.reason}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[13px] text-ink-4">还没有候选角度。先生成几个，再选一个继续。</p>
            )}

            {topic.writing?.outline && (
              <div className="mt-4 border-t border-line pt-3">
                <h3 className="text-[13px] font-semibold text-ink">大纲</h3>
                {topic.writing.outline.sections.map((section, index) => (
                  <div key={`${section.title}-${index}`} className="mt-2 rounded-control bg-bg-sunk px-3 py-2">
                    <Input
                      aria-label={`第 ${index + 1} 节标题`}
                      value={section.title}
                      onChange={(event) => setOutlineSection(index, { ...section, title: event.target.value })}
                    />
                    <Textarea
                      aria-label={`第 ${index + 1} 节要点`}
                      className="mt-2"
                      rows={Math.max(2, section.points.length)}
                      value={section.points.join("\n")}
                      onChange={(event) => setOutlineSection(index, { ...section, points: event.target.value.split("\n").map((point) => point.trim()).filter(Boolean) })}
                    />
                  </div>
                ))}
                {topic.writing.outline.note && <p className="mt-2 text-[12px] leading-relaxed text-ink-4">提醒：{topic.writing.outline.note}</p>}
                <div className="mt-3 flex justify-end">
                  <Button
                    tone="primary"
                    busy={pending === `topic-outline-save-${topic.id}`}
                    onClick={() => run("PATCH", `/api/studio/topics/${topic.id}`, { outline: { sections: outline, note: topic.writing?.outline?.note ?? "" } }, {
                      label: `topic-outline-save-${topic.id}`,
                      success: "大纲已保存",
                    })}
                  >
                    保存大纲
                  </Button>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-panel bg-surface p-4 ring-1 ring-line sm:p-5">
            <h2 className="text-[14px] font-semibold text-ink">角度与备注</h2>
            <div className="mt-3 space-y-4">
              <Field label="角度" hint="这个选题准备怎么写">
                <Input aria-label="角度" value={angle} onChange={(event) => setAngle(event.target.value)} placeholder="例如：从开发者视角看这次 API 变更" />
              </Field>
              <Field label="栏目">
                <Select aria-label="栏目" value={columnType} onChange={(event) => setColumnType(event.target.value as "news" | "insight")}>
                  <option value="news">资讯</option>
                  <option value="insight">洞察</option>
                </Select>
              </Field>
              <Field label="备注" hint="给自己看的提醒">
                <Textarea aria-label="备注" value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} placeholder="可选" />
              </Field>
              <div className="flex justify-end">
                <Button tone="primary" busy={pending === `topic-save-${topic.id}`} onClick={save}>保存</Button>
              </div>
            </div>
          </section>

          <section className="rounded-panel bg-surface p-4 ring-1 ring-line sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[14px] font-semibold text-ink">来源快照</h2>
              <Button
                size="sm"
                tone="secondary"
                busy={pending === `topic-refresh-${topic.id}`}
                onClick={() => run("POST", `/api/studio/topics/${topic.id}/refresh-snapshot`, undefined, { label: `topic-refresh-${topic.id}`, success: "来源快照已刷新" })}
              >
                <IconHistory size={13} />刷新快照
              </Button>
            </div>
            {topic.snapshot ? (
              <>
                <p className="mt-2 text-[11.5px] text-ink-4">
                  快照时间 {fullDateTime(topic.snapshot.capturedAt)}；事件后来的新报道不会自动改写它。
                </p>
                {topic.snapshot.summary && <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{topic.snapshot.summary}</p>}
                {topic.snapshot.reports.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {topic.snapshot.reports.map((report) => (
                      <li key={report.id} className="rounded-control bg-bg-sunk px-3 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">{report.title}</span>
                          <span className="shrink-0 text-[11.5px] text-ink-4">{report.source}</span>
                          <a href={report.url} target="_blank" rel="noreferrer" className="shrink-0 text-[11.5px] text-accent hover:underline">原文</a>
                        </div>
                        <div className="mono mt-0.5 text-[10.5px] text-ink-4">{monthDayTime(report.publishedAt)}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="mt-2 text-[13px] text-ink-4">这个选题还没有来源快照。</p>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-panel bg-surface p-4 ring-1 ring-line">
            <h2 className="text-[14px] font-semibold text-ink">写作风格</h2>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-4">
              默认套用「{topic.columnType === "insight" ? "洞察" : "资讯"}」栏目对应的预设；换用只影响这个选题，预设本身不变。
            </p>
            <div className="mt-3">
              <Select
                aria-label="写作风格"
                value={topic.stylePresetId ?? ""}
                onChange={(event) => run("PATCH", `/api/studio/topics/${topic.id}/preset`, { presetId: event.target.value || null }, {
                  label: `topic-preset-${topic.id}`,
                  success: "写作风格已更新",
                })}
              >
                <option value="">跟随栏目默认（{topic.stylePreset?.name ?? "无"}）</option>
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>{preset.name}{preset.builtin ? "（内置）" : ""}</option>
                ))}
              </Select>
            </div>
            {topic.stylePreset && (
              <dl className="mt-3 space-y-2 border-t border-line-soft pt-3 text-[12px]">
                {topic.stylePreset.targetReader && (
                  <div>
                    <dt className="text-ink-4">目标读者</dt>
                    <dd className="mt-0.5 text-ink-2">{topic.stylePreset.targetReader}</dd>
                  </div>
                )}
                {topic.stylePreset.wordCount && (
                  <div>
                    <dt className="text-ink-4">目标字数</dt>
                    <dd className="mt-0.5 text-ink-2">约 {topic.stylePreset.wordCount} 字</dd>
                  </div>
                )}
                {topic.stylePreset.tone && (
                  <div>
                    <dt className="text-ink-4">语气</dt>
                    <dd className="mt-0.5 text-ink-2">{topic.stylePreset.tone}</dd>
                  </div>
                )}
              </dl>
            )}
          </section>

          <section className="rounded-panel bg-surface p-4 ring-1 ring-line">
            <h2 className="text-[14px] font-semibold text-ink">事件</h2>
            {topic.event ? (
              <dl className="mt-3 space-y-2 text-[12.5px]">
                <div>
                  <dt className="text-ink-4">核实状态</dt>
                  <dd className="mt-0.5 text-ink-2">{topic.event.verificationStatus === "confirmed" ? "已确认" : topic.event.verificationStatus === "disputed" ? "存在争议" : "待核实"}</dd>
                </div>
                <div>
                  <dt className="text-ink-4">热度</dt>
                  <dd className="mt-0.5 text-ink-2">{topic.event.heat ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-ink-4">选题推荐分</dt>
                  <dd className="mt-0.5 text-ink-2">{topic.event.recommendationScore ?? "待评分"}</dd>
                </div>
                <div>
                  <dt className="text-ink-4">最近更新</dt>
                  <dd className="mt-0.5 text-ink-2">{topic.event.latestAt ? relativeTime(topic.event.latestAt) : "—"}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-[13px] text-ink-4">这个事件已经不在了。</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
