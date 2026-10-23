// The publishing calendar: topics and drafts by the day the editor plans to publish them. It is a
// plan only — nothing here publishes to 公众号.
import { Link, useLoaderData, useSearchParams, type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { adminGet } from "@aihot/web/lib/admin.server";
import { Badge } from "@aihot/web/features/admin/ui";
import type { StudioCalendar } from "../calendar.ts";
import type { StudioTopic } from "../studio-types.ts";
import { STUDIO_PRODUCT, studioMeta } from "./studio-nav";
import { useStudioAction } from "./studio-action";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const month = url.searchParams.get("month") ?? "";
  const query = month ? `?month=${encodeURIComponent(month)}` : "";
  return { calendar: await adminGet<StudioCalendar>(request, `/api/studio/calendar${query}`) };
}

export const meta: MetaFunction = () => studioMeta("发布日历");

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
const TOPIC_STATUS: Record<StudioTopic["status"], string> = {
  pending: "待评估", researching: "待研究", ready: "待写作", writing: "写作中", done: "已完成", ignored: "已忽略", archived: "归档",
};

/** Beijing-time day key for an ISO instant. */
function dayKey(iso: string): string {
  const date = new Date(new Date(iso).getTime() + 8 * 3600_000);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function monthGrid(month: string): Array<{ key: string; day: number }> {
  const [year, monthNumber] = month.split("-").map(Number) as [number, number];
  const first = new Date(Date.UTC(year, monthNumber - 1, 1, 12));
  const days = new Date(Date.UTC(year, monthNumber, 0, 12)).getUTCDate();
  const lead = first.getUTCDay();
  const cells: Array<{ key: string; day: number }> = [];
  for (let index = 0; index < lead; index += 1) cells.push({ key: "", day: 0 });
  for (let day = 1; day <= days; day += 1) {
    cells.push({ key: `${year}-${String(monthNumber).padStart(2, "0")}-${String(day).padStart(2, "0")}`, day });
  }
  while (cells.length % 7) cells.push({ key: "", day: 0 });
  return cells;
}

function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number) as [number, number];
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default function StudioCalendarPage() {
  const { calendar } = useLoaderData<typeof loader>();
  const [, setParams] = useSearchParams();
  const { run, pending } = useStudioAction();

  const byDay = new Map<string, Array<{ kind: "topic" | "article"; id: number; title: string; status: string }>>();
  for (const topic of calendar.topics) {
    if (!topic.plannedFor) continue;
    const key = dayKey(topic.plannedFor);
    byDay.set(key, [...(byDay.get(key) ?? []), { kind: "topic", id: topic.id, title: topic.eventTitle ?? topic.angle ?? `选题 #${topic.id}`, status: TOPIC_STATUS[topic.status] }]);
  }
  for (const article of calendar.articles) {
    if (!article.plannedFor) continue;
    const key = dayKey(article.plannedFor);
    byDay.set(key, [...(byDay.get(key) ?? []), { kind: "article", id: article.id, title: article.title || `稿件 #${article.id}`, status: article.status === "draft" ? "草稿" : article.status === "review" ? "待审" : article.status === "done" ? "已完成" : "归档" }]);
  }

  function move(kind: "topic" | "article", id: number, day: string) {
    const plannedFor = day ? `${day}T09:00:00+08:00` : null;
    const path = kind === "topic" ? `/api/studio/topics/${id}` : `/api/studio/articles/${id}`;
    return run("PATCH", path, { plannedFor }, { label: `calendar-${kind}-${id}`, success: "排期已更新" });
  }

  const cells = monthGrid(calendar.month);

  return (
    <div>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mono text-[11px] uppercase tracking-[0.18em] text-ink-4">{STUDIO_PRODUCT} / Studio</div>
          <h1 className="mt-2 text-[28px] font-black leading-[1.2] tracking-[-0.03em] text-ink sm:text-[34px]">发布日历</h1>
          <p className="mt-3 max-w-[52em] text-[14px] leading-[1.8] text-ink-3">
            按计划日查看选题和稿件。日历只做排期，发布仍然手动。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/calendar?month=${shiftMonth(calendar.month, -1)}`} className="rounded-control bg-surface px-3 py-1.5 text-[12.5px] text-ink-2 ring-1 ring-line hover:bg-bg-sunk">上一月</Link>
          <span className="mono text-[13px] text-ink">{calendar.month}</span>
          <Link to={`/calendar?month=${shiftMonth(calendar.month, 1)}`} className="rounded-control bg-surface px-3 py-1.5 text-[12.5px] text-ink-2 ring-1 ring-line hover:bg-bg-sunk">下一月</Link>
        </div>
      </header>

      {byDay.size === 0 ? (
        <section className="mt-6 rounded-panel border border-dashed border-line-strong bg-surface/60 px-5 py-12 text-center sm:px-8 sm:py-16">
          <h2 className="text-[17px] font-semibold text-ink">这个月还没有排期</h2>
          <p className="mx-auto mt-2 max-w-[38em] text-[13.5px] leading-[1.8] text-ink-3">
            在选题或稿件上设置计划日期后，它们会出现在这里。也可以直接在某一天下面改日期。
          </p>
          <div className="mt-4 flex justify-center gap-3 text-[13px]">
            <Link to="/topics" className="text-accent hover:underline">去选题管理</Link>
            <Link to="/articles" className="text-accent hover:underline">去我的文章</Link>
          </div>
        </section>
      ) : (
        <>
          <div className="mt-5 hidden overflow-hidden rounded-panel border border-line bg-surface sm:block">
            <div className="grid grid-cols-7 border-b border-line bg-bg-sunk/60">
              {WEEKDAYS.map((label) => <div key={label} className="px-2 py-2 text-center text-[11.5px] text-ink-4">{label}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((cell, index) => (
                <div key={`${cell.key}-${index}`} className={`min-h-[112px] border-b border-r border-line p-2 ${cell.key ? "" : "bg-bg-sunk/30"}`}>
                  {cell.key && (
                    <>
                      <div className="mono text-[11px] text-ink-4">{cell.day}</div>
                      <div className="mt-1 space-y-1">
                        {(byDay.get(cell.key) ?? []).map((item) => (
                          <div key={`${item.kind}-${item.id}`} className="rounded-control bg-bg-sunk px-1.5 py-1">
                            <Link to={item.kind === "topic" ? `/topics/${item.id}` : `/articles/${item.id}`} className="block truncate text-[11.5px] text-ink hover:text-accent">
                              {item.title}
                            </Link>
                            <div className="mt-0.5 flex items-center justify-between gap-1">
                              <Badge tone={item.kind === "topic" ? "info" : "muted"}>{item.kind === "topic" ? "选题" : "稿件"}</Badge>
                              <span className="text-[10.5px] text-ink-4">{item.status}</span>
                            </div>
                            <input
                              type="date"
                              aria-label="调整日期"
                              value={cell.key}
                              disabled={pending === `calendar-${item.kind}-${item.id}`}
                              onChange={(event) => void move(item.kind, item.id, event.target.value)}
                              className="mt-1 w-full rounded border border-line bg-surface px-1 py-0.5 text-[10.5px] text-ink-3"
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <ul className="mt-5 space-y-2 sm:hidden">
            {[...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, items]) => (
              <li key={day} className="rounded-panel bg-surface p-3 ring-1 ring-line">
                <div className="mono text-[11.5px] text-ink-4">{day}</div>
                <div className="mt-1.5 space-y-1.5">
                  {items.map((item) => (
                    <div key={`${item.kind}-${item.id}`} className="flex items-center justify-between gap-2">
                      <Link to={item.kind === "topic" ? `/topics/${item.id}` : `/articles/${item.id}`} className="min-w-0 flex-1 truncate text-[12.5px] text-ink">
                        {item.title}
                      </Link>
                      <input
                        type="date"
                        aria-label="调整日期"
                        value={day}
                        disabled={pending === `calendar-${item.kind}-${item.id}`}
                        onChange={(event) => void move(item.kind, item.id, event.target.value)}
                        className="w-[118px] rounded border border-line bg-surface px-1 py-0.5 text-[10.5px] text-ink-3"
                      />
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
