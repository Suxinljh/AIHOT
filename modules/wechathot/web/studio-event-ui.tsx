// Shared pieces of the hot list and an event's page: the verification and state labels, the three
// scores, and the small blocks both pages show. The pages own the data and the commands.
import type { ReactNode } from "react";
import { Badge } from "@aihot/web/features/admin/ui";
import { CATEGORY_LABELS } from "@aihot/contracts/taxonomy";
import type { EventManualDecision, EventVerification, StudioEventState } from "../studio-types.ts";

type Tone = "ok" | "warn" | "bad" | "muted" | "accent" | "info";

export function industryLabel(key: string): string {
  return CATEGORY_LABELS[key as keyof typeof CATEGORY_LABELS] ?? key;
}

export function verificationLabel(status: EventVerification): string {
  return { confirmed: "已确认", unverified: "待核实", disputed: "存在争议" }[status];
}

export function verificationTone(status: EventVerification): Tone {
  return status === "confirmed" ? "ok" : status === "disputed" ? "warn" : "muted";
}

export function decisionLabel(decision: EventManualDecision | null): string {
  if (!decision) return "未判断";
  return { recommend: "推荐", ignore: "忽略", later: "稍后", reported: "已报道" }[decision];
}

const DECISION_TONES: Record<EventManualDecision, Tone> = { recommend: "accent", ignore: "bad", later: "warn", reported: "ok" };

export function decisionTone(decision: EventManualDecision | null): Tone {
  if (!decision) return "muted";
  return DECISION_TONES[decision];
}

export function channelTypeLabel(type: string): string {
  return { official_site: "官网", x: "X", wechat: "公众号", weibo: "微博", github: "GitHub", media: "媒体", custom: "自定义" }[type] ?? type;
}

/** A score the model has not written yet says so instead of showing a zero. */
export function scoreText(value: number | null): string {
  return value === null ? "待评分" : value.toFixed(1);
}

export function scoreTone(value: number | null): Tone {
  if (value === null) return "muted";
  if (value >= 80) return "ok";
  if (value >= 60) return "info";
  return "muted";
}

export function EventVerificationBadge({ status, updated = false }: { status: EventVerification; updated?: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge tone={verificationTone(status)}>{verificationLabel(status)}</Badge>
      {updated && <Badge tone="accent">已更新</Badge>}
    </span>
  );
}

export function EventStateBadges({ state, pitchCount = 0 }: { state: StudioEventState; pitchCount?: number }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {state.read && <Badge tone="muted">已读</Badge>}
      {state.starred && <Badge tone="accent">已收藏</Badge>}
      {state.ignored && <Badge tone="bad">已忽略</Badge>}
      {state.followUp && <Badge tone="warn">关注后续</Badge>}
      {state.manualDecision && <Badge tone={decisionTone(state.manualDecision)}>{decisionLabel(state.manualDecision)}</Badge>}
      {pitchCount > 0 && <Badge tone="info">{pitchCount} 个选题</Badge>}
    </span>
  );
}

/** The three scores side by side; none of them replaces another. */
export function EventScoreGrid({ heat, newsValue, recommendation }: { heat: number | null; newsValue: number | null; recommendation: number | null }) {
  const entries: Array<{ label: string; value: number | null; hint: string }> = [
    { label: "新闻价值", value: newsValue, hint: "沿用 AIHOT 精选分" },
    { label: "热度", value: heat, hint: "基于已采集信源的估计" },
    { label: "选题推荐分", value: recommendation, hint: "事件级评分，单独给出" },
  ];
  return (
    <dl className="grid grid-cols-3 gap-2">
      {entries.map((entry) => (
        <div key={entry.label} className="min-w-0 rounded-control bg-bg-sunk px-2.5 py-2">
          <dt className="truncate text-[11px] text-ink-4" title={entry.hint}>{entry.label}</dt>
          <dd className="mt-0.5 text-[15px] font-semibold text-ink">{scoreText(entry.value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function EventSection({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-panel bg-surface p-4 ring-1 ring-line sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[14px] font-semibold text-ink">{title}</h2>
        {right && <div className="shrink-0 text-[11.5px] text-ink-4">{right}</div>}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}
