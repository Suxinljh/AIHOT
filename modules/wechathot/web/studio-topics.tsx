// The pitch board: the editor's own tasks, from "worth a look" to "written". A card is a topic; the
// detail page holds the angle, the notes and the event it came from.
import { useState } from "react";
import { Link, useLoaderData, useNavigate, useSearchParams, type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { IconList } from "@aihot/web/components/icons";
import { adminGet } from "@aihot/web/lib/admin.server";
import { Badge, Button, Field, Input } from "@aihot/web/features/admin/ui";
import { relativeTime } from "@aihot/web/lib/format";
import type { StudioTopic, TopicStatus } from "../studio-types.ts";
import { STUDIO_PRODUCT, studioMeta } from "./studio-nav";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "";
  const q = url.searchParams.get("q") ?? "";
  const query = new URLSearchParams();
  if (status) query.set("status", status);
  if (q) query.set("q", q);
  const suffix = query.size ? `?${query}` : "";
  const { items } = await adminGet<{ items: StudioTopic[] }>(request, `/api/studio/topics${suffix}`);
  return { topics: items, status, q };
}

export const meta: MetaFunction = () => studioMeta("选题管理");

const STATUS_LABEL: Record<TopicStatus, string> = {
  pending: "待评估",
  researching: "待研究",
  ready: "待写作",
  writing: "写作中",
  done: "已完成",
  ignored: "已忽略",
  archived: "归档",
};
/** The board's columns, in the order the work moves. */
const COLUMNS: TopicStatus[] = ["pending", "researching", "ready", "writing", "done"];

export default function StudioTopics() {
  const { topics, status, q } = useLoaderData<typeof loader>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(q);

  function withParams(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    const search = next.toString();
    return search ? `/topics?${search}` : "/topics";
  }

  return (
    <div>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mono text-[11px] uppercase tracking-[0.18em] text-ink-4">{STUDIO_PRODUCT} / Studio</div>
          <h1 className="mt-2 text-[28px] font-black leading-[1.2] tracking-[-0.03em] text-ink sm:text-[34px]">选题管理</h1>
          <p className="mt-3 max-w-[52em] text-[14px] leading-[1.8] text-ink-3">
            把值得写的事件变成有角度、有来源、有状态的创作任务。
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Link to="/calendar" className="text-[12.5px] text-accent hover:underline">发布日历</Link>
        </div>
        <form
          className="flex w-full max-w-[420px] items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            navigate(withParams({ q: query.trim() || null }));
          }}
        >
          <div className="flex-1">
            <Field label="搜索选题">
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="角度、事件标题或备注" />
            </Field>
          </div>
          <Button type="submit" tone="secondary">搜索</Button>
        </form>
      </header>

      <nav className="mt-6 flex flex-wrap items-center gap-2">
        <Link
          to={withParams({ status: null })}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[12.5px] transition-colors ${!status ? "bg-ink text-bg" : "bg-surface text-ink-2 ring-1 ring-line hover:bg-bg-sunk"}`}
        >
          全部
        </Link>
        {COLUMNS.map((column) => (
          <Link
            key={column}
            to={withParams({ status: column })}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[12.5px] transition-colors ${status === column ? "bg-ink text-bg" : "bg-surface text-ink-2 ring-1 ring-line hover:bg-bg-sunk"}`}
          >
            {STATUS_LABEL[column]}
          </Link>
        ))}
      </nav>

      {topics.length === 0 ? (
        <section className="mt-8 rounded-card border border-dashed border-line-strong bg-surface/60 px-5 py-12 text-center sm:px-8 sm:py-16">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
            <IconList size={22} />
          </div>
          <h2 className="mt-4 text-[17px] font-semibold text-ink">{q ? "没有匹配的选题" : "还没有选题"}</h2>
          <p className="mx-auto mt-2 max-w-[38em] text-[13.5px] leading-[1.8] text-ink-3">
            {q ? "换个词再试一次。" : "从热点事件创建第一个选题后，这里会按待评估、待研究、待写作和已完成排列。"}
          </p>
        </section>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {topics.map((topic) => (
            <li key={topic.id}>
              <Link
                to={`/topics/${topic.id}`}
                className="block rounded-card border border-line bg-surface p-4 transition-colors hover:bg-bg-sunk"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={topic.columnType === "insight" ? "info" : "muted"}>{topic.columnType === "insight" ? "洞察" : "资讯"}</Badge>
                  <Badge tone="muted">{STATUS_LABEL[topic.status]}</Badge>
                </div>
                <h2 className="mt-3 text-[15px] font-semibold leading-[1.5] text-ink">
                  {topic.angle ?? topic.eventTitle ?? "未命名选题"}
                </h2>
                {topic.eventTitle && <p className="mt-1.5 text-[13px] leading-[1.7] text-ink-3">{topic.eventTitle}</p>}
                {topic.notes && <p className="mt-2 line-clamp-2 text-[12.5px] leading-[1.7] text-ink-4">{topic.notes}</p>}
                <div className="mono mt-3 text-[11px] text-ink-4">更新于 {relativeTime(topic.updatedAt)}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
