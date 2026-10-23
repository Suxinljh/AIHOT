// The studio's source view: every source with its health, its last success and its errors, and the
// commands that change it. The state is the engine's own; the studio only reads and commands.
import { useState } from "react";
import { Link, useLoaderData, useSearchParams, type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { IconExternal, IconHistory, IconPlug } from "@aihot/web/components/icons";
import { adminGet } from "@aihot/web/lib/admin.server";
import { Badge, Button, ButtonLink, Field, Input, Select } from "@aihot/web/features/admin/ui";
import { fullDateTime, relativeTime } from "@aihot/web/lib/format";
import { STUDIO_PRODUCT, studioMeta } from "./studio-nav";

interface SourceRow {
  id: string;
  name: string;
  kind: string;
  tier: string;
  participation_mode: string;
  enabled: boolean;
  health: string;
  fail_count: number;
  interval_minutes: number;
  last_ok_at: string | null;
  last_fetch_at: string | null;
  last_error: string | null;
  first_party: boolean;
  next_fetch_at: string | null;
  items_7d: number;
  selected_30d: number;
  updated_at: string;
}

interface SourceList {
  page: number;
  rows: SourceRow[];
  totals: { total: number; enabled: number; failing: number; degraded: number };
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const kind = url.searchParams.get("kind") ?? "";
  const health = url.searchParams.get("health") ?? "";
  const enabled = url.searchParams.get("enabled") ?? "";
  const search = new URLSearchParams();
  if (query) search.set("q", query);
  if (kind) search.set("kind", kind);
  if (health) search.set("health", health);
  if (enabled) search.set("enabled", enabled);
  const suffix = search.size ? `?${search}` : "";
  const sources = await adminGet<SourceList>(request, `/api/admin/sources${suffix}`);
  return { sources };
}

export const meta: MetaFunction = () => studioMeta("关注与信源");

const HEALTH_LABEL: Record<string, string> = {
  ok: "正常",
  degraded: "不稳定",
  failing: "失败",
  paused: "已暂停",
  unknown: "未抓取",
};
const HEALTH_TONE: Record<string, "ok" | "warn" | "bad" | "muted"> = {
  ok: "ok",
  degraded: "warn",
  failing: "bad",
  paused: "muted",
  unknown: "muted",
};
/** What a source costs: the paid and the limited ones say so. */
const KIND_NOTE: Record<string, string> = {
  mp_account: "按请求计费",
  x_search: "外部检索·有限额",
};

export default function StudioSources() {
  const { sources } = useLoaderData<typeof loader>();
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [busy, setBusy] = useState<string | null>(null);

  const stats = [
    { label: "全部", value: sources.totals.total },
    { label: "启用", value: sources.totals.enabled },
    { label: "失败", value: sources.totals.failing },
    { label: "不稳定", value: sources.totals.degraded },
  ];

  return (
    <div>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mono text-[11px] uppercase tracking-[0.18em] text-ink-4">{STUDIO_PRODUCT} / Studio</div>
          <h1 className="mt-2 text-[28px] font-black leading-[1.2] tracking-[-0.03em] text-ink sm:text-[34px]">关注与信源</h1>
          <p className="mt-3 max-w-[52em] text-[14px] leading-[1.8] text-ink-3">
            每个信源的状态、失败原因和最近的抓取都在这里。信源出问题会同时留下一条通知。
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <ButtonLink to="/sources/new" tone="primary">添加信源</ButtonLink>
            <ButtonLink to="/brands" tone="secondary">打开品牌库</ButtonLink>
          </div>
        </div>
        <form
          className="flex w-full max-w-[420px] items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const next = new URLSearchParams(params);
            if (query.trim()) next.set("q", query.trim());
            else next.delete("q");
            const search = next.toString();
            window.location.href = search ? `/sources?${search}` : "/sources";
          }}
        >
          <div className="flex-1">
            <Field label="搜索信源">
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="名称、地址或类型" />
            </Field>
          </div>
          <Button type="submit" tone="secondary">搜索</Button>
        </form>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-card border border-line bg-surface px-4 py-3">
            <div className="mono text-[11px] uppercase tracking-[0.14em] text-ink-4">{stat.label}</div>
            <div className="num mt-1 text-[20px] font-semibold text-ink">{stat.value}</div>
          </div>
        ))}
      </div>

      {sources.rows.length === 0 ? (
        <section className="mt-6 rounded-card border border-dashed border-line-strong bg-surface/60 px-5 py-12 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
            <IconPlug size={22} />
          </div>
          <h2 className="mt-4 text-[17px] font-semibold text-ink">还没有信源</h2>
          <p className="mx-auto mt-2 max-w-[38em] text-[13.5px] leading-[1.8] text-ink-3">添加一个 RSS、官网或 GitHub 仓库后，这里会显示它的健康状态。</p>
        </section>
      ) : (
        <ul className="mt-6 space-y-3">
          {sources.rows.map((row) => (
            <li key={row.id} className="rounded-card border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={HEALTH_TONE[row.health] ?? "muted"}>{HEALTH_LABEL[row.health] ?? row.health}</Badge>
                <Badge tone="muted">{row.kind}</Badge>
                {row.first_party && <Badge tone="info">一手</Badge>}
                {!row.enabled && <Badge tone="muted">已停用</Badge>}
                {KIND_NOTE[row.kind] && <Badge tone="warn">{KIND_NOTE[row.kind]}</Badge>}
              </div>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Link to={`/sources/${row.id}`} className="text-[15px] font-semibold text-ink hover:text-accent">{row.name}</Link>
                <span className="mono text-[11.5px] text-ink-4">{row.id}</span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[12.5px] sm:grid-cols-4">
                <div>
                  <dt className="text-ink-4">上次成功</dt>
                  <dd className="text-ink-2">{row.last_ok_at ? relativeTime(row.last_ok_at) : "—"}</dd>
                </div>
                <div>
                  <dt className="text-ink-4">上次抓取</dt>
                  <dd className="text-ink-2">{row.last_fetch_at ? relativeTime(row.last_fetch_at) : "—"}</dd>
                </div>
                <div>
                  <dt className="text-ink-4">7 天条目</dt>
                  <dd className="num text-ink-2">{row.items_7d}</dd>
                </div>
                <div>
                  <dt className="text-ink-4">30 天精选</dt>
                  <dd className="num text-ink-2">{row.selected_30d}</dd>
                </div>
              </dl>
              {row.last_error && (
                <p className="mt-2 text-[12.5px] leading-[1.7] text-bad">
                  {row.health === "failing" ? "失败" : "警告"} {row.fail_count} 次：{row.last_error}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  tone="secondary"
                  busy={busy === `fetch-${row.id}`}
                  onClick={async () => {
                    setBusy(`fetch-${row.id}`);
                    await fetch(`/api/admin/sources/${encodeURIComponent(row.id)}/fetch`, {
                      method: "POST",
                      credentials: "same-origin",
                      headers: { "content-type": "application/json", "x-csrf-token": (window as unknown as { __csrf?: string }).__csrf ?? "" },
                    });
                    setBusy(null);
                  }}
                >
                  <IconHistory size={13} /> 立即抓取
                </Button>
                {row.health === "failing" && (
                  <Button size="sm" tone="secondary">
                    重试抓取
                  </Button>
                )}
                <a
                  href={`/admin/sources/${encodeURIComponent(row.id)}`}
                  className="inline-flex items-center gap-1 text-[12.5px] text-accent hover:underline"
                >
                  <IconExternal size={12} /> 详情
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
