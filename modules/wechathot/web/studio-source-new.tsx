// Adding a source: the GitHub branch. A repository address is checked against the GitHub API first,
// and only a readable releases feed becomes a source.
import { useState } from "react";
import { Link, useRouteError, type MetaFunction } from "react-router";
import { IconArrowLeft, IconGithub, IconInfo } from "@aihot/web/components/icons";
import { Badge, Button, ButtonLink, Field, Input, Select } from "@aihot/web/features/admin/ui";
import { monthDayTime } from "@aihot/web/lib/format";
import { STUDIO_PRODUCT, studioMeta } from "./studio-nav";
import { useStudioAction } from "./studio-action";

interface GithubRelease {
  tag: string;
  name: string | null;
  url: string;
  publishedAt: string | null;
  notes: string | null;
}

interface GithubRepo {
  owner: string;
  repo: string;
  fullName: string;
  htmlUrl: string;
  description: string | null;
  private: boolean;
  archived: boolean;
  fork: boolean;
  ownerType: string;
  defaultBranch: string;
  pushedAt: string | null;
  stars: number;
  releases: GithubRelease[];
}

interface GithubOwner {
  brandId: string | null;
  brandName: string | null;
  reason: string;
  official: boolean;
  candidates: Array<{ id: string; name: string; reason: string }>;
}

interface CheckResult {
  repo: GithubRepo;
  owner: GithubOwner;
}

interface SubscribeResult {
  source: { id: string; name: string };
  preview: { count: number; items: Array<{ title: string; url: string; publishedAt: string | null; excerpt: string | null }> };
  channel: { id: string; displayName: string };
  owner: GithubOwner;
}

export const meta: MetaFunction = () => studioMeta("添加信源");

export function ErrorBoundary() {
  const error = useRouteError();
  const detail = typeof error === "object" && error && "message" in error ? String((error as { message: unknown }).message) : "";
  return (
    <div className="rounded-panel bg-surface p-6 text-center ring-1 ring-line">
      <h1 className="text-[18px] font-semibold text-ink">无法打开添加信源</h1>
      <p className="mt-2 text-[13px] text-ink-3">{detail || "稍后再试。"}</p>
      <div className="mt-4 flex justify-center">
        <ButtonLink to="/sources" tone="primary">回到信源列表</ButtonLink>
      </div>
    </div>
  );
}

