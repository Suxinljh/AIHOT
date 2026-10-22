// Native GitHub API sources: Tags, default-branch Commits, Issues and Pull Requests. The API is
// conditional (ETag) so an unchanged repository costs one 304, and an exhausted rate limit is an
// error with the reset time, not an empty listing.
import { credential } from "../config.ts";
import { collapseWhitespace } from "../lib/text.ts";
import { FetchError, type Candidate, type SourceRow } from "./types.ts";

export type GithubFeed = "tags" | "commits" | "issues" | "pulls";
const FEEDS: readonly GithubFeed[] = ["tags", "commits", "issues", "pulls"];
const API = "https://api.github.com";

interface GithubConfig {
  repo: string;
  feed?: GithubFeed;
  perPage?: number;
  labels?: string[];
}

interface GithubTag {
  name: string;
  commit: { sha: string };
}

interface GithubCommit {
  sha: string;
  html_url: string;
  commit: { message: string; author: { date: string; name: string } | null };
}

interface GithubIssue {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: string;
  created_at: string;
  updated_at: string;
  labels: Array<{ name: string }>;
  pull_request?: unknown;
}

interface GithubPull {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: string;
  created_at: string;
  updated_at: string;
  labels: Array<{ name: string }>;
}

function configOf(source: SourceRow): Required<Pick<GithubConfig, "repo" | "feed">> & GithubConfig {
  const config = source.config as GithubConfig;
  const repo = String(config.repo ?? "").trim();
  if (!/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(repo)) throw new FetchError(`github 信源需要 owner/repo，收到 "${repo}"`);
  const feed = (config.feed ?? "tags") as GithubFeed;
  if (!FEEDS.includes(feed)) throw new FetchError(`github 的 feed 只能是 ${FEEDS.join("、")}`);
  return { ...config, repo, feed };
}

async function apiGet(source: SourceRow, path: string, etag: string | null): Promise<{ data: unknown; etag: string | null; notModified: boolean }> {
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    "user-agent": "aihot-collector",
  };
  const token = credential("collectors", "GITHUB_TOKEN");
  if (token) headers.authorization = `Bearer ${token}`;
  if (etag) headers["if-none-match"] = etag;
  const response = await fetch(`${API}${path}`, { headers, signal: AbortSignal.timeout(20_000) });
  if (response.status === 304) return { data: null, etag, notModified: true };
  const remaining = response.headers.get("x-ratelimit-remaining");
  if ((response.status === 403 || response.status === 429) && remaining === "0") {
    const reset = Number(response.headers.get("x-ratelimit-reset") ?? 0);
    const when = reset ? new Date(reset * 1000).toISOString() : "稍后";
    throw new FetchError(`GitHub 访问限额用尽，${when} 后重试；可配置 GITHUB_TOKEN 提高限额`, response.status);
  }
  if (!response.ok) throw new FetchError(`GitHub API ${response.status} ${response.statusText}`, response.status);
  return { data: await response.json(), etag: response.headers.get("etag"), notModified: false };
}

function summary(text: string | null | undefined): string | null {
  if (!text) return null;
  const clean = collapseWhitespace(text).trim();
  return clean ? clean.slice(0, 500) : null;
}

function firstLine(message: string): { title: string; rest: string | null } {
  const [title, ...rest] = message.split("\n");
  return { title: collapseWhitespace(title ?? "").slice(0, 200), rest: summary(rest.join("\n")) };
}

/** One page of the configured feed, as candidates the collection pipeline stores like any listing. */
export async function fetchGithub(source: SourceRow, opts: { force?: boolean } = {}): Promise<{ candidates: Candidate[]; etag: string | null; feed: GithubFeed; notModified: boolean }> {
  const config = configOf(source);
  const perPage = Math.min(Math.max(config.perPage ?? 20, 1), 100);
  const cursor = (source.cursor?.github ?? null) as { etag?: string | null; feed?: string } | null;
  const previous = !opts.force && cursor?.feed === config.feed ? cursor.etag ?? null : null;

  const path = config.feed === "tags"
    ? `/repos/${config.repo}/tags?per_page=${perPage}`
    : config.feed === "commits"
      ? `/repos/${config.repo}/commits?per_page=${perPage}`
      : config.feed === "issues"
        ? `/repos/${config.repo}/issues?state=all&sort=updated&direction=desc&per_page=${perPage}`
        : `/repos/${config.repo}/pulls?state=all&sort=updated&direction=desc&per_page=${perPage}`;
  const { data, etag, notModified } = await apiGet(source, path, previous);
  if (notModified) return { candidates: [], etag: previous, feed: config.feed, notModified: true };

  const now = new Date();
  const wantedLabels = new Set((config.labels ?? []).map((label) => label.toLowerCase()));
  const keepLabels = (labels: Array<{ name: string }>) => !wantedLabels.size || labels.some((label) => wantedLabels.has(label.name.toLowerCase()));
  let candidates: Candidate[];

  if (config.feed === "tags") {
    candidates = (data as GithubTag[]).map((tag) => ({
      sourceId: source.id,
      url: `https://github.com/${config.repo}/tree/${encodeURIComponent(tag.name)}`,
      title: tag.name,
      excerpt: `标签 ${tag.name}`,
      publishedAt: null,
      bodyStatus: "none" as const,
      via: "fetch" as const,
      raw: tag,
    }));
  } else if (config.feed === "commits") {
    candidates = (data as GithubCommit[]).map((commit) => {
      const { title, rest } = firstLine(commit.commit.message ?? "");
      const at = commit.commit.author?.date ? new Date(commit.commit.author.date) : null;
      return {
        sourceId: source.id,
        url: commit.html_url,
        title: title || commit.sha.slice(0, 7),
        excerpt: rest,
        author: commit.commit.author?.name ?? null,
        publishedAt: at,
        bodyStatus: "none" as const,
        via: "fetch" as const,
        raw: commit,
      };
    });
  } else if (config.feed === "issues") {
    candidates = (data as GithubIssue[])
      .filter((issue) => !issue.pull_request && keepLabels(issue.labels ?? []))
      .map((issue) => ({
        sourceId: source.id,
        url: issue.html_url,
        title: `#${issue.number} ${issue.title}`,
        excerpt: summary(issue.body),
        bodyText: issue.body ?? null,
        bodyStatus: issue.body ? "ok" as const : "none" as const,
        publishedAt: new Date(issue.created_at),
        sourceUpdatedAt: new Date(issue.updated_at),
        discoveredAt: now,
        via: "fetch" as const,
        raw: issue,
      }));
  } else {
    candidates = (data as GithubPull[])
      .filter((pull) => keepLabels(pull.labels ?? []))
      .map((pull) => ({
        sourceId: source.id,
        url: pull.html_url,
        title: `#${pull.number} ${pull.title}`,
        excerpt: summary(pull.body),
        bodyText: pull.body ?? null,
        bodyStatus: pull.body ? "ok" as const : "none" as const,
        publishedAt: new Date(pull.created_at),
        sourceUpdatedAt: new Date(pull.updated_at),
        discoveredAt: now,
        via: "fetch" as const,
        raw: pull,
      }));
  }
  return { candidates, etag: etag ?? null, feed: config.feed, notModified: false };
}
