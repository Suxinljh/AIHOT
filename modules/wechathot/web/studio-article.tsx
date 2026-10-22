// One draft: the body with its claim kinds and sources, the title candidates, and the commands to
// write the whole article or one section again. The editor itself arrives with WCH-21.
import { useEffect, useRef, useState } from "react";
import { Link, useLoaderData, useNavigate, useRevalidator, type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { IconArrowLeft, IconExternal, IconHistory } from "@aihot/web/components/icons";
import { adminGet } from "@aihot/web/lib/admin.server";
import { Badge, Button, ButtonLink, Field, Input } from "@aihot/web/features/admin/ui";
import { relativeTime } from "@aihot/web/lib/format";
import { StudioArticleEditor } from "../../../apps/web/app/components/studio/StudioArticleEditor";
import { copyRich, copyText } from "./rich-copy";
import type { ArticleDoc, ClaimKind, ReviewItem, StudioArticle } from "../articles.ts";
import { STUDIO_PRODUCT, studioMeta } from "./studio-nav";
import { useStudioAction } from "./studio-action";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const id = params.id;
  if (!id) throw new Response("Not Found", { status: 404 });
  const [article, presets] = await Promise.all([
    adminGet<StudioArticle>(request, `/api/studio/articles/${encodeURIComponent(id)}`),
    adminGet<{ writing: unknown[]; format: Array<{ id: string; name: string; builtin: boolean; format: Record<string, unknown> }> }>(request, "/api/studio/presets"),
  ]);
  return { article, presets: presets.format };
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
  const { article, presets } = useLoaderData<typeof loader>();
  const { run, pending } = useStudioAction();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const [title, setTitle] = useState(article.title);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [view, setView] = useState<"content" | "layout" | "wechat">("content");
  const [wechatHtml, setWechatHtml] = useState<string | null>(null);
  const [includeSources, setIncludeSources] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [format, setFormat] = useState<Record<string, unknown>>(article.format ?? {});
  useEffect(() => {
    if (view !== "wechat") return;
    let live = true;
    fetch(`/api/studio/articles/${article.id}/wechat-html`, { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { html?: string } | null) => { if (live) setWechatHtml(data?.html ?? ""); })
      .catch(() => { if (live) setWechatHtml(""); });
    return () => { live = false; };
  }, [view, article.id, article.version]);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>(article.review?.items ?? []);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draft, setDraft] = useState<ArticleDoc>(article.content);
  useEffect(() => { setDraft(article.content); }, [article.content]);
  useEffect(() => { setFormat(article.format ?? {}); }, [article.format]);
  useEffect(() => { setReviewItems(article.review?.items ?? []); }, [article.review]);

  // The body and the titles are written in the queue: the page refreshes itself while one runs.
  const state = article.writingState;
  useEffect(() => {
    if (state?.status !== "pending") return;
    const timer = setTimeout(() => revalidator.revalidate(), 2500);
    return () => clearTimeout(timer);
  }, [state?.status, state?.at, revalidator]);

  async function exportText(format: "text" | "markdown") {
    const res = await fetch(`/api/studio/articles/${article.id}/export?format=${format}&sources=${includeSources ? "1" : "0"}`, { credentials: "same-origin" });
    if (!res.ok) return "";
    const data = (await res.json()) as { text?: string };
    return data.text ?? "";
  }

  async function copyPlain() {
    const text = await exportText("text");
    if (text) { await copyText(text); setCopied("text"); }
  }

  async function copyMarkdown() {
    const text = await exportText("markdown");
    if (text) { await copyText(text); setCopied("markdown"); }
  }

  async function copyWechat() {
    if (!wechatHtml) return;
    const text = await exportText("text");
    await copyRich(wechatHtml, text);
    setCopied("rich");
  }

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

        <div className="mt-4 flex gap-2 border-t border-line-soft pt-4">
          <button type="button" onClick={() => setView("content")} className={`rounded-control px-3 py-1.5 text-[12.5px] ${view === "content" ? "bg-ink text-bg" : "bg-surface text-ink-2 ring-1 ring-line"}`}>内容</button>
          <button type="button" onClick={() => setView("layout")} className={`rounded-control px-3 py-1.5 text-[12.5px] ${view === "layout" ? "bg-ink text-bg" : "bg-surface text-ink-2 ring-1 ring-line"}`}>排版</button>
          <button type="button" onClick={() => setView("wechat")} className={`rounded-control px-3 py-1.5 text-[12.5px] ${view === "wechat" ? "bg-ink text-bg" : "bg-surface text-ink-2 ring-1 ring-line"}`}>公众号</button>
        </div>
      </header>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          {view === "content" ? (
            <section className="rounded-panel bg-surface p-4 ring-1 ring-line sm:p-5">
              <h2 className="text-[14px] font-semibold text-ink">正文</h2>
              <StudioArticleEditor value={draft} onChange={(doc: ArticleDoc) => {
                setDraft(doc);
                if (saveTimer.current) clearTimeout(saveTimer.current);
                saveTimer.current = setTimeout(async () => {
                  setSaving(true);
                  await run("PATCH", `/api/studio/articles/${article.id}`, { content: doc }, { label: `article-autosave-${article.id}`, success: "已保存" });
                  setSaving(false);
                }, 1500);
              }} />
              {saving && <p className="mt-2 text-[11.5px] text-ink-4">正在保存…</p>}
              {!article.content?.content?.length && (
                <p className="mt-3 text-[13px] text-ink-4">还没有正文。确认大纲后点「生成正文」。</p>
              )}
            </section>
          ) : view === "wechat" ? (
            <section className="rounded-panel bg-surface p-4 ring-1 ring-line sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[14px] font-semibold text-ink">公众号 HTML</h2>
                <span className="text-[11.5px] text-ink-4">{copied ? "已复制" : ""}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button size="sm" tone="primary" disabled={!wechatHtml} onClick={copyWechat}>复制富文本</Button>
                <Button size="sm" tone="secondary" onClick={copyPlain}>复制纯文本</Button>
                <Button size="sm" tone="secondary" onClick={copyMarkdown}>复制 Markdown</Button>
                <Button
                  size="sm"
                  tone="ghost"
                  onClick={async () => {
                    const text = await exportText("markdown");
                    if (!text) return;
                    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
                    const link = document.createElement("a");
                    link.href = URL.createObjectURL(blob);
                    link.download = `${article.title || `article-${article.id}`}.md`;
                    link.click();
                    URL.revokeObjectURL(link.href);
                  }}
                >
                  下载 .md
                </Button>
                <label className="ml-auto flex items-center gap-1.5 text-[11.5px] text-ink-3">
                  <input type="checkbox" checked={includeSources} onChange={(event) => setIncludeSources(event.target.checked)} />
                  包含来源列表
                </label>
              </div>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink-4">
                只输出公众号接受的基础标签，样式写成 inline style；图片用绝对地址，正文按 375px 预览。
                粘贴验收清单见 docs/WeChatHot/wechat-paste-checklist.md。公众号访问不到本机图片地址时，请在公众号后台手动上传图片。
              </p>
              {wechatHtml === null ? (
                <p className="mt-3 text-[13px] text-ink-4">正在生成…</p>
              ) : wechatHtml ? (
                <>
                  <div className="mt-3 overflow-x-auto rounded-control border border-line bg-white p-3">
                    <div className="mx-auto w-[375px] max-w-full" dangerouslySetInnerHTML={{ __html: wechatHtml }} />
                  </div>
                  <p className="mt-2 text-[11px] text-ink-4">375px 手机预览 · 与复制出的富文本同源</p>
                </>
              ) : (
                <p className="mt-3 text-[13px] text-ink-4">还没有正文，先生成正文。</p>
              )}
              {wechatHtml !== null && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-[12px] text-ink-4">查看 HTML 源码</summary>
                  <pre className="mt-2 max-h-[320px] overflow-auto rounded-control bg-bg-sunk p-3 text-[11px] leading-relaxed text-ink-3">{wechatHtml}</pre>
                </details>
              )}
            </section>
          ) : (
            <section className="rounded-panel bg-surface p-4 ring-1 ring-line sm:p-5">
              <h2 className="text-[14px] font-semibold text-ink">排版</h2>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink-4">字体、字号、行高、段距、对齐和图片圆角；应用预设后仍可逐项覆盖。</p>
              <div className="mt-3">
                <label className="text-[12px] text-ink-3">排版预设</label>
                <select
                  aria-label="排版预设"
                  className="mt-1 h-9 w-full rounded-control bg-surface px-3 text-[13.5px] text-ink ring-1 ring-line-strong outline-none"
                  value=""
                  onChange={(event) => {
                    const preset = presets.find((p) => p.id === event.target.value);
                    if (preset) {
                      const next = { ...format, ...(preset.format ?? {}) };
                      setFormat(next);
                      run("PATCH", `/api/studio/articles/${article.id}`, { format: next }, { label: `article-format-${article.id}`, success: "已应用排版预设" });
                    }
                  }}
                >
                  <option value="">选择一个预设…</option>
                  {presets.map((p) => <option key={p.id} value={p.id}>{p.name}{p.builtin ? "（内置）" : ""}</option>)}
                </select>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="正文字号">
                  <Input type="number" value={Number((format as any)?.body?.fontSize ?? 16)} onChange={(e) => {
                    const next = { ...format, body: { ...((format as any)?.body ?? {}), fontSize: Number(e.target.value) } };
                    setFormat(next); run("PATCH", `/api/studio/articles/${article.id}`, { format: next }, { label: `article-format-${article.id}`, success: "已保存" });
                  }} />
                </Field>
                <Field label="正文行高">
                  <Input type="number" step="0.05" value={Number((format as any)?.body?.lineHeight ?? 1.85)} onChange={(e) => {
                    const next = { ...format, body: { ...((format as any)?.body ?? {}), lineHeight: Number(e.target.value) } };
                    setFormat(next); run("PATCH", `/api/studio/articles/${article.id}`, { format: next }, { label: `article-format-${article.id}`, success: "已保存" });
                  }} />
                </Field>
                <Field label="段落间距">
                  <Input type="number" value={Number((format as any)?.body?.paragraphSpacing ?? 16)} onChange={(e) => {
                    const next = { ...format, body: { ...((format as any)?.body ?? {}), paragraphSpacing: Number(e.target.value) } };
                    setFormat(next); run("PATCH", `/api/studio/articles/${article.id}`, { format: next }, { label: `article-format-${article.id}`, success: "已保存" });
                  }} />
                </Field>
                <Field label="对齐">
                  <select aria-label="对齐" className="h-9 w-full rounded-control bg-surface px-3 text-[13.5px] text-ink ring-1 ring-line-strong outline-none" value={String((format as any)?.body?.align ?? "justify")} onChange={(e) => {
                    const next = { ...format, body: { ...((format as any)?.body ?? {}), align: e.target.value } };
                    setFormat(next); run("PATCH", `/api/studio/articles/${article.id}`, { format: next }, { label: `article-format-${article.id}`, success: "已保存" });
                  }}>
                    <option value="left">左对齐</option>
                    <option value="justify">两端对齐</option>
                    <option value="center">居中</option>
                  </select>
                </Field>
                <Field label="标题字号">
                  <Input type="number" value={Number((format as any)?.title?.fontSize ?? 22)} onChange={(e) => {
                    const next = { ...format, title: { ...((format as any)?.title ?? {}), fontSize: Number(e.target.value) } };
                    setFormat(next); run("PATCH", `/api/studio/articles/${article.id}`, { format: next }, { label: `article-format-${article.id}`, success: "已保存" });
                  }} />
                </Field>
                <Field label="标题字重">
                  <Input type="number" value={Number((format as any)?.title?.fontWeight ?? 700)} onChange={(e) => {
                    const next = { ...format, title: { ...((format as any)?.title ?? {}), fontWeight: Number(e.target.value) } };
                    setFormat(next); run("PATCH", `/api/studio/articles/${article.id}`, { format: next }, { label: `article-format-${article.id}`, success: "已保存" });
                  }} />
                </Field>
                <Field label="图片圆角">
                  <Input type="number" value={Number((format as any)?.image?.borderRadius ?? 4)} onChange={(e) => {
                    const next = { ...format, image: { ...((format as any)?.image ?? {}), borderRadius: Number(e.target.value) } };
                    setFormat(next); run("PATCH", `/api/studio/articles/${article.id}`, { format: next }, { label: `article-format-${article.id}`, success: "已保存" });
                  }} />
                </Field>
              </div>
            </section>
          )}
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
