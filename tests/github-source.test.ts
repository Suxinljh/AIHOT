// Native GitHub sources: each feed becomes candidates, PRs are not issues, label filters apply, and a
// 304 or an exhausted rate limit is told apart from an empty listing.
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { fetchGithub } from "@aihot/backend/sources/github";
import { FetchError, type SourceRow } from "@aihot/backend/sources/types";

const originalFetch = globalThis.fetch;
after(() => { globalThis.fetch = originalFetch; });

const source = (config: Record<string, unknown>, cursor: Record<string, unknown> | null = null) => ({
  id: "github-openai-openai-python",
  name: "openai/openai-python",
  kind: "github",
  config: { repo: "openai/openai-python", ...config },
  cursor,
  tier: "T1",
  participation_mode: "editorial",
  first_party: false,
  interval_minutes: 240,
  enabled: true,
  fail_count: 0,
}) as SourceRow;

function reply(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response(JSON.stringify(body), { status: init.status ?? 200, headers: { "content-type": "application/json", ...(init.headers ?? {}) } });
}

test("tags become tree links and never need a body fetch", async () => {
  let seen = "";
  globalThis.fetch = (async (url: string) => {
    seen = String(url);
    return reply([{ name: "v1.2.3", commit: { sha: "abc" } }]);
  }) as typeof fetch;
  const result = await fetchGithub(source({ feed: "tags" }));
  assert.match(seen, /repos\/openai\/openai-python\/tags\?per_page=20$/);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0]?.title, "v1.2.3");
  assert.equal(result.candidates[0]?.url, "https://github.com/openai/openai-python/tree/v1.2.3");
  assert.equal(result.candidates[0]?.bodyStatus, "none");
});

test("commits use the message's first line as the title and keep the date", async () => {
  globalThis.fetch = (async () => reply([{
    sha: "abcdef1234567890",
    html_url: "https://github.com/openai/openai-python/commit/abcdef1",
    commit: { message: "fix: retry on 429\n\nKeep the client alive.\n", author: { date: "2026-05-01T10:00:00Z", name: "Ada" } },
  }])) as typeof fetch;
  const result = await fetchGithub(source({ feed: "commits" }));
  const commit = result.candidates[0];
  assert.equal(commit?.title, "fix: retry on 429");
  assert.equal(commit?.excerpt, "Keep the client alive.");
  assert.equal(commit?.author, "Ada");
  assert.equal(commit?.publishedAt?.toISOString(), "2026-05-01T10:00:00.000Z");
});

test("issues skip pull requests, keep their body and honour a label filter", async () => {
  globalThis.fetch = (async () => reply([
    {
      number: 7, title: "Crash on retry", body: "Retry loops forever.", html_url: "https://github.com/openai/openai-python/issues/7",
      state: "open", created_at: "2026-05-01T09:00:00Z", updated_at: "2026-05-01T11:00:00Z", labels: [{ name: "bug" }],
    },
    {
      number: 8, title: "A PR", body: null, html_url: "https://github.com/openai/openai-python/pull/8",
      state: "open", created_at: "2026-05-01T09:00:00Z", updated_at: "2026-05-01T11:00:00Z", labels: [], pull_request: {},
    },
    {
      number: 9, title: "Docs", body: null, html_url: "https://github.com/openai/openai-python/issues/9",
      state: "open", created_at: "2026-05-01T09:00:00Z", updated_at: "2026-05-01T11:00:00Z", labels: [{ name: "docs" }],
    },
  ])) as typeof fetch;
  const result = await fetchGithub(source({ feed: "issues", labels: ["bug"] }));
  assert.deepEqual(result.candidates.map((candidate) => candidate.title), ["#7 Crash on retry"]);
  assert.equal(result.candidates[0]?.bodyStatus, "ok");
  assert.equal(result.candidates[0]?.bodyText, "Retry loops forever.");
});

test("pulls are listed as their own feed", async () => {
  globalThis.fetch = (async () => reply([{
    number: 12, title: "Add retries", body: "Adds retries.", html_url: "https://github.com/openai/openai-python/pull/12",
    state: "open", created_at: "2026-05-01T09:00:00Z", updated_at: "2026-05-01T11:00:00Z", labels: [],
  }])) as typeof fetch;
  const result = await fetchGithub(source({ feed: "pulls" }));
  assert.equal(result.candidates[0]?.title, "#12 Add retries");
  assert.equal(result.candidates[0]?.url, "https://github.com/openai/openai-python/pull/12");
});

test("an ETag makes an unchanged repository a 304, and a changed feed stops reusing it", async () => {
  let headers: HeadersInit | undefined;
  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    headers = init?.headers;
    return new Response(null, { status: 304 });
  }) as typeof fetch;
  const result = await fetchGithub(source({ feed: "tags" }, { github: { etag: "W/\"abc\"", feed: "tags" } }));
  assert.equal(result.notModified, true);
  assert.equal(result.candidates.length, 0);
  assert.equal((headers as Record<string, string>)["if-none-match"], "W/\"abc\"");

  // A different feed must not send the tags ETag.
  let sent: Record<string, string> = {};
  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    sent = init?.headers as Record<string, string>;
    return reply([]);
  }) as typeof fetch;
  await fetchGithub(source({ feed: "issues" }, { github: { etag: "W/\"abc\"", feed: "tags" } }));
  assert.equal(sent["if-none-match"], undefined);
});

test("an exhausted rate limit is a readable, retryable error", async () => {
  globalThis.fetch = (async () => reply({ message: "API rate limit exceeded" }, {
    status: 403,
    headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1893456000" },
  })) as typeof fetch;
  await assert.rejects(() => fetchGithub(source({ feed: "tags" })), (error: unknown) => {
    assert.ok(error instanceof FetchError);
    assert.equal(error.status, 403);
    assert.match(error.message, /限额/);
    assert.match(error.message, /2030-01-01/);
    return true;
  });
});

test("a malformed repository is refused before any request", async () => {
  await assert.rejects(() => fetchGithub(source({ repo: "not a repo" })), /owner\/repo/);
});
