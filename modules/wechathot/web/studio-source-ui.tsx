// The studio's source view: health, errors and the commands that change a source. The state comes
// from the engine's own source administration; the studio only shows and drives it.
import { useState } from "react";
import type { AdminSourcePreview, AdminSourceRow } from "@aihot/contracts/admin";
import { KIND_LABEL, HEALTH_LABEL } from "@aihot/web/features/admin/labels";
import { Badge, Button, healthTone } from "@aihot/web/features/admin/ui";
import { useStudioAction } from "./studio-action";

/** How a source is paid for or limited; the editor should not have to guess. */
export function sourceAccess(kind: string): { label: string; tone: "ok" | "warn" | "muted" } | null {
  if (kind === "mp_account") return { label: "按请求计费", tone: "warn" };
  if (kind === "x_search") return { label: "外部检索·有限额", tone: "muted" };
  if (kind === "external") return { label: "外部推送", tone: "muted" };
  return null;
}

export function sourceHealthLabel(row: Pick<AdminSourceRow, "enabled" | "health">): string {
  return row.enabled ? HEALTH_LABEL[row.health] ?? row.health : "已暂停";
}

export function sourceHealthTone(row: Pick<AdminSourceRow, "enabled" | "health">) {
  return row.enabled ? healthTone(row.health) : "muted" as const;
}

const INTERVALS = [15, 30, 60, 180, 360, 1440];

/** The commands one source offers: preview, collect now, pause and the interval. */
export function useSourceActions() {
  const { run, pending } = useStudioAction();
  const [preview, setPreview] = useState<AdminSourcePreview | null>(null);
  const [previewFor, setPreviewFor] = useState<string | null>(null);

  async function trySource(id: string) {
    const result = await run<AdminSourcePreview>("POST", `/api/admin/sources/${encodeURIComponent(id)}/preview`, undefined, {
      label: `source-preview-${id}`,
    });
    if (!result) return;
    setPreview(result);
    setPreviewFor(id);
  }

  async function collectNow(id: string) {
    await run("POST", `/api/admin/sources/${encodeURIComponent(id)}/fetch`, undefined, { label: `source-fetch-${id}`, success: "已安排抓取" });
  }

  async function setEnabled(id: string, version: string, enabled: boolean) {
    await run("PATCH", `/api/admin/sources/${encodeURIComponent(id)}`, { patch: { enabled }, version }, {
      label: `source-enable-${id}`,
      success: enabled ? "信源已启用" : "信源已暂停",
    });
  }

  async function setInterval(id: string, version: string, minutes: number) {
    await run("PATCH", `/api/admin/sources/${encodeURIComponent(id)}`, { patch: { interval_minutes: minutes }, version }, {
      label: `source-interval-${id}`,
      success: "抓取频率已更新",
    });
  }

  return { trySource, collectNow, setEnabled, setInterval, preview, previewFor, closePreview: () => setPreview(null), busy: pending };
}

export function SourceCommands({
  source,
  actions,
  version,
  className = "",
}: {
  source: Pick<AdminSourceRow, "id" | "enabled" | "health" | "interval_minutes">;
  actions: ReturnType<typeof useSourceActions>;
  version: string;
  className?: string;
}) {
  const failing = source.enabled && source.health === "failing";
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <Button size="sm" tone="secondary" busy={actions.busy === `source-preview-${source.id}`} onClick={() => actions.trySource(source.id)}>试抓</Button>
      <Button size="sm" tone={failing ? "primary" : "secondary"} busy={actions.busy === `source-fetch-${source.id}`} onClick={() => actions.collectNow(source.id)}>
        {failing ? "重试抓取" : "立即抓取"}
      </Button>
      <Button
        size="sm"
        tone={source.enabled ? "secondary" : "primary"}
        busy={actions.busy === `source-enable-${source.id}`}
        onClick={() => actions.setEnabled(source.id, version, !source.enabled)}
      >
        {source.enabled ? "暂停" : "启用"}
      </Button>
      <select
        aria-label="抓取频率"
        value={source.interval_minutes}
        onChange={(event) => actions.setInterval(source.id, version, Number(event.target.value))}
        className="h-7 rounded-control bg-surface px-2 text-[12.5px] text-ink ring-1 ring-line-strong outline-none"
      >
        {INTERVALS.map((minutes) => <option key={minutes} value={minutes}>{minutes} 分钟</option>)}
      </select>
    </div>
  );
}

export function SourcePreviewPanel({ preview, onClose }: { preview: AdminSourcePreview | null; onClose: () => void }) {
  if (!preview) return null;
  return (
    <div className="fixed inset-0 z-[75] flex items-end justify-center p-3 sm:items-center">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="试抓结果" className="relative max-h-[min(80dvh,720px)] w-full max-w-2xl overflow-y-auto rounded-sheet bg-raised p-5 shadow-2xl ring-1 ring-line-strong">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-semibold text-ink">试抓结果</h2>
            <p className="mt-1.5 text-[13px] text-ink-3">{preview.count} 条候选，用时 {preview.ms} 毫秒。试抓不会保存任何内容。</p>
          </div>
          <Button tone="ghost" onClick={onClose}>关闭</Button>
        </div>
        {preview.items.length ? (
          <ul className="mt-4 space-y-2">
            {preview.items.map((item) => (
              <li key={item.url} className="rounded-control bg-bg-sunk px-3 py-2">
                <a href={item.url} target="_blank" rel="noreferrer" className="text-[13px] font-medium text-ink hover:text-accent">{item.title || item.url}</a>
                {item.excerpt && <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-ink-3">{item.excerpt}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-[13px] text-ink-4">这个信源这次没有取到内容。可以先调整频率或稍后重试。</p>
        )}
      </div>
    </div>
  );
}

export function SourceBadges({ source }: { source: Pick<AdminSourceRow, "kind" | "tier" | "participation_mode" | "first_party"> }) {
  const access = sourceAccess(source.kind);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge tone="muted">{KIND_LABEL[source.kind] ?? source.kind}</Badge>
      <Badge tone="info">{source.tier.replace("_", ".")}</Badge>
      {source.first_party && <Badge tone="ok">一手</Badge>}
      {access && <Badge tone={access.tone}>{access.label}</Badge>}
    </div>
  );
}
