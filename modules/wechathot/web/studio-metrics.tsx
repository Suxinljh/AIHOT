// The workbench's own numbers. Every rate says what it divides by, and an empty range says so instead
// of showing a row of zeros.
import { Link, useLoaderData, type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { adminGet } from "@aihot/web/lib/admin.server";
import { Badge, FilterChips } from "@aihot/web/features/admin/ui";
import type { StudioMetrics } from "../metrics.ts";
import { STUDIO_PRODUCT, studioMeta } from "./studio-nav";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const days = url.searchParams.get("days") ?? "30";
  return { days, metrics: await adminGet<StudioMetrics>(request, `/api/studio/metrics?days=${encodeURIComponent(days)}`) };
}

export const meta: MetaFunction = () => studioMeta("内容与成本");

function percent(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

function money(value: number | null, currency: string | null): string {
  if (value === null) return "—";
  return `${value.toFixed(2)} ${currency ?? ""}`.trim();
}

function Card({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-panel bg-surface p-4 ring-1 ring-line">
      <div className="text-[11.5px] text-ink-4">{label}</div>
      <div className="mt-1 text-[24px] font-black tracking-[-0.02em] text-ink">{value}</div>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-4">{hint}</p>
    </div>
  );
}

export default function StudioMetricsPage() {
  const { days, metrics } = useLoaderData<typeof loader>();
  const empty = metrics.topics.created === 0 && metrics.articles.created === 0 && metrics.collection.items === 0 && metrics.cost.total === null;

  return (
    <div>
      <header className="min-w-0">
        <div className="mono text-[11px] uppercase tracking-[0.18em] text-ink-4">{STUDIO_PRODUCT} / Studio</div>
        <h1 className="mt-2 text-[28px] font-black leading-[1.2] tracking-[-0.03em] text-ink sm:text-[34px]">内容与成本</h1>
        <p className="mt-3 max-w-[52em] text-[14px] leading-[1.8] text-ink-3">
          选题采纳、草稿完成、人工改写与模型开销，全部来自工作台自己的表、回执和采集记录。
        </p>
      </header>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <FilterChips param="days" options={[{ value: "7", label: "近 7 天" }, { value: "30", label: "近 30 天" }, { value: "90", label: "近 90 天" }]} />
        <Link to="/studio/settings" className="text-[12.5px] text-ink-4 hover:text-ink">返回设置</Link>
      </div>

      {empty ? (
        <section className="mt-6 rounded-panel border border-dashed border-line-strong bg-surface/60 px-5 py-12 text-center sm:px-8 sm:py-16">
          <h2 className="text-[17px] font-semibold text-ink">这个时间段还没有数据</h2>
          <p className="mx-auto mt-2 max-w-[38em] text-[13.5px] leading-[1.8] text-ink-3">
            选题、稿件、采集和模型调用发生后，这里才会有数字；空区间不显示成 0。
          </p>
        </section>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Card label="选题采纳率" value={percent(metrics.topics.adoptionRate)} hint={`${metrics.topics.adopted} / ${metrics.topics.created} 个选题已生成稿件`} />
            <Card label="草稿完成率" value={percent(metrics.articles.completionRate)} hint={`${metrics.articles.done} / ${metrics.articles.created} 篇稿件标记为已完成`} />
            <Card label="人工改写率" value={percent(metrics.articles.rewriteRate)} hint={`${metrics.articles.rewritten} / ${metrics.articles.created} 篇有过手动修改`} />
            <Card label="单篇模型成本" value={money(metrics.cost.perArticle, metrics.cost.currency)} hint="模型回执总和 ÷ 有回执的稿件数" />
            <Card label="每百条采集成本" value={money(metrics.cost.perHundredItems, metrics.cost.currency)} hint={`模型回执总和 ÷ ${metrics.collection.items} 条采集 × 100`} />
            <Card label="采集量" value={String(metrics.collection.items)} hint="时间段内新发现的资料条数" />
          </div>

          <section className="mt-5 rounded-panel bg-surface p-4 ring-1 ring-line sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[14px] font-semibold text-ink">按用途拆分</h2>
              <Badge tone="muted">总成本 {money(metrics.cost.total, metrics.cost.currency)}</Badge>
            </div>
            {metrics.cost.byPurpose.length ? (
              <ul className="mt-3 divide-y divide-line-soft">
                {metrics.cost.byPurpose.map((row) => (
                  <li key={row.purpose} className="flex items-center justify-between gap-3 py-2 text-[12.5px]">
                    <span className="mono text-ink-2">{row.purpose}</span>
                    <span className="text-ink-4">{row.requests} 次</span>
                    <span className="font-medium text-ink">{money(row.amount, metrics.cost.currency)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[13px] text-ink-4">这段时间没有带成本的模型回执。</p>
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-ink-4">
              成本来自 providers/receipts 记录的金额（actual 或 estimated）；没有金额的回执不计入。比率的分母为 0 时显示「—」。
            </p>
          </section>
        </>
      )}
    </div>
  );
}
