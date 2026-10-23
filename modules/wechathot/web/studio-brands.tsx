// The private brand library: search, industry and follow filters, the create form and the merge
// command. A brand's detail page owns channels, related events and follow state.
import { useState } from "react";
import { Form, Link, useLoaderData, useNavigate, useSearchParams, type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { IconChevronRight, IconSearch, IconUsers } from "@aihot/web/components/icons";
import { CATEGORY_KEYS, CATEGORY_LABELS } from "@aihot/contracts/taxonomy";
import { adminGet } from "@aihot/web/lib/admin.server";
import { Badge, Button, ButtonLink, Field, FilterChips, Input, Select, Textarea } from "@aihot/web/features/admin/ui";
import type { BrandDetail, BrandListItem, BrandMergeResult } from "../studio-types.ts";
import { STUDIO_PRODUCT, studioMeta } from "./studio-nav";
import { useStudioAction } from "./studio-action";
import {
  BrandAvatar,
  BrandFormFields,
  EmptyPanel,
  IndustryBadges,
  StudioDialog,
  brandPayload,
  emptyBrandDraft,
  hostOf,
  verificationLabel,
  verificationTone,
  type BrandDraft,
} from "./studio-brand-ui";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const query = url.search;
  const list = await adminGet<{ items: BrandListItem[] }>(request, `/api/studio/brands${query}`);
  const all = query ? await adminGet<{ items: BrandListItem[] }>(request, "/api/studio/brands") : list;
  return { items: list.items, all: all.items };
}

export const meta: MetaFunction = () => studioMeta("品牌库");

function withoutParam(params: URLSearchParams, key: string): string {
  const next = new URLSearchParams(params);
  next.delete(key);
  return next.size ? `?${next}` : "/brands";
}

