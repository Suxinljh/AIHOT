// One source's page: its health, its recent runs, its latest items and the same commands the list
// offers. The studio shows the engine's own state and never keeps a second copy of it.
import { Link, useLoaderData, type LoaderFunctionArgs, type MetaFunction } from "react-router";
import type { AdminSourceDetail } from "@aihot/contracts/admin";
import { IconArrowLeft, IconClock } from "@aihot/web/components/icons";
import { adminGet } from "@aihot/web/lib/admin.server";
import { Badge } from "@aihot/web/features/admin/ui";
import { monthDayTime, relativeTime } from "@aihot/web/lib/format";
import { STUDIO_PRODUCT, studioMeta } from "./studio-nav";
import { SourceBadges, SourceCommands, SourcePreviewPanel, sourceHealthLabel, sourceHealthTone, useSourceActions } from "./studio-source-ui";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const id = params.id;
  if (!id) throw new Response("Not Found", { status: 404 });
  return { source: await adminGet<AdminSourceDetail>(request, `/api/admin/sources/${encodeURIComponent(id)}`) };
}

export const meta: MetaFunction = () => studioMeta("信源详情");

const RUN_LABEL: Record<string, string> = { ok: "成功", failed: "失败", skipped: "跳过" };

export default function StudioSource() {
  const { source } = useLoaderData<typeof loader>();
  const actions = useSourceActions();
  const row = source.source;

  return (
    <div>
      <Link to="/studio/sources" className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-4 transition-colors hover:text-ink">
        <IconArrowLeft size={14} />关注与信源
      </Link>

      <header className="mt-3 rounded-panel bg-surface p-5 ring-1 ring-line lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mono text-[10px] uppercase tracking-[0.16em] text-ink-4">{STUDIO_PRODUCT} / 信源详情 / {row.id}</div>
            <h1 className="mt-2 text-[24px] font-black leading-[1.25] tracking-[-0.03em] text-ink sm:text-[30px]">{row.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <SourceBadges source={row} />
              <Badge tone={sourceHealthTone(row)}>{sourceHealthLabel(row)}</Badge>
              {row.fail_count > 0 && <Badge tone="bad">失败 {row.fail_count} 次</Badge>}
            </div>
          </div>
          <SourceCommands source={row} actions={actions} version={row.updated_at} className="shrink-0" />
        </div>

        {row.last_error && (
          <p className="mt-4 rounded-control bg-bg-sunk px-3 py-2 text-[12.5px] leading-relaxed text-hot">{row.last_error}</p>
        )}

        <dl className="mt-4 grid gap-3 border-t border-line-soft pt-4 text-[12.5px] sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-ink-4">上次成功</dt>
            <dd className="mt-0.5 text-ink-2">{row.last_ok_at ? relativeTime(row.last_ok_at) : "还没有"}</dd>
          </div>
          <div>
            <dt className="text-ink-4">上次抓取</dt>
            <dd className="mt-0.5 text-ink-2">{row.last_fetch_at ? relativeTime(row.last_fetch_at) : "还没有"}</dd>
          </div>
          <div>
            <dt className="text-ink-4">下次抓取</dt>
            <dd className="mt-0.5 text-ink-2">{row.enabled && row.next_fetch_at ? relativeTime(row.next_fetch_at) : "已暂停"}</dd>
          </div>
          <div>
            <dt className="text-ink-4">条目 / 精选</dt>
            <dd className="mt-0.5 text-ink-2">{source.stats.total} 条 · {source.stats.selected} 条精选</dd>
          </div>
        </dl>
      </header>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="min-w-0 rounded-panel bg-surface p-4 ring-1 ring-line sm:p-5">
          <h2 className="text-[14px] font-semibold text-ink">最近抓取记录</h2>
          {source.runs.length ? (
            <ul className="mt-3 space-y-2">
              {source.runs.map((run) => (
                <li key={run.id} className="rounded-control bg-bg-sunk px-3 py-2">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink-4">
                    <span className="inline-flex items-center gap-1"><IconClock size={12} />{monthDayTime(run.started_at)}</span>
                    <Badge tone={run.status === "ok" ? "ok" : run.status === "failed" ? "bad" : "muted"}>{RUN_LABEL[run.status] ?? run.status}</Badge>
                    <span>发现 {run.found_count} · 新增 {run.new_count}</span>
                  </div>
                  {run.error && <p className="mt-1 break-words text-[12px] leading-relaxed text-hot">{run.error}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[13px] text-ink-4">还没有抓取记录。</p>
          )}
        </section>

        <section className="min-w-0 rounded-panel bg-surface p-4 ring-1 ring-line sm:p-5">
          <h2 className="text-[14px] font-semibold text-ink">最近条目</h2>
          {source.items.length ? (
            <ul className="mt-3 space-y-2">
              {source.items.map((item) => (
                <li key={item.id} className="rounded-control bg-bg-sunk px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{item.title}</span>
                    {item.selected && <Badge tone="accent">精选</Badge>}
                    {item.visibility === "public" ? null : <Badge tone="muted">{item.visibility}</Badge>}
                  </div>
                  <div className="mono mt-0.5 text-[11px] text-ink-4">{monthDayTime(item.discovered_at)}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[13px] text-ink-4">这个信源还没有取到条目。</p>
          )}
        </section>
      </div>

      <SourcePreviewPanel preview={actions.preview} onClose={actions.closePreview} />
    </div>
  );
}
