// Shared pieces for the brand library and a brand's detail page: the mark, the labels, the create/edit
// fields, the modal frame and the empty panels. The pages own the data and the commands.
import { useEffect, useId, type ComponentType, type ReactNode } from "react";
import { BrandMark } from "@aihot/web/components/BrandMark";
import { IconClose } from "@aihot/web/components/icons";
import { Badge, Button, Field, Input, Select, Textarea } from "@aihot/web/features/admin/ui";
import { CATEGORY_KEYS, CATEGORY_LABELS } from "@aihot/contracts/taxonomy";
import type { BrandDetail, BrandListItem, VerificationStatus } from "../studio-types.ts";

type Tone = "ok" | "warn" | "bad" | "muted" | "accent" | "info";

export function brandInitial(name: string): string {
  return Array.from(name.trim())[0]?.toUpperCase() ?? "?";
}

export function hostOf(url: string | null): string {
  if (!url) return "—";
  try {
    return new URL(url).host.replace(/^www\./i, "");
  } catch {
    return url;
  }
}

export function industryLabel(key: string): string {
  return CATEGORY_LABELS[key as keyof typeof CATEGORY_LABELS] ?? key;
}

export function verificationLabel(status: VerificationStatus): string {
  return { verified: "已验证官方", user: "用户指定", pending: "待验证", unavailable: "暂不可用" }[status];
}

const VERIFICATION_TONES: Record<VerificationStatus, Tone> = { verified: "ok", user: "accent", pending: "warn", unavailable: "muted" };

export function verificationTone(status: VerificationStatus): Tone {
  return VERIFICATION_TONES[status];
}

export function channelTypeLabel(type: string): string {
  return { official_site: "官网", x: "X", wechat: "公众号", weibo: "微博", github: "GitHub", media: "媒体", custom: "自定义" }[type] ?? type;
}

export function availabilityLabel(availability: string): string {
  return { available: "可用", unavailable: "不可用", unknown: "待确认" }[availability] ?? availability;
}

export function availabilityTone(availability: string): Tone {
  return availability === "available" ? "ok" : availability === "unavailable" ? "bad" : "muted";
}

export function followRuleLabel(rule: string): string {
  return { all: "全部更新", major: "仅重大事件", selected: "指定发布事件", keywords: "自定义关键词" }[rule] ?? rule;
}

export function followFrequencyLabel(frequency: string): string {
  return { immediate: "即时", daily: "每日", weekly: "每周" }[frequency] ?? frequency;
}

export function eventVerificationLabel(status: string): string {
  return { confirmed: "已确认", unverified: "待确认", disputed: "有争议" }[status] ?? status;
}

export function eventVerificationTone(status: string): Tone {
  return status === "confirmed" ? "ok" : status === "disputed" ? "warn" : "muted";
}

export function BrandAvatar({ brand, size = 40, className = "" }: { brand: Pick<BrandListItem, "name" | "logoUrl">; size?: number; className?: string }) {
  const src = brand.logoUrl;
  return (
    <BrandMark
      brand={{
        src,
        monogram: brandInitial(brand.name),
        raster: !!src && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(src),
      }}
      size={size}
      className={className}
    />
  );
}