export default function StudioBrands() {
  const { items, all } = useLoaderData<typeof loader>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { run, pending } = useStudioAction();
  const q = params.get("q") ?? "";
  const industry = params.get("industry") ?? "";
  const followed = params.get("followed") ?? "";
  const followedCount = all.filter((brand) => brand.followed).length;

  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<BrandDraft>(emptyBrandDraft);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeFrom, setMergeFrom] = useState("");
  const [mergeInto, setMergeInto] = useState("");
  const [mergeReason, setMergeReason] = useState("");

  function openCreate() {
    setDraft(emptyBrandDraft());
    setCreateOpen(true);
  }

  async function createBrand() {
    const created = await run<BrandDetail>("POST", "/api/studio/brands", brandPayload(draft), {
      label: "brand-create",
      success: "品牌已创建",
    });
    if (!created) return;
    setCreateOpen(false);
    navigate(`/brands/${encodeURIComponent(created.id)}`);
  }

  function openMerge() {
    setMergeFrom("");
    setMergeInto("");
    setMergeReason("");
    setMergeOpen(true);
  }

  async function mergeBrands() {
    if (!mergeFrom || !mergeInto || mergeFrom === mergeInto) return;
    const merged = await run<BrandMergeResult>("POST", "/api/studio/brands/merge", {
      from: mergeFrom,
      into: mergeInto,
      reason: mergeReason.trim() || undefined,
    }, {
      label: "brand-merge",
      success: "品牌已合并",
    });
    if (!merged) return;
    setMergeOpen(false);
    navigate(`/brands/${encodeURIComponent(merged.brand.id)}`);
  }

  function chooseIndustry(value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set("industry", value);
    else next.delete("industry");
    navigate(`?${next}`, { preventScrollReset: true });
  }

  return (
    <div>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mono text-[11px] uppercase tracking-[0.18em] text-ink-4">{STUDIO_PRODUCT} / Studio / 关注与信源</div>
          <h1 className="mt-2 text-[28px] font-black leading-[1.2] tracking-[-0.03em] text-ink sm:text-[34px]">品牌库</h1>
          <p className="mt-3 max-w-[720px] text-[14px] leading-[1.8] text-ink-3">
            统一管理品牌名称、别名、行业和关注状态。品牌是事件归组、渠道发现和选题筛选的共同坐标。
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button tone="secondary" onClick={openMerge} disabled={all.length < 2} title={all.length < 2 ? "至少需要两个品牌才能合并" : undefined}>
            合并品牌
          </Button>
          <Button tone="primary" onClick={openCreate}>新建品牌</Button>
        </div>
      </header>

      <div className="mt-5 flex flex-wrap items-center gap-2 text-[12px] text-ink-3">
        <span className="rounded-full bg-bg-sunk px-3 py-1">全部 <b className="font-semibold text-ink">{all.length}</b></span>
        <span className="rounded-full bg-bg-sunk px-3 py-1">已关注 <b className="font-semibold text-ink">{followedCount}</b></span>
        {(q || industry || followed) && <span className="rounded-full bg-accent-soft px-3 py-1 text-accent">当前筛选 <b className="font-semibold">{items.length}</b></span>}
      </div>

      <section className="mt-5 rounded-panel bg-surface p-3 ring-1 ring-line">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <Form method="get" action="/brands" preventScrollReset className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {industry && <input type="hidden" name="industry" value={industry} />}
            {followed && <input type="hidden" name="followed" value={followed} />}
            <Input key={q} name="q" defaultValue={q} placeholder="搜索品牌、别名" aria-label="搜索品牌" className="max-w-[360px]" />
            <Button type="submit" tone="secondary">搜索</Button>
            {q && <ButtonLink to={withoutParam(params, "q")} tone="ghost">清除关键词</ButtonLink>}
          </Form>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={industry} onChange={(event) => chooseIndustry(event.target.value)} aria-label="按行业筛选" className="w-auto min-w-[138px]">
              <option value="">全部行业</option>
              {CATEGORY_KEYS.map((key) => <option key={key} value={key}>{CATEGORY_LABELS[key]}</option>)}
            </Select>
            <FilterChips param="followed" options={[{ value: "", label: "全部" }, { value: "true", label: "已关注" }, { value: "false", label: "未关注" }]} />
          </div>
        </div>
      </section>

      {all.length === 0 ? (
        <div className="mt-5">
          <EmptyPanel
            icon={IconUsers}
            title="品牌库还是空的"
            body="先建立第一个品牌，之后可以从官网、X、公众号和 GitHub 补充候选渠道，并把报道归到品牌下。"
            action={<Button tone="primary" onClick={openCreate}>新建第一个品牌</Button>}
          />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-5">
          <EmptyPanel
            icon={IconSearch}
            title="没有匹配的品牌"
            body="换个关键词，或清除行业和关注状态筛选。品牌库里的别名也会参与搜索。"
            action={<ButtonLink to="/brands" tone="secondary">清除筛选</ButtonLink>}
          />
        </div>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((brand) => (
            <li key={brand.id} className="min-w-0">
              <Link
                to={`/brands/${encodeURIComponent(brand.id)}`}
                className="group flex h-full flex-col rounded-panel bg-surface p-4 ring-1 ring-line transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <BrandAvatar brand={brand} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="truncate text-[15px] font-semibold text-ink transition-colors group-hover:text-accent">{brand.name}</h2>
                      <IconChevronRight size={16} className="mt-0.5 shrink-0 text-ink-4" />
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge tone={brand.followed ? "accent" : "muted"}>{brand.followed ? "已关注" : "未关注"}</Badge>
                      <Badge tone={verificationTone(brand.verifiedStatus)}>{verificationLabel(brand.verifiedStatus)}</Badge>
                    </div>
                  </div>
                </div>

                {/* Two lines are reserved for aliases so cards line up; the tags below never shrink or get clipped. */}
                <p className="mt-3 line-clamp-2 min-h-[2.7em] shrink-0 break-words text-[12.5px] leading-relaxed text-ink-3">
                  {brand.aliases.length ? `别名：${brand.aliases.join("、")}` : "还没有别名"}
                </p>
                <div className="mt-3 flex shrink-0 flex-wrap gap-1.5"><IndustryBadges industries={brand.industries} /></div>
                <div className="mt-auto flex items-center justify-between gap-3 border-t border-line-soft pt-3 text-[11.5px] text-ink-4">
                  <span className="truncate">{brand.website ? hostOf(brand.website) : brand.entityId ?? "未关联实体"}</span>
                  <span className="mono shrink-0">{brand.id}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <StudioDialog
        open={createOpen}
        title="新建品牌"
        description="品牌 ID 会自动生成；保存后可以继续补充渠道和关注规则。"
        onClose={() => setCreateOpen(false)}
        onSubmit={createBrand}
        busy={pending === "brand-create"}
        submitLabel="创建品牌"
        submitDisabled={!draft.name.trim()}
      >
        <BrandFormFields draft={draft} setDraft={setDraft} autoFocus />
      </StudioDialog>

      <StudioDialog
        open={mergeOpen}
        title="合并品牌"
        description="把重复品牌并入存活品牌。别名、候选渠道、事件关系和关注状态会一起迁移，重复品牌随后删除。"
        onClose={() => setMergeOpen(false)}
        onSubmit={mergeBrands}
        busy={pending === "brand-merge"}
        submitLabel="合并品牌"
        submitDisabled={!mergeFrom || !mergeInto || mergeFrom === mergeInto}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="要合并的品牌" hint="合并后会被删除">
            <Select value={mergeFrom} onChange={(event) => setMergeFrom(event.target.value)}>
              <option value="">选择重复品牌</option>
              {all.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}（{brand.id}）</option>)}
            </Select>
          </Field>
          <Field label="存活品牌" hint="保留这个品牌及其详情页">
            <Select value={mergeInto} onChange={(event) => setMergeInto(event.target.value)}>
              <option value="">选择存活品牌</option>
              {all.map((brand) => <option key={brand.id} value={brand.id} disabled={brand.id === mergeFrom}>{brand.name}（{brand.id}）</option>)}
            </Select>
          </Field>
        </div>
        <div className="mt-4">
          <Field label="合并原因" hint="会写入审计日志，可选">
            <Textarea value={mergeReason} onChange={(event) => setMergeReason(event.target.value)} rows={3} placeholder="例如：同一个公司的中英文名重复建档" />
          </Field>
        </div>
        <div className="mt-4 rounded-control bg-bg-sunk px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-3">
          合并会迁移别名、渠道关联、事件关系、事件筛选缓存和关注状态。原始报道与渠道本身不会被删除。
        </div>
      </StudioDialog>
    </div>
  );
}
