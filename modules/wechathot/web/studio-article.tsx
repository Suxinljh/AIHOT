// One draft: the body with its claim kinds and sources, the title candidates, and the commands to
// write the whole article or one section again. The editor itself arrives with WCH-21.
import { useEffect, useState } from "react";
import { Link, useLoaderData, useNavigate, useRevalidator, type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { IconArrowLeft, IconExternal, IconHistory } from "@aihot/web/components/icons";
import { adminGet } from "@aihot/web/lib/admin.server";
import { Badge, Button, ButtonLink, Field, Input } from "@aihot/web/features/admin/ui";
import { relativeTime } from "@aihot/web/lib/format";
import type { ArticleDoc, ClaimKind, ReviewItem, StudioArticle } from "../articles.ts";
import { STUDIO_PRODUCT, studioMeta } from "./studio-nav";
import { useStudioAction } from "./studio-action";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const id = params.id;
  if (!id) throw new Response("Not Found", { status: 404 });
  return { article: await adminGet<StudioArticle>(request, `/api/studio/articles/${encodeURIComponent(id)}`) };
}

export const meta: MetaFunction = () => studioMeta("稿件");

const KIND_LABEL: Record<ClaimKind, string> = {
  official: "官方",
  media: "媒体",
  unconfirmed: "未证实",
  author: "作者判断",
};
const KIND_TONE: Record<ClaimKind, "ok" | "info" | "warn" | "muted"> = {
  official: "ok",
  media: "info",
  unconfirmed: "warn",
  author: "muted",
};
const STYLE_LABEL: Record<string, string> = { direct: "直述型", question: "问题型", opinion: "观点型" };

