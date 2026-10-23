import { useState } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { useLoaderData } from "react-router";
import { IconDoc, IconGrid, IconSparkles } from "@aihot/web/components/icons";
import { adminGet } from "@aihot/web/lib/admin.server";
import type { StylePreset, StudioPresets } from "../studio-types.ts";
import type { NotifySettings } from "../notify.ts";
import type { StudioMetrics } from "../metrics.ts";
import { Button, Field, Input, Textarea } from "@aihot/web/features/admin/ui";
import { useStudioAction } from "./studio-action";
import { MetricsSection } from "./studio-metrics";
import { IntegrationsSection, type Integrations } from "./studio-integrations";
import { StudioDialog } from "./studio-brand-ui";
import { STUDIO_PRODUCT, studioMeta } from "./studio-nav";

export async function loader({ request }: LoaderFunctionArgs) {
  const days = new URL(request.url).searchParams.get("days") ?? "30";
  const [presets, notify, integrations, metrics] = await Promise.all([
    adminGet<StudioPresets>(request, "/api/studio/presets"),
    adminGet<{ settings: NotifySettings; targets: Array<{ key: string; enabled: boolean }> }>(request, "/api/studio/notify/settings"),
    adminGet<Integrations>(request, "/api/studio/integrations"),
    adminGet<StudioMetrics>(request, `/api/studio/metrics?days=${encodeURIComponent(days)}`),
  ]);
  return { presets, notify: notify.settings, integrations, metrics, days };
}

function NotifySection({ initial }: { initial: NotifySettings }) {
  const { run, pending } = useStudioAction();
  const [form, setForm] = useState(initial);
  const [result, setResult] = useState<string | null>(null);

  async function test() {
    const response = await run<{ results: Array<{ target: string; status: string }> }>("POST", "/api/studio/notify/test", undefined, { label: "notify-test" });
    if (!response) { setResult("测试没有发出，请检查渠道是否开启。"); return; }
    setResult(response.results.length ? response.results.map((row) => `${row.target}: ${row.status}`).join("；") : "没有启用的渠道。");
  }

  return (
    <section className="mt-8 rounded-panel bg-surface p-5 ring-1 ring-line">
      <h2 className="text-[17px] font-semibold text-ink">外部通知</h2>
      <p className="mt-1 text-[13px] text-ink-3">站内通知之后，再把关注更新发到飞书或邮箱。密钥只在后端环境变量里。</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-[13px] text-ink-2"><input type="checkbox" checked={form.feishu} onChange={(e) => setForm({ ...form, feishu: e.target.checked })} />飞书提醒</label>
        <label className="flex items-center gap-2 text-[13px] text-ink-2"><input type="checkbox" checked={form.email} onChange={(e) => setForm({ ...form, email: e.target.checked })} />邮件提醒</label>
        <label className="flex items-center gap-2 text-[13px] text-ink-2"><input type="checkbox" checked={form.immediate} onChange={(e) => setForm({ ...form, immediate: e.target.checked })} />关注规则为「立即」时马上发送</label>
        <Field label="每日摘要时间（北京时间）">
          <select aria-label="摘要时间" className="h-9 w-full rounded-control bg-surface px-3 text-[13.5px] text-ink ring-1 ring-line-strong outline-none" value={form.digestHour} onChange={(e) => setForm({ ...form, digestHour: Number(e.target.value) })}>
            {Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{String(hour).padStart(2, "0")}:00</option>)}
          </select>
        </Field>
        <Field label="最低新闻价值" hint="留空表示不过滤">
          <Input type="number" value={form.minScore ?? ""} onChange={(e) => setForm({ ...form, minScore: e.target.value === "" ? null : Number(e.target.value) })} />
        </Field>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" disabled={pending === "notify-save"} onClick={() => run("PATCH", "/api/studio/notify/settings", form, { label: "notify-save", success: "通知设置已保存" })} className="rounded-control bg-ink px-3 py-1.5 text-[12.5px] font-medium text-bg disabled:opacity-50">{pending === "notify-save" ? "保存中…" : "保存"}</button>
        <button type="button" disabled={pending === "notify-test"} onClick={test} className="rounded-control bg-surface px-3 py-1.5 text-[12.5px] text-ink-2 ring-1 ring-line disabled:opacity-50">{pending === "notify-test" ? "发送中…" : "发送测试消息"}</button>
        {result && <span className="text-[11.5px] text-ink-4">{result}</span>}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-ink-4">飞书使用 FEISHU_ALERT_CHAT_ID；邮件使用 SMTP_URL、SMTP_FROM 和 ALERT_EMAIL_TO。发送失败会在投递记录里显示原因，未知结果不会自动重试。</p>
    </section>
  );
}

