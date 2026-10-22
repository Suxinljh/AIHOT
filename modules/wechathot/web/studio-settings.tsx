import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Link, useLoaderData } from "react-router";
import { IconDoc, IconGrid, IconSparkles } from "@aihot/web/components/icons";
import { adminGet } from "@aihot/web/lib/admin.server";
import type { StylePreset, StudioPresets } from "../studio-types.ts";
import { STUDIO_PRODUCT, studioMeta } from "./studio-nav";

export async function loader({ request }: LoaderFunctionArgs) {
  return { presets: await adminGet<StudioPresets>(request, "/api/studio/presets") };
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

function WritingCard({ preset }: { preset: StylePreset }) {
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

function FormatCard({ preset }: { preset: StylePreset }) {
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
        <BuiltinBadge preset={preset} />
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

export default function StudioSettings() {
  const { presets } = useLoaderData<typeof loader>();
  const writing = presets.writing;
  const formatting = presets.format;

  return (
    <div>
      <header className="max-w-[760px]">
        <div className="mono text-[11px] uppercase tracking-[0.18em] text-ink-4">{STUDIO_PRODUCT} / Studio</div>
        <h1 className="mt-2 text-[28px] font-black leading-[1.2] tracking-[-0.03em] text-ink sm:text-[34px]">设置</h1>
        <p className="mt-3 text-[14px] leading-[1.8] text-ink-3">写作风格、排版预设、评分偏好和采集通知。当前先接入内置预设，自定义与模型配置会逐步放进这里。</p>
        <div className="mt-3"><Link to="/studio/metrics" className="text-[12.5px] text-accent hover:underline">内容与成本指标</Link></div>
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
          <span className="mono rounded-full border border-line bg-bg-sunk px-3 py-1 text-[11px] text-ink-4">{writing.length} 个预设</span>
        </div>
        {writing.length ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {writing.map((preset) => <WritingCard key={preset.id} preset={preset} />)}
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
          <span className="mono rounded-full border border-line bg-bg-sunk px-3 py-1 text-[11px] text-ink-4">{formatting.length} 个预设</span>
        </div>
        {formatting.length ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {formatting.map((preset) => <FormatCard key={preset.id} preset={preset} />)}
          </div>
        ) : (
          <div className="mt-4 rounded-card border border-dashed border-line-strong bg-surface/60 px-5 py-10 text-center text-[13px] text-ink-3">
            还没有排版预设。运行工作台种子后，内置预设会出现在这里。
          </div>
        )}
      </section>

      <p className="mt-6 max-w-[760px] text-[12px] leading-[1.8] text-ink-4">
        内置预设只读；自定义预设、模型选择和通知配置会在后续阶段接入。
      </p>
    </div>
  );
}
