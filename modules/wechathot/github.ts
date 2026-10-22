// GitHub Release subscriptions: a public repository's releases.atom feed is an ordinary RSS source,
// so no new source kind is needed. The repository is checked against the GitHub API first: a private
// or unknown repository never becomes a half-created source.
import { z } from "zod";
import { createSource, findDuplicateSource, previewSource } from "@aihot/backend/admin/sources";
import { credential } from "@aihot/backend/config";
import { sql } from "@aihot/backend/db";
import { audit } from "@aihot/backend/audit";

/** A GitHub command that cannot be carried out. */
export class GithubRejected extends Error {
  readonly statusCode = 400;
  readonly code = "invalid_request";
}

const API = "https://api.github.com";

export interface GithubRelease {
  tag: string;
  name: string | null;
  url: string;
  publishedAt: string | null;
  notes: string | null;
}

export interface GithubRepo {
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
  /** The releases this repository published, newest first. */
  releases: GithubRelease[];
}

export interface GithubOwner {
  /** The owner matches a brand of the library. */
  brandId: string | null;
  brandName: string | null;
  /** Why the owner is (or is not) treated as the brand's official organisation. */
  reason: string;
  official: boolean;
  /** The brands that could own this account, when the answer needs a person. */
  candidates: Array<{ id: string; name: string; reason: string }>;
}

const RepoSchema = z.object({
  full_name: z.string(),
  html_url: z.string(),
  description: z.string().nullable(),
  private: z.boolean(),
  archived: z.boolean(),
  fork: z.boolean(),
  default_branch: z.string(),
  pushed_at: z.string().nullable(),
  stargazers_count: z.number(),
  owner: z.object({ login: z.string(), type: z.string() }),
});

const ReleaseSchema = z.object({
  tag_name: z.string(),
  name: z.string().nullable(),
  html_url: z.string(),
  published_at: z.string().nullable(),
  body: z.string().nullable(),
});

/** owner/repo from a GitHub address; the plain "owner/repo" form is accepted too. */
export function parseRepoUrl(input: string): { owner: string; repo: string } {
  const value = input.trim();
  if (!value) throw new GithubRejected("请填写仓库地址");
  const plain = /^([A-Za-z0-9][A-Za-z0-9-]{0,38})\/([A-Za-z0-9._-]{1,100})$/.exec(value);
  if (plain) return { owner: plain[1]!, repo: plain[2]!.replace(/\.git$/, "") };
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new GithubRejected("仓库地址格式不对，示例：https://github.com/owner/repo");
  }
  if (url.hostname !== "github.com" && url.hostname !== "www.github.com") {
    throw new GithubRejected("只支持 github.com 的仓库地址");
  }
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) throw new GithubRejected("仓库地址缺少 owner 或仓库名");
  return { owner: parts[0]!, repo: parts[1]!.replace(/\.git$/, "") };
}

function headers(): Record<string, string> {
  const token = credential("collectors", "GITHUB_TOKEN");
  return {
    accept: "application/vnd.github+json",
    "user-agent": "aihot-wechathot-studio",
    "x-github-api-version": "2022-11-28",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

async function githubGet<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, { headers: headers(), signal: AbortSignal.timeout(20_000) });
  } catch (error) {
    throw new GithubRejected(`连不上 GitHub，请检查网络后重试（${(error as Error).message}）`);
  }
  if (response.status === 404) throw new GithubRejected("仓库不存在或不是公开仓库");
  if (response.status === 403 || response.status === 429) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    throw new GithubRejected(remaining === "0" ? "GitHub 访问限额用尽了，可以配置 GITHUB_TOKEN 再试" : "GitHub 拒绝了这次请求，稍后再试");
  }
  if (response.status !== 200) throw new GithubRejected(`GitHub 返回 ${response.status}`);
  return (await response.json()) as T;
}