export default function StudioSourceNew() {
  const { run, pending } = useStudioAction();
  const [url, setUrl] = useState("");
  const [checked, setChecked] = useState<CheckResult | null>(null);
  const [brandId, setBrandId] = useState<string>("");
  const [created, setCreated] = useState<SubscribeResult | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  async function check() {
    setCreated(null);
    setProblem(null);
    const result = await run<CheckResult>("POST", "/api/studio/sources/github/check", { url: url.trim() }, { label: "github-check" });
    if (!result) {
      setProblem("这个地址没能通过校验，请检查后重试。");
      return;
    }
    setChecked(result);
    setBrandId(result.owner.brandId ?? "");
  }

  async function subscribe() {
    setProblem(null);
    const result = await run<SubscribeResult>("POST", "/api/studio/sources/github", { url: url.trim(), brandId: brandId || null }, {
      label: "github-subscribe",
      success: "Release 订阅已创建",
    });
    if (!result) {
      setProblem("订阅没有完成，请按提示调整后再试。");
      return;
    }
    setCreated(result);
  }

  return (
    <div>
      <Link to="/sources" className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-4 transition-colors hover:text-ink">
        <IconArrowLeft size={14} />关注与信源
      </Link>

      <header className="mt-3">
        <div className="mono text-[11px] uppercase tracking-[0.18em] text-ink-4">{STUDIO_PRODUCT} / Studio / 添加信源</div>
        <h1 className="mt-2 text-[28px] font-black leading-[1.2] tracking-[-0.03em] text-ink sm:text-[34px]">添加信源</h1>
        <p className="mt-3 max-w-[720px] text-[14px] leading-[1.8] text-ink-3">
          订阅一个 GitHub 仓库的 Release。系统先向 GitHub 核对仓库是否公开可访问，再决定能不能订阅。
        </p>
      </header>

      <section className="mt-5 rounded-panel bg-surface p-4 ring-1 ring-line sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Field label="GitHub 仓库地址" hint="例如 https://github.com/openai/openai-python">
              <Input aria-label="GitHub 仓库地址" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://github.com/owner/repo" inputMode="url" />
            </Field>
          </div>
          <Button tone="primary" busy={pending === "github-check"} disabled={!url.trim()} onClick={check}>检查仓库</Button>
        </div>
        {problem && (
          <p className="mt-3 flex items-start gap-1.5 rounded-control bg-bg-sunk px-3 py-2 text-[12.5px] leading-relaxed text-hot">
            <IconInfo size={14} className="mt-0.5 shrink-0" />{problem}
          </p>
        )}
      </section>

      {checked && (
        <section className="mt-5 rounded-panel bg-surface p-4 ring-1 ring-line sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <IconGithub size={18} />
            <h2 className="text-[15px] font-semibold text-ink">{checked.repo.fullName}</h2>
            {checked.repo.archived && <Badge tone="muted">已归档</Badge>}
            {checked.repo.fork && <Badge tone="muted">Fork</Badge>}
            {checked.owner.official
              ? <Badge tone="ok">官方组织</Badge>
              : <Badge tone="warn">第三方仓库</Badge>}
          </div>
          {checked.repo.description && <p className="mt-2 text-[13px] leading-relaxed text-ink-3">{checked.repo.description}</p>}
          <dl className="mt-3 grid gap-3 text-[12.5px] sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-ink-4">账号类型</dt>
              <dd className="mt-0.5 text-ink-2">{checked.repo.ownerType === "Organization" ? "组织" : "个人"}</dd>
            </div>
            <div>
              <dt className="text-ink-4">最近推送</dt>
              <dd className="mt-0.5 text-ink-2">{checked.repo.pushedAt ? monthDayTime(checked.repo.pushedAt) : "未知"}</dd>
            </div>
            <div>
              <dt className="text-ink-4">默认分支</dt>
              <dd className="mt-0.5 text-ink-2">{checked.repo.defaultBranch}</dd>
            </div>
            <div>
              <dt className="text-ink-4">Star</dt>
              <dd className="mt-0.5 text-ink-2">{checked.repo.stars}</dd>
            </div>
          </dl>

          <div className="mt-4 border-t border-line-soft pt-3">
            <Field label="关联品牌" hint="官方与否由品牌官网和已验证渠道决定，不能只凭名称认定">
              <Select aria-label="关联品牌" value={brandId} onChange={(event) => setBrandId(event.target.value)}>
                <option value="">不关联品牌</option>
                {checked.owner.candidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>{candidate.name}（{candidate.reason}）</option>
                ))}
              </Select>
            </Field>
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink-4">{checked.owner.reason}</p>
          </div>

          {checked.repo.releases.length > 0 && (
            <div className="mt-4 border-t border-line-soft pt-3">
              <h3 className="text-[13px] font-semibold text-ink">最近的 Release</h3>
              <ul className="mt-2 space-y-2">
                {checked.repo.releases.map((release) => (
                  <li key={release.tag} className="rounded-control bg-bg-sunk px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="mono text-[12.5px] font-semibold text-ink">{release.tag}</span>
                      {release.name && release.name !== release.tag && <span className="text-[12.5px] text-ink-2">{release.name}</span>}
                      {release.publishedAt && <span className="text-[11.5px] text-ink-4">{monthDayTime(release.publishedAt)}</span>}
                      <a href={release.url} target="_blank" rel="noreferrer" className="text-[12px] text-accent hover:underline">版本说明</a>
                    </div>
                    {release.notes && <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-ink-3">{release.notes}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line-soft pt-3">
            <Button tone="primary" busy={pending === "github-subscribe"} onClick={subscribe}>订阅这个仓库的 Release</Button>
            <a href={checked.repo.htmlUrl} target="_blank" rel="noreferrer" className="text-[12.5px] text-accent hover:underline">在 GitHub 打开</a>
          </div>
        </section>
      )}

      {created && (
        <section className="mt-5 rounded-panel bg-surface p-4 ring-1 ring-line sm:p-5">
          <h2 className="text-[15px] font-semibold text-ink">订阅完成：{created.source.name}</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-3">
            Release 订阅已经建立，地址是 {created.source.id}；仓库也登记为候选渠道 {created.channel.displayName}
            {created.owner.brandId ? `，并关联到品牌 ${created.owner.brandName ?? created.owner.brandId}` : "，暂未关联品牌"}。
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ButtonLink to={`/sources/${encodeURIComponent(created.source.id)}`} tone="secondary">查看信源详情</ButtonLink>
            <ButtonLink to="/sources" tone="ghost">回到信源列表</ButtonLink>
          </div>
          <h3 className="mt-4 text-[13px] font-semibold text-ink">试抓预览（{created.preview.count} 条）</h3>
          {created.preview.items.length ? (
            <ul className="mt-2 space-y-2">
              {created.preview.items.map((item) => (
                <li key={item.url} className="rounded-control bg-bg-sunk px-3 py-2">
                  <a href={item.url} target="_blank" rel="noreferrer" className="text-[13px] font-medium text-ink hover:text-accent">{item.title}</a>
                  {item.publishedAt && <div className="mono mt-0.5 text-[11px] text-ink-4">{monthDayTime(item.publishedAt)}</div>}
                  {item.excerpt && <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-ink-3">{item.excerpt}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[13px] text-ink-4">这个仓库还没有发布过 Release，订阅建立后会在发布时更新。</p>
          )}
        </section>
      )}
    </div>
  );
}
