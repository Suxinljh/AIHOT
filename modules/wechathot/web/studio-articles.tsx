// The drafts list: every article the studio has started, newest change first. Opening one goes to the
// editor, where the body, the review checklist and the layout live.
import { useState } from "react";
import { Link, useLoaderData, useNavigate, useSearchParams, type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { IconDoc, IconSearch } from "@aihot/web/components/icons";
import { adminGet } from "@aihot/web/lib/admin.server";
import { Badge, Button, Field, FilterChips, Input } from "@aihot/web/features/admin/ui";
import { relativeTime } from "@aihot/web/lib/format";
import type { StudioArticle } from "../articles.ts";
import { STUDIO_PRODUCT, studioMeta } from "./studio-nav";

const STATUS_LABEL: Record<StudioArticle["status"], string> = {
  draft: "草稿",
  review: "待审",
  done: "已完成",
  archived: "归档",
};

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "";
  const q = url.searchParams.get("q") ?? "";
  const query = new URLSearchParams();
  if (status) query.set("status", status);
  if (q) query.set("q", q);
  const suffix = query.size ? `?${query}` : "";
  const { items } = await adminGet<{ items: StudioArticle[] }>(request, `/api/studio/articles${suffix}`);
  return { articles: items, status, q };
}

export const meta: MetaFunction = () => studioMeta("我的文章");

export default function StudioArticles() {
  const { articles, status, q } = useLoaderData<typeof loader>();
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
    return search ? `/studio/articles?${search}` : "/studio/articles";
  }

  return (
    <div>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mono text-[11px] uppercase tracking-[0.18em] text-ink-4">{STUDIO_PRODUCT} / Studio</div>
          <h1 className="mt-2 text-[28px] font-black leading-[1.2] tracking-[-0.03em] text-ink sm:text-[34px]">我的文章</h1>
          <p className="mt-3 max-w-[52em] text-[14px] leading-[1.8] text-ink-3">
            资讯与洞察草稿、写作进度和排版入口集中在这里。打开一篇继续写，或在选题页创建新稿。
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
            <Field label="搜索稿件">
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="标题" />
            </Field>
          </div>
          <Button type="submit" tone="secondary"><IconSearch size={15} /> 搜索</Button>
        </form>
      </header>

      <div className="mt-6">
        <FilterChips
          param="status"
          options={[
            { value: "", label: "全部" },
            { value: "draft", label: "草稿" },
            { value: "review", label: "待审" },
            { value: "done", label: "已完成" },
            { value: "archived", label: "归档" },
          ]}
        />
      </div>

      {articles.length === 0 ? (
        <section className="mt-6 rounded-panel border border-dashed border-line-strong bg-surface/60 px-5 py-12 text-center sm:px-8 sm:py-16">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
            <IconDoc size={22} />
          </div>
          <h2 className="mt-4 text-[17px] font-semibold text-ink">还没有文章</h2>
          <p className="mx-auto mt-2 max-w-[38em] text-[13.5px] leading-[1.8] text-ink-3">
            在选题页把一条选题推进到写作，会在这里生成草稿；角度、大纲和正文都可以继续改。
          </p>
          <div className="mt-4 flex justify-center">
            <Link to="/studio/topics" className="text-[13px] text-accent hover:underline">去选题管理</Link>
          </div>
        </section>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {articles.map((article) => (
            <li key={article.id} className="min-w-0">
              <Link
                to={`/studio/articles/${article.id}`}
                className="group flex h-full flex-col rounded-panel bg-surface p-4 ring-1 ring-line transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={article.type === "insight" ? "info" : "muted"}>{article.type === "insight" ? "洞察" : "资讯"}</Badge>
                  <Badge tone={article.status === "done" ? "ok" : article.status === "review" ? "warn" : "muted"}>{STATUS_LABEL[article.status]}</Badge>
                  {article.review.items.length > 0 && <Badge tone="accent">审核 {article.review.items.length}</Badge>}
                </div>
                <h2 className="mt-2 line-clamp-2 text-[15px] font-semibold leading-[1.5] text-ink group-hover:text-accent">
                  {article.title || "未命名稿件"}
                </h2>
                {article.angle && <p className="mt-1 truncate text-[12px] text-ink-4">{article.angle}</p>}
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-line-soft pt-3 text-[11.5px] text-ink-4">
                  <span>第 {article.version} 版</span>
                  <span>{relativeTime(article.updatedAt)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