export default function StudioArticlePage() {
  const { article } = useLoaderData<typeof loader>();
  const { run, pending } = useStudioAction();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const [title, setTitle] = useState(article.title);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>(article.review?.items ?? []);
  useEffect(() => { setReviewItems(article.review?.items ?? []); }, [article.review]);

  // The body and the titles are written in the queue: the page refreshes itself while one runs.
  const state = article.writingState;
  useEffect(() => {
    if (state?.status !== "pending") return;
    const timer = setTimeout(() => revalidator.revalidate(), 2500);
    return () => clearTimeout(timer);
  }, [state?.status, state?.at, revalidator]);

  const nodes = article.content?.content ?? [];
  const headings = nodes.map((node, index) => (node.type === "heading" ? index : -1)).filter((index) => index >= 0);
  const sectionCount = headings.length;

  return (
    <div>
      <Link to={article.topic ? `/studio/topics` : "/studio/articles"} className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-4 transition-colors hover:text-ink">
        <IconArrowLeft size={14} />{article.topic ? "选题管理" : "我的文章"}
      </Link>

      <header className="mt-3 rounded-panel bg-surface p-5 ring-1 ring-line lg:p-6">
        <div className="mono text-[10px] uppercase tracking-[0.16em] text-ink-4">{STUDIO_PRODUCT} / 稿件 / #{article.id}</div>
        <h1 className="mt-2 text-[24px] font-black leading-[1.25] tracking-[-0.03em] text-ink sm:text-[30px]">{article.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge tone={article.type === "insight" ? "info" : "muted"}>{article.type === "insight" ? "洞察" : "资讯"}</Badge>
          <Badge tone="muted">{article.status === "draft" ? "草稿" : article.status === "review" ? "待审" : article.status === "done" ? "已完成" : "归档"}</Badge>
          {article.angle && <Badge tone="muted">{article.angle}</Badge>}
          <span className="text-[11.5px] text-ink-4">第 {article.version} 版 · 更新于 {relativeTime(article.updatedAt)}</span>
        </div>

        {state?.status === "pending" && <p className="mt-3 text-[12.5px] text-ink-3">正在生成，完成后这一页会自动更新。</p>}
        {state?.status === "failed" && (
          <p className="mt-3 rounded-control bg-bg-sunk px-3 py-2 text-[12.5px] leading-relaxed text-hot">
            上一次生成失败：{state.error ?? "未知原因"}。可以再点一次重试。
          </p>
        )}
        {article.droppedSources.length > 0 && (
          <p className="mt-3 rounded-control bg-bg-sunk px-3 py-2 text-[12.5px] leading-relaxed text-ink-3">
            模型引用了材料里没有的来源，已被丢弃：{article.droppedSources.join("、")}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line-soft pt-4">
          <Button
            tone="primary"
            busy={pending === `article-body-${article.id}`}
            disabled={!article.outline.length}
            onClick={() => run("POST", `/api/studio/articles/${article.id}/body`, {}, { label: `article-body-${article.id}`, success: "正文生成中" })}
          >
            {article.content?.content?.length ? "重新生成正文" : "生成正文"}
          </Button>
          <Button
            tone="secondary"
            busy={pending === `article-titles-${article.id}`}
            onClick={() => run("POST", `/api/studio/articles/${article.id}/titles`, undefined, { label: `article-titles-${article.id}`, success: "标题生成中" })}
          >
            生成标题候选
          </Button>
          <Button
            tone="secondary"
            busy={pending === `article-review-${article.id}`}
            disabled={!article.content?.content?.length}
            onClick={() => run("POST", `/api/studio/articles/${article.id}/review`, undefined, { label: `article-review-${article.id}`, success: "审核清单已生成" })}
          >
            生成审核清单
          </Button>
          {article.topic && (
            <ButtonLink to={`/studio/topics/${article.topic.id}`} tone="ghost">
              <IconHistory size={13} />回到选题
            </ButtonLink>
          )}
        </div>
        {!article.outline.length && (
          <p className="mt-2 text-[12px] text-ink-4">还没有确认大纲，先在选题页生成并确认大纲，再回来写正文。</p>
        )}
      </header>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <section className="rounded-panel bg-surface p-4 ring-1 ring-line sm:p-5">
            <h2 className="text-[14px] font-semibold text-ink">正文</h2>
            {nodes.length ? (
              <div className="mt-3 space-y-3">
                {nodes.map((node, index) => {
                  if (node.type === "heading") {
                    return (
                      <h3 key={index} className="pt-2 text-[15px] font-semibold text-ink">
                        {node.content.map((part) => part.text).join("")}
                      </h3>
                    );
                  }
                  return (
                    <p key={index} className="text-[13.5px] leading-[1.9] text-ink-2">
                      {node.content.map((part) => part.text).join("")}
                      <span className="ml-2 inline-flex flex-wrap items-center gap-1 align-middle">
                        <Badge tone={KIND_TONE[node.attrs.kind]}>{KIND_LABEL[node.attrs.kind]}</Badge>
                        {node.attrs.sources.map((source) => (
                          <span key={source} className="mono text-[10.5px] text-ink-4">{source}</span>
                        ))}
                      </span>
                    </p>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 text-[13px] text-ink-4">还没有正文。确认大纲后点「生成正文」。</p>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-panel bg-surface p-4 ring-1 ring-line">
            <h2 className="text-[14px] font-semibold text-ink">审核清单</h2>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-4">关键事实、数字、日期、来源与潜在夸大表述；逐项确认、修改或忽略，不改写正文。</p>
            {reviewItems.length ? (
              <ul className="mt-3 space-y-2">
                {reviewItems.map((item, index) => (
                  <li key={item.id} className="rounded-control bg-bg-sunk px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-ink">{item.text}</span>
                      <Badge tone={item.status === "confirmed" ? "ok" : item.status === "ignored" ? "muted" : item.status === "modified" ? "info" : "warn"}>{item.status === "confirmed" ? "已确认" : item.status === "ignored" ? "已忽略" : item.status === "modified" ? "已修改" : "待确认"}</Badge>
                    </div>
                    {item.detail && <p className="mt-1 text-[11.5px] leading-relaxed text-ink-4">{item.detail}</p>}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(["confirmed", "modified", "ignored", "pending"] as const).map((status) => (
                        <Button
                          key={status}
                          size="sm"
                          tone="ghost"
                          busy={pending === `article-review-item-${article.id}-${index}`}
                          onClick={() => {
                            const next = reviewItems.map((row, i) => (i === index ? { ...row, status } : row));
                            setReviewItems(next);
                            run("PATCH", `/api/studio/articles/${article.id}/review`, { items: next }, { label: `article-review-item-${article.id}-${index}`, success: "审核状态已保存" });
                          }}
                        >
                          {status === "confirmed" ? "确认" : status === "modified" ? "修改" : status === "ignored" ? "忽略" : "重置"}
                        </Button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[13px] text-ink-4">还没有审核清单，先生成正文再点「生成审核清单」。</p>
            )}
          </section>

          <section className="rounded-panel bg-surface p-4 ring-1 ring-line">
            <h2 className="text-[14px] font-semibold text-ink">标题候选</h2>
            {article.titleOptions.length ? (
              <ul className="mt-3 space-y-2">
                {article.titleOptions.map((option) => (
                  <li key={`${option.style}-${option.title}`} className="rounded-control bg-bg-sunk px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-ink">{option.title}</span>
                      <Badge tone="muted">{STYLE_LABEL[option.style] ?? option.style}</Badge>
                    </div>
                    <Button
                      size="sm"
                      tone="ghost"
                      className="mt-1"
                      onClick={() => {
                        setTitle(option.title);
                        run("PATCH", `/api/studio/articles/${article.id}`, { title: option.title }, { label: `article-title-${article.id}`, success: "标题已保存" });
                      }}
                    >
                      用这个标题
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[13px] text-ink-4">还没有标题候选。</p>
            )}
            <div className="mt-3 border-t border-line-soft pt-3">
              <Field label="标题" hint="改完记得保存">
                <Input aria-label="标题" value={title} onChange={(event) => setTitle(event.target.value)} />
              </Field>
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  tone="primary"
                  busy={pending === `article-save-${article.id}`}
                  onClick={() => run("PATCH", `/api/studio/articles/${article.id}`, { title }, { label: `article-save-${article.id}`, success: "标题已保存" })}
                >
                  保存标题
                </Button>
              </div>
            </div>
          </section>

          {sectionCount > 0 && (
            <section className="rounded-panel bg-surface p-4 ring-1 ring-line">
              <h2 className="text-[14px] font-semibold text-ink">按章节重写</h2>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink-4">只改选中的这一节，其他章节保持原样。</p>
              <div className="mt-3">
                <Field label="章节">
                  <select
                    aria-label="章节"
                    value={String(sectionIndex)}
                    onChange={(event) => setSectionIndex(Number(event.target.value))}
                    className="h-9 w-full rounded-control bg-surface px-3 text-[13.5px] text-ink ring-1 ring-line-strong outline-none"
                  >
                    {headings.map((position, index) => {
                      const node = nodes[position];
                      const text = node?.type === "heading" ? node.content.map((part) => part.text).join("") : `第 ${index + 1} 节`;
                      return <option key={position} value={String(index)}>{text}</option>;
                    })}
                  </select>
                </Field>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {["扩写这一节", "精简这一节", "更口语一点", "更克制一点"].map((instruction) => (
                  <Button
                    key={instruction}
                    size="sm"
                    tone="secondary"
                    busy={pending === `article-rewrite-${article.id}-${instruction}`}
                    onClick={() => run("POST", `/api/studio/articles/${article.id}/body`, { sectionIndex, instruction }, {
                      label: `article-rewrite-${article.id}-${instruction}`,
                      success: "这一节正在重写",
                    })}
                  >
                    {instruction}
                  </Button>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