/** The repository as GitHub sees it, with its newest releases. */
export async function checkGithubRepo(input: string): Promise<GithubRepo> {
  const { owner, repo } = parseRepoUrl(input);
  const data = await githubGet<unknown>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
  const parsed = RepoSchema.parse(data);
  let releases: GithubRelease[] = [];
  try {
    const list = await githubGet<unknown>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases?per_page=5`);
    if (Array.isArray(list)) {
      releases = list.flatMap((item) => {
        const release = ReleaseSchema.safeParse(item);
        return release.success
          ? [{
            tag: release.data.tag_name,
            name: release.data.name,
            url: release.data.html_url,
            publishedAt: release.data.published_at,
            notes: release.data.body ? release.data.body.slice(0, 600) : null,
          }]
          : [];
      });
    }
  } catch {
    // A repository without releases is still worth subscribing to.
  }
  return {
    owner,
    repo,
    fullName: parsed.full_name,
    htmlUrl: parsed.html_url,
    description: parsed.description,
    private: parsed.private,
    archived: parsed.archived,
    fork: parsed.fork,
    ownerType: parsed.owner.type,
    defaultBranch: parsed.default_branch,
    pushedAt: parsed.pushed_at,
    stars: parsed.stargazers_count,
    releases,
  };
}

/**
 * Whether the owner is a brand's official organisation. The evidence is the brand's own website
 * pointing at that account or a verified channel of that brand; a matching name is only a candidate
 * for the editor to confirm.
 */
export async function githubOwner(owner: string): Promise<GithubOwner> {
  const key = owner.toLowerCase();
  const rows = await sql<{ id: string; name: string; entity_id: string | null; website: string | null }[]>`
    SELECT id, name, entity_id, website FROM wc_brands`;
  const candidates: GithubOwner["candidates"] = [];
  for (const brand of rows) {
    const reasons: string[] = [];
    if (brand.entity_id && brand.entity_id.toLowerCase() === key) reasons.push("与品牌实体 ID 一致");
    if (brand.website) {
      try {
        const url = new URL(brand.website);
        if (url.hostname.replace(/^www\./, "") === "github.com" && url.pathname.split("/").filter(Boolean)[0]?.toLowerCase() === key) {
          reasons.push("品牌官网指向该 GitHub 账号");
        }
      } catch {
        // A website that is not a URL says nothing about the account.
      }
    }
    if (reasons.length) candidates.push({ id: brand.id, name: brand.name, reason: reasons.join("；") });
  }

  const channels = await sql<{ brand_id: string; brand_name: string; display_name: string; verification: string }[]>`
    SELECT cb.brand_id, b.name AS brand_name, c.display_name, c.verification
    FROM wc_channels c
    JOIN wc_channel_brands cb ON cb.channel_id = c.id
    JOIN wc_brands b ON b.id = cb.brand_id
    WHERE c.type = 'github' AND lower(c.display_name) LIKE ${`%${key}%`}
    LIMIT 5`;

  if (candidates.length) {
    const first = candidates[0]!;
    return { brandId: first.id, brandName: first.name, reason: first.reason, official: true, candidates };
  }
  if (channels.length) {
    const channel = channels[0]!;
    return {
      brandId: channel.brand_id,
      brandName: channel.brand_name,
      reason: channel.verification === "verified" ? "该品牌已验证过这个 GitHub 渠道" : "该品牌已关联这个 GitHub 渠道，尚未验证官方身份",
      official: channel.verification === "verified",
      candidates: channels.map((row) => ({ id: row.brand_id, name: row.brand_name, reason: `已关联渠道 ${row.display_name}` })),
    };
  }
  return { brandId: null, brandName: null, reason: "没有品牌与这个账号对应", official: false, candidates: [] };
}

export interface GithubSourcePlan {
  sourceId: string;
  name: string;
  feedUrl: string;
  tier: "T1" | "T2";
  firstParty: boolean;
  channelId: string;
}

export function releaseSourcePlan(repo: GithubRepo, official: boolean): GithubSourcePlan {
  const slug = `${repo.owner}-${repo.repo}`.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return {
    sourceId: `github-${slug}`.slice(0, 80),
    name: repo.fullName,
    feedUrl: `https://github.com/${repo.owner}/${repo.repo}/releases.atom`,
    tier: official ? "T1" : "T2",
    firstParty: official,
    channelId: `github-${slug}`.slice(0, 80),
  };
}