export const meta: MetaFunction = () => studioMeta("设置");

interface FormatShape {
  title?: { fontSize?: number; fontWeight?: number; lineHeight?: number; marginBottom?: number; color?: string };
  body?: { fontSize?: number; lineHeight?: number; color?: string; letterSpacing?: number; paragraphSpacing?: number; align?: string };
  image?: { borderRadius?: number };
}

function formatShape(preset: StylePreset): FormatShape {
  return preset.format as FormatShape;
}

function ColumnBadge({ preset }: { preset: StylePreset }) {
  if (!preset.columnType) return null;
  return (
    <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent">
      {preset.columnType === "news" ? "资讯" : "洞察"}
    </span>
  );
}

function BuiltinBadge({ preset }: { preset: StylePreset }) {
  if (!preset.builtin) return null;
  return <span className="mono rounded-full border border-line bg-bg-sunk px-2 py-1 text-[10px] text-ink-4">内置</span>;
}

function WritingCard({ preset, onEdit }: { preset: StylePreset; onEdit: () => void }) {
  return (
    <article className="rounded-card border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent">
            <IconDoc size={17} />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-ink">{preset.name}</h3>
            <p className="mono mt-0.5 text-[10.5px] text-ink-4">{preset.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <ColumnBadge preset={preset} />
          <BuiltinBadge preset={preset} />
          <Button size="sm" tone="ghost" onClick={onEdit}>编辑</Button>
        </div>
      </div>

      <dl className="mt-4 space-y-2.5 text-[13px] leading-[1.7]">
        {preset.targetReader ? (
          <div>
            <dt className="text-[11px] text-ink-4">目标读者</dt>
            <dd className="text-ink-2">{preset.targetReader}</dd>
          </div>
        ) : null}
        {preset.wordCount ? (
          <div>
            <dt className="text-[11px] text-ink-4">目标字数</dt>
            <dd className="text-ink-2">约 {preset.wordCount} 字</dd>
          </div>
        ) : null}
        {preset.tone ? (
          <div>
            <dt className="text-[11px] text-ink-4">语气</dt>
            <dd className="text-ink-2">{preset.tone}</dd>
          </div>
        ) : null}
        {preset.titlePreference ? (
          <div>
            <dt className="text-[11px] text-ink-4">标题偏好</dt>
            <dd className="text-ink-2">{preset.titlePreference}</dd>
          </div>
        ) : null}
      </dl>

      {preset.forbiddenExpressions.length ? (
        <div className="mt-4 border-t border-line pt-3">
          <div className="text-[11px] text-ink-4">避免用词</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {preset.forbiddenExpressions.map((word) => (
              <span key={word} className="rounded-full bg-bg-sunk px-2 py-1 text-[11px] text-ink-3">
                {word}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function FormatCard({ preset, onEdit }: { preset: StylePreset; onEdit: () => void }) {
  const shape = formatShape(preset);
  const body = shape.body;
  const title = shape.title;
  return (
    <article className="rounded-card border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent">
            <IconGrid size={17} />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-ink">{preset.name}</h3>
            <p className="mono mt-0.5 text-[10.5px] text-ink-4">{preset.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <BuiltinBadge preset={preset} />
          <Button size="sm" tone="ghost" onClick={onEdit}>编辑</Button>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-line bg-white p-4">
        <div
          style={{
            fontSize: title?.fontSize,
            fontWeight: title?.fontWeight,
            lineHeight: title?.lineHeight,
            marginBottom: title?.marginBottom,
            color: title?.color,
          }}
        >
          当模型开始自己写代码
        </div>
        <div
          style={{
            fontSize: body?.fontSize,
            lineHeight: body?.lineHeight,
            color: body?.color,
            letterSpacing: body?.letterSpacing,
            textAlign: body?.align === "justify" ? "justify" : "left",
          }}
        >
          这是一段用于预览排版效果的示例正文。字号、行距、段距和图片圆角会应用到公众号文章，应用后仍可逐项调整。
        </div>
        <div
          className="mt-3 h-16 border border-line bg-bg-sunk"
          style={{ borderRadius: shape.image?.borderRadius }}
        />
      </div>

      <div className="mono mt-4 grid grid-cols-3 gap-2 text-[10.5px] text-ink-4">
        <div>
          <div>正文</div>
          <div className="mt-0.5 text-ink-2">{body?.fontSize ?? "—"}px / {body?.lineHeight ?? "—"}</div>
        </div>
        <div>
          <div>段距</div>
          <div className="mt-0.5 text-ink-2">{body?.paragraphSpacing ?? "—"}px</div>
        </div>
        <div>
          <div>标题</div>
          <div className="mt-0.5 text-ink-2">{title?.fontSize ?? "—"}px</div>
        </div>
      </div>
    </article>
  );
}


type PresetKind = "writing" | "format";

interface PresetDraft {
  id: string | null;
  kind: PresetKind;
  name: string;
  columnType: string;
  targetReader: string;
  wordCount: string;
  tone: string;
  titlePreference: string;
  forbidden: string;
  format: Record<string, any>;
  builtin: boolean;
}

const DEFAULT_FORMAT: Record<string, any> = {
  title: { fontSize: 22, fontWeight: 700, lineHeight: 1.35, marginBottom: 18, color: "#1a1a1a" },
  body: { fontSize: 16, lineHeight: 1.85, color: "#333333", letterSpacing: 0.5, paragraphSpacing: 16, align: "justify" },
  image: { borderRadius: 4 },
};

function presetDraft(preset: StylePreset | null, kind: PresetKind): PresetDraft {
  return {
    id: preset?.id ?? null,
    kind: preset?.kind ?? kind,
    name: preset?.name ?? "",
    columnType: preset?.columnType ?? "",
    targetReader: preset?.targetReader ?? "",
    wordCount: preset?.wordCount ? String(preset.wordCount) : "",
    tone: preset?.tone ?? "",
    titlePreference: preset?.titlePreference ?? "",
    forbidden: preset?.forbiddenExpressions.join("\n") ?? "",
    format: { ...DEFAULT_FORMAT, ...(preset?.format ?? {}) },
    builtin: preset?.builtin ?? false,
  };
}

export default function StudioSettings() {
  const { presets, notify, integrations, metrics, days } = useLoaderData<typeof loader>();
  const writing = presets.writing;
  const formatting = presets.format;
  const { run, pending } = useStudioAction();
  const [editor, setEditor] = useState<PresetDraft | null>(null);

  function setFormatField(section: "title" | "body" | "image", key: string, value: string | number) {
    setEditor((current) => current ? { ...current, format: { ...current.format, [section]: { ...(current.format[section] ?? {}), [key]: value } } } : current);
  }

  async function savePreset() {
    if (!editor || !editor.name.trim()) return;
    const payload = editor.kind === "writing"
      ? {
          name: editor.name.trim(),
          kind: "writing" as const,
          columnType: editor.columnType || null,
          targetReader: editor.targetReader.trim() || null,
          wordCount: editor.wordCount === "" ? null : Number(editor.wordCount),
          tone: editor.tone.trim() || null,
          titlePreference: editor.titlePreference.trim() || null,
          forbiddenExpressions: editor.forbidden.split(/[,\n]/).map((word) => word.trim()).filter(Boolean),
        }
      : { name: editor.name.trim(), kind: "format" as const, format: editor.format };
    const saved = editor.id
      ? await run("PATCH", `/api/studio/presets/${editor.id}`, payload, { label: "preset-save", success: "模板已保存" })
      : await run("POST", "/api/studio/presets", payload, { label: "preset-save", success: "模板已创建" });
    if (saved) setEditor(null);
  }

  async function deletePreset() {
    if (!editor?.id || editor.builtin) return;
    if (!window.confirm(`删除模板「${editor.name}」？`)) return;
    const deleted = await run("DELETE", `/api/studio/presets/${editor.id}`, undefined, { label: "preset-delete", success: "模板已删除" });
    if (deleted) setEditor(null);
  }

  return (
    <div>
      <header className="max-w-[760px]">
        <div className="mono text-[11px] uppercase tracking-[0.18em] text-ink-4">{STUDIO_PRODUCT} / Studio</div>
        <h1 className="mt-2 text-[28px] font-black leading-[1.2] tracking-[-0.03em] text-ink sm:text-[34px]">设置</h1>
        <p className="mt-3 text-[14px] leading-[1.8] text-ink-3">写作风格、排版预设、外部通知、集成配置和内容成本，都在这一页。</p>
      </header>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <IconSparkles size={17} />
              <h2 className="text-[17px] font-semibold text-ink">写作风格</h2>
            </div>
            <p className="mt-1 text-[13px] text-ink-3">决定文章写给谁、写多长、用什么语气，以及标题和用词的边界。</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="mono rounded-full border border-line bg-bg-sunk px-3 py-1 text-[11px] text-ink-4">{writing.length} 个预设</span>
            <Button size="sm" tone="secondary" onClick={() => setEditor(presetDraft(null, "writing"))}>新建写作模板</Button>
          </div>
        </div>
        {writing.length ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {writing.map((preset) => <WritingCard key={preset.id} preset={preset} onEdit={() => setEditor(presetDraft(preset, "writing"))} />)}
          </div>
        ) : (
          <div className="mt-4 rounded-card border border-dashed border-line-strong bg-surface/60 px-5 py-10 text-center text-[13px] text-ink-3">
            还没有写作风格预设。运行工作台种子后，内置预设会出现在这里。
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <IconGrid size={17} />
              <h2 className="text-[17px] font-semibold text-ink">排版预设</h2>
            </div>
            <p className="mt-1 text-[13px] text-ink-3">保存公众号文章的标题、正文、引用和图片样式，应用到文章后仍可逐项修改。</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="mono rounded-full border border-line bg-bg-sunk px-3 py-1 text-[11px] text-ink-4">{formatting.length} 个预设</span>
            <Button size="sm" tone="secondary" onClick={() => setEditor(presetDraft(null, "format"))}>新建排版模板</Button>
          </div>
        </div>
        {formatting.length ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {formatting.map((preset) => <FormatCard key={preset.id} preset={preset} onEdit={() => setEditor(presetDraft(preset, "format"))} />)}
          </div>
        ) : (
          <div className="mt-4 rounded-card border border-dashed border-line-strong bg-surface/60 px-5 py-10 text-center text-[13px] text-ink-3">
            还没有排版预设。运行工作台种子后，内置预设会出现在这里。
          </div>
        )}
      </section>

      <NotifySection initial={notify} />

      <div className="mt-8 border-t border-line pt-8">
        <IntegrationsSection integrations={integrations} />
      </div>

      <div className="mt-8 border-t border-line pt-8">
        <MetricsSection metrics={metrics} days={days} />
      </div>

      <p className="mt-6 max-w-[760px] text-[12px] leading-[1.8] text-ink-4">
        内置预设可以直接改，也可以新建自己的模板；删除只对自定义模板开放。改动只影响之后新建的稿件和手动应用的排版。
      </p>

      <StudioDialog
        open={editor !== null}
        title={editor?.id ? `编辑模板：${editor.name}` : editor?.kind === "format" ? "新建排版模板" : "新建写作模板"}
        description={editor?.kind === "format" ? "标题、正文和图片的默认样式；应用后仍可在稿件里逐项覆盖。" : "决定文章写给谁、写多长、用什么语气，以及标题和用词的边界。"}
        onClose={() => setEditor(null)}
        onSubmit={savePreset}
        busy={pending === "preset-save"}
        submitLabel="保存模板"
        submitDisabled={!editor?.name.trim()}
      >
        {editor && (
          <div className="space-y-3">
            <Field label="模板名称">
              <Input value={editor.name} onChange={(event) => setEditor({ ...editor, name: event.target.value })} autoFocus />
            </Field>
            {editor.kind === "writing" ? (
              <>
                <Field label="栏目类型">
                  <select
                    aria-label="栏目类型"
                    className="h-9 w-full rounded-control bg-surface px-3 text-[13.5px] text-ink ring-1 ring-line-strong outline-none"
                    value={editor.columnType}
                    onChange={(event) => setEditor({ ...editor, columnType: event.target.value })}
                  >
                    <option value="">不限</option>
                    <option value="news">资讯</option>
                    <option value="insight">洞察</option>
                  </select>
                </Field>
                <Field label="目标读者">
                  <Input value={editor.targetReader} onChange={(event) => setEditor({ ...editor, targetReader: event.target.value })} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="目标字数">
                    <Input type="number" value={editor.wordCount} onChange={(event) => setEditor({ ...editor, wordCount: event.target.value })} />
                  </Field>
                  <Field label="语气">
                    <Input value={editor.tone} onChange={(event) => setEditor({ ...editor, tone: event.target.value })} />
                  </Field>
                </div>
                <Field label="标题偏好">
                  <Input value={editor.titlePreference} onChange={(event) => setEditor({ ...editor, titlePreference: event.target.value })} />
                </Field>
                <Field label="避免用词" hint="每行一个，或用逗号分隔">
                  <Textarea value={editor.forbidden} onChange={(event) => setEditor({ ...editor, forbidden: event.target.value })} />
                </Field>
                {editor.id && !editor.builtin && (
                  <Button size="sm" tone="secondary" onClick={deletePreset} busy={pending === "preset-delete"}>删除这个模板</Button>
                )}
              </>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="标题字号"><Input type="number" value={Number(editor.format.title?.fontSize ?? 22)} onChange={(event) => setFormatField("title", "fontSize", Number(event.target.value))} /></Field>
                  <Field label="标题字重"><Input type="number" value={Number(editor.format.title?.fontWeight ?? 700)} onChange={(event) => setFormatField("title", "fontWeight", Number(event.target.value))} /></Field>
                  <Field label="标题行高"><Input type="number" step="0.05" value={Number(editor.format.title?.lineHeight ?? 1.35)} onChange={(event) => setFormatField("title", "lineHeight", Number(event.target.value))} /></Field>
                  <Field label="标题颜色"><Input type="color" value={String(editor.format.title?.color ?? "#1a1a1a")} onChange={(event) => setFormatField("title", "color", event.target.value)} /></Field>
                  <Field label="正文字号"><Input type="number" value={Number(editor.format.body?.fontSize ?? 16)} onChange={(event) => setFormatField("body", "fontSize", Number(event.target.value))} /></Field>
                  <Field label="正文行高"><Input type="number" step="0.05" value={Number(editor.format.body?.lineHeight ?? 1.85)} onChange={(event) => setFormatField("body", "lineHeight", Number(event.target.value))} /></Field>
                  <Field label="段落间距"><Input type="number" value={Number(editor.format.body?.paragraphSpacing ?? 16)} onChange={(event) => setFormatField("body", "paragraphSpacing", Number(event.target.value))} /></Field>
                  <Field label="字间距"><Input type="number" step="0.1" value={Number(editor.format.body?.letterSpacing ?? 0.5)} onChange={(event) => setFormatField("body", "letterSpacing", Number(event.target.value))} /></Field>
                  <Field label="正文颜色"><Input type="color" value={String(editor.format.body?.color ?? "#333333")} onChange={(event) => setFormatField("body", "color", event.target.value)} /></Field>
                  <Field label="对齐">
                    <select
                      aria-label="对齐"
                      className="h-9 w-full rounded-control bg-surface px-3 text-[13.5px] text-ink ring-1 ring-line-strong outline-none"
                      value={String(editor.format.body?.align ?? "justify")}
                      onChange={(event) => setFormatField("body", "align", event.target.value)}
                    >
                      <option value="left">左对齐</option>
                      <option value="justify">两端对齐</option>
                      <option value="center">居中</option>
                    </select>
                  </Field>
                  <Field label="图片圆角"><Input type="number" value={Number(editor.format.image?.borderRadius ?? 4)} onChange={(event) => setFormatField("image", "borderRadius", Number(event.target.value))} /></Field>
                </div>
                {editor.id && !editor.builtin && (
                  <Button size="sm" tone="secondary" onClick={deletePreset} busy={pending === "preset-delete"}>删除这个模板</Button>
                )}
              </>
            )}
          </div>
        )}
      </StudioDialog>
    </div>
  );
}