export function EmptyPanel({ icon: Icon, title, body, action }: { icon?: ComponentType<{ size?: number }>; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-line-strong bg-surface/60 px-5 py-10 text-center">
      {Icon && (
        <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Icon size={20} />
        </div>
      )}
      <h3 className={`${Icon ? "mt-3" : ""} text-[15px] font-semibold text-ink`}>{title}</h3>
      <p className="mx-auto mt-1.5 max-w-[36em] text-[13px] leading-[1.75] text-ink-3">{body}</p>
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export interface BrandDraft {
  name: string;
  aliases: string;
  industries: string[];
  website: string;
  logoUrl: string;
  entityId: string;
  verifiedStatus: VerificationStatus;
  notes: string;
}

export function emptyBrandDraft(): BrandDraft {
  return { name: "", aliases: "", industries: [], website: "", logoUrl: "", entityId: "", verifiedStatus: "user", notes: "" };
}

export function brandDraft(brand: BrandDetail | BrandListItem): BrandDraft {
  return {
    name: brand.name,
    aliases: brand.aliases.join("，"),
    industries: [...brand.industries],
    website: brand.website ?? "",
    logoUrl: brand.logoUrl ?? "",
    entityId: brand.entityId ?? "",
    verifiedStatus: brand.verifiedStatus,
    notes: "notes" in brand ? brand.notes ?? "" : "",
  };
}

export function brandPayload(draft: BrandDraft) {
  return {
    name: draft.name.trim(),
    aliases: draft.aliases.split(/[,，\n]/).map((value) => value.trim()).filter(Boolean),
    industries: draft.industries,
    website: draft.website.trim() || null,
    logoUrl: draft.logoUrl.trim() || null,
    entityId: draft.entityId.trim() || null,
    verifiedStatus: draft.verifiedStatus,
    notes: draft.notes.trim() || null,
  };
}

export function BrandFormFields({ draft, setDraft, autoFocus = false }: { draft: BrandDraft; setDraft: (next: BrandDraft) => void; autoFocus?: boolean }) {
  const set = <K extends keyof BrandDraft>(key: K, value: BrandDraft[K]) => setDraft({ ...draft, [key]: value });
  const toggleIndustry = (key: string) => {
    set("industries", draft.industries.includes(key) ? draft.industries.filter((value) => value !== key) : [...draft.industries, key]);
  };
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="规范名称" hint="事件归组和搜索优先使用这个名称">
          <Input autoFocus={autoFocus} value={draft.name} onChange={(event) => set("name", event.target.value)} placeholder="例如：OpenAI" />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="别名" hint="用逗号分隔；同一品牌的产品名、英文名和曾用名都可以放这里">
          <Input value={draft.aliases} onChange={(event) => set("aliases", event.target.value)} placeholder="例如：Open AI，ChatGPT 母公司" />
        </Field>
      </div>
      <fieldset className="sm:col-span-2">
        <legend className="mb-1.5 block text-[12.5px] font-medium text-ink-2">关联行业</legend>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_KEYS.map((key) => {
            const checked = draft.industries.includes(key);
            return (
              <label key={key} className={`cursor-pointer rounded-full px-3 py-1 text-[12.5px] ring-1 transition-colors ${checked ? "bg-ink text-bg ring-ink" : "bg-surface text-ink-2 ring-line hover:bg-bg-sunk"}`}>
                <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleIndustry(key)} />
                {CATEGORY_LABELS[key]}
              </label>
            );
          })}
        </div>
        <p className="mt-1 text-[12px] text-ink-4">可多选；留空表示暂未分类。</p>
      </fieldset>
      <Field label="官网" hint="http(s) 地址，留空表示还没有确认">
        <Input value={draft.website} onChange={(event) => set("website", event.target.value)} placeholder="https://example.com/" inputMode="url" />
      </Field>
      <Field label="Logo 地址" hint="http(s) 图片地址，留空时显示名称首字">
        <Input value={draft.logoUrl} onChange={(event) => set("logoUrl", event.target.value)} placeholder="https://example.com/logo.png" inputMode="url" />
      </Field>
      <Field label="实体 ID" hint="对应 ENTITIES 的 id，可留空">
        <Input value={draft.entityId} onChange={(event) => set("entityId", event.target.value)} placeholder="例如：openai" spellCheck={false} />
      </Field>
      <Field label="验证状态" hint="只有确认过官方身份时才选「已验证官方」">
        <Select value={draft.verifiedStatus} onChange={(event) => set("verifiedStatus", event.target.value as VerificationStatus)}>
          <option value="user">用户指定</option>
          <option value="verified">已验证官方</option>
          <option value="pending">待验证</option>
          <option value="unavailable">暂不可用</option>
        </Select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="备注" hint="记录判断依据、产品线或需要继续确认的信息">
          <Textarea value={draft.notes} onChange={(event) => set("notes", event.target.value)} rows={3} placeholder="可选" />
        </Field>
      </div>
    </div>
  );
}

export function StudioDialog({
  open,
  title,
  description,
  children,
  onClose,
  onSubmit,
  busy = false,
  submitLabel = "保存",
  submitDisabled = false,
  danger = false,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  onSubmit: () => void;
  busy?: boolean;
  submitLabel?: string;
  submitDisabled?: boolean;
  danger?: boolean;
}) {
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, busy, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[75] flex items-end justify-center p-3 sm:items-center">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={() => !busy && onClose()} />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy && !submitDisabled) onSubmit();
        }}
        className="relative max-h-[min(90dvh,880px)] w-full max-w-2xl overflow-y-auto rounded-sheet bg-raised p-5 shadow-2xl ring-1 ring-line-strong"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-[16px] font-semibold text-ink">{title}</h2>
            {description && <p className="mt-1.5 text-[13px] leading-relaxed text-ink-3">{description}</p>}
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="关闭" className="rounded-full p-1 text-ink-4 transition-colors hover:bg-bg-sunk hover:text-ink disabled:opacity-40">
            <IconClose size={18} />
          </button>
        </div>
        <div className="mt-4">{children}</div>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" tone="ghost" onClick={onClose} disabled={busy}>取消</Button>
          <Button type="submit" tone={danger ? "danger" : "primary"} busy={busy} disabled={submitDisabled}>{submitLabel}</Button>
        </div>
      </form>
    </div>
  );
}

export function IndustryBadges({ industries }: { industries: string[] }) {
  if (!industries.length) return <Badge tone="muted">未分类</Badge>;
  return (
    <>
      {industries.map((industry) => (
        <Badge key={industry} tone="info">{industryLabel(industry)}</Badge>
      ))}
    </>
  );
}