export interface GithubPreviewItem {
  title: string;
  url: string;
  publishedAt: string | null;
  excerpt: string | null;
}

export interface GithubSubscribeResult {
  source: { id: string; name: string };
  preview: GithubPreview;
  channel: { id: string; displayName: string };
  owner: GithubOwner;
}

export interface GithubPreview {
  count: number;
  items: GithubPreviewItem[];
}

/** The preview a subscription needs before it saves anything; replaceable in tests. */
export type GithubPreviewer = (draft: { id: string; name: string; kind: string; config: Record<string, unknown> }) => Promise<GithubPreview>;

const previewWithFeed: GithubPreviewer = async (draft) => {
  const result = await previewSource(draft as never);
  return { count: result.count, items: result.items as GithubPreviewItem[] };
};

/**
 * Subscribes to a repository's releases. The feed is previewed first: a repository whose feed cannot
 * be read is not saved, so a failed attempt never leaves a half-created source behind.
 */
export async function subscribeGithubReleases(
  input: { url: string; brandId?: string | null },
  actor: string,
  deps: { preview?: GithubPreviewer } = {},
): Promise<GithubSubscribeResult> {
  const repo = await checkGithubRepo(input.url);
  if (repo.private) throw new GithubRejected("私有仓库不能订阅");
  const owner = await githubOwner(repo.owner);
  const brandId = input.brandId ?? owner.brandId;
  const official = brandId ? owner.official || owner.brandId === brandId : false;
  const plan = releaseSourcePlan(repo, official);

  const duplicate = await findDuplicateSource("rss", { feedUrl: plan.feedUrl });
  if (duplicate) throw new GithubRejected(`这个仓库已经是信源了（${duplicate.name}／${duplicate.id}）`);

  const draft = {
    id: plan.sourceId,
    name: plan.name,
    kind: "rss",
    config: { feedUrl: plan.feedUrl },
    tier: plan.tier,
    participation_mode: "editorial",
    first_party: plan.firstParty,
    interval_minutes: 60,
  };
  let preview: GithubPreview;
  try {
    preview = await (deps.preview ?? previewWithFeed)(draft);
  } catch (error) {
    throw new GithubRejected(`Release 订阅地址取不到内容：${(error as Error).message}`);
  }

  const created = await createSource({
    id: draft.id,
    name: draft.name,
    kind: "rss",
    config: draft.config,
    tier: draft.tier,
    participation_mode: "editorial",
    interval_minutes: draft.interval_minutes,
    first_party: draft.first_party,
    tags: ["github"],
  }, actor);
  if (!created.created) throw new GithubRejected(`这个仓库已经是信源了（${created.duplicate.name}／${created.duplicate.id}）`);

  await sql`
    INSERT INTO wc_channels (id, type, platform, display_name, url, provider, source_id, verification, availability)
    VALUES (${plan.channelId}, 'github', 'github', ${repo.fullName}, ${repo.htmlUrl}, 'github', ${plan.sourceId},
            ${official ? "verified" : "user"}, 'unknown')
    ON CONFLICT (id) DO UPDATE SET source_id = EXCLUDED.source_id, display_name = EXCLUDED.display_name, url = EXCLUDED.url`;
  if (brandId) {
    await sql`
      INSERT INTO wc_channel_brands (channel_id, brand_id) VALUES (${plan.channelId}, ${brandId})
      ON CONFLICT DO NOTHING`;
  }
  await audit(actor, "source.github.subscribe", `source:${plan.sourceId}`, owner.reason, null, { repo: repo.fullName, brandId });

  return {
    source: { id: plan.sourceId, name: plan.name },
    preview,
    channel: { id: plan.channelId, displayName: repo.fullName },
    owner: { ...owner, brandId, official },
  };
}
