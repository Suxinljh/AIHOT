// GitHub Release subscriptions: the address is parsed, the repository is checked against the GitHub
// API, and the official organisation is decided by evidence rather than by a matching name.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { tag } from "../../../tests/setup.ts";
import { config } from "@aihot/backend/config";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { installModules } from "@aihot/backend/modules";
import { buildApp } from "../../../apps/api/src/app.ts";
import { wechatHotServer } from "../server.ts";
import { githubOwner, parseRepoUrl, releaseSourcePlan, subscribeGithubReleases } from "../github.ts";

const T = tag();
const originalDevAdmin = config.devAdmin;
let app: Awaited<ReturnType<typeof buildApp>>;
const brandId = `gh-brand-${T}`;

before(async () => {
  installModules([wechatHotServer]);
  config.devAdmin = { displayName: "WCH-14 github test" };
  app = await buildApp();
  await sql`INSERT INTO wc_brands (id, entity_id, name, website) VALUES
    (${brandId}, ${`gh-${T}`}, ${`官方品牌 ${T}`}, ${`https://github.com/gh-${T}`})`;
});

after(async () => {
  await app.close();
  await stopBoss();
  config.devAdmin = originalDevAdmin;
  await closeDb();
});

async function api(method: "POST", url: string, payload?: unknown) {
  return app.inject({
    method,
    url,
    ...(payload === undefined ? {} : { payload: payload as never }),
    headers: { ...(payload === undefined ? {} : { "content-type": "application/json" }), "x-csrf-token": "dev" },
  });
}

test("a repository address is read in both forms", () => {
  assert.deepEqual(parseRepoUrl("https://github.com/openai/openai-python"), { owner: "openai", repo: "openai-python" });
  assert.deepEqual(parseRepoUrl("https://www.github.com/openai/openai-python.git"), { owner: "openai", repo: "openai-python" });
  assert.deepEqual(parseRepoUrl("openai/openai-python"), { owner: "openai", repo: "openai-python" });
  assert.throws(() => parseRepoUrl(""), /仓库地址/);
  assert.throws(() => parseRepoUrl("https://gitlab.com/owner/repo"), /github.com/);
  assert.throws(() => parseRepoUrl("https://github.com/owner"), /owner 或仓库名/);
});

test("the owner is official when the brand's own site points at that account", async () => {
  const owner = await githubOwner(`gh-${T}`);
  assert.equal(owner.official, true);
  assert.equal(owner.brandId, brandId);
  assert.match(owner.reason, /官网/);
  assert.equal(owner.candidates.length, 1);
});

test("an unknown owner is a third party, not an official organisation", async () => {
  const owner = await githubOwner(`someone-${T}`);
  assert.equal(owner.official, false);
  assert.equal(owner.brandId, null);
  assert.match(owner.reason, /没有品牌/);
});

test("the source plan is an ordinary RSS source for the releases feed", () => {
  const plan = releaseSourcePlan({
    owner: "OpenAI",
    repo: "openai-python",
    fullName: "OpenAI/openai-python",
    htmlUrl: "https://github.com/OpenAI/openai-python",
    description: null,
    private: false,
    archived: false,
    fork: false,
    ownerType: "Organization",
    defaultBranch: "main",
    pushedAt: null,
    stars: 0,
    releases: [],
  }, true);
  assert.equal(plan.feedUrl, "https://github.com/OpenAI/openai-python/releases.atom");
  assert.equal(plan.sourceId, "github-openai-openai-python");
  assert.equal(plan.tier, "T1");
  assert.equal(plan.firstParty, true);
  assert.match(plan.sourceId, /^[a-z0-9][a-z0-9-]{2,79}$/);
});

test("a public repository becomes a release subscription, a channel and a brand relation", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("/repos/openai/openai-python/releases")) {
      return new Response(JSON.stringify([
        { tag_name: "v1.2.3", name: "1.2.3", html_url: "https://github.com/openai/openai-python/releases/tag/v1.2.3", published_at: "2026-04-20T08:00:00.000Z", body: "修复若干问题" },
      ]), { status: 200, headers: { "content-type": "application/json" } });
    }
    const repoPath = /\/repos\/([^/]+)\/([^/?]+)(\?|$)/.exec(url);
    if (repoPath && repoPath[2] && !url.includes("/releases")) {
      if (repoPath[1] === "private") return new Response("{}", { status: 404 });
      return new Response(JSON.stringify({
        full_name: `${repoPath[1]}/${repoPath[2]}`,
        html_url: `https://github.com/${repoPath[1]}/${repoPath[2]}`,
        description: "官方 Python 库",
        private: false,
        archived: false,
        fork: false,
        default_branch: "main",
        pushed_at: "2026-05-01T10:00:00.000Z",
        stargazers_count: 1200,
        owner: { login: repoPath[1], type: "Organization" },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return originalFetch(input as never);
  }) as typeof fetch;

  try {
    const previewed = await subscribeGithubReleases({ url: "https://github.com/openai/openai-python" }, "dev:test", {
      preview: async (draft) => {
        assert.equal(draft.config.feedUrl, "https://github.com/openai/openai-python/releases.atom");
        return { count: 1, items: [{ title: "v1.2.3", url: "https://github.com/openai/openai-python/releases/tag/v1.2.3", publishedAt: "2026-04-20T08:00:00.000Z", excerpt: "修复若干问题" }] };
      },
    });
    assert.equal(previewed.source.id, "github-openai-openai-python");
    assert.equal(previewed.preview.count, 1);
    assert.equal(previewed.preview.items[0]?.title, "v1.2.3");
    assert.equal(previewed.owner.official, false, "no brand claims this account here");

    const [source] = await sql<{ id: string; kind: string; config: Record<string, unknown> }[]>`
      SELECT id, kind, config FROM sources WHERE id = ${"github-openai-openai-python"}`;
    assert.ok(source);
    assert.equal(source!.kind, "rss");
    assert.equal(source!.config.feedUrl, "https://github.com/openai/openai-python/releases.atom");

    const [channel] = await sql<{ id: string; type: string; source_id: string | null }[]>`
      SELECT id, type, source_id FROM wc_channels WHERE id = ${"github-openai-openai-python"}`;
    assert.ok(channel);
    assert.equal(channel!.type, "github");
    assert.equal(channel!.source_id, "github-openai-openai-python");

    // The same repository twice is refused, and nothing is saved twice.
    await assert.rejects(
      subscribeGithubReleases({ url: "https://github.com/openai/openai-python" }, "dev:test", { preview: async () => ({ count: 0, items: [] }) }),
      /已经是信源/,
    );
    assert.equal((await sql`SELECT 1 FROM sources WHERE id = ${"github-openai-openai-python"}`).length, 1);

    // A repository whose feed cannot be read leaves no source behind.
    await assert.rejects(
      subscribeGithubReleases({ url: "https://github.com/openai/other-repo" }, "dev:test", { preview: async () => { throw new Error("取不到内容"); } }),
      /取不到内容/,
    );
    assert.equal((await sql`SELECT 1 FROM sources WHERE id = ${"github-openai-other-repo"}`).length, 0);

    // A repository that does not exist is a clear error.
    await assert.rejects(
      subscribeGithubReleases({ url: "https://github.com/private/secret" }, "dev:test", { preview: async () => ({ count: 0, items: [] }) }),
      /不存在或不是公开仓库/,
    );

    // A brand's own organisation: a first-party source, a verified channel and the brand relation.
    const official = await subscribeGithubReleases({ url: `https://github.com/gh-${T}/toolkit` }, "dev:test", {
      preview: async () => ({ count: 0, items: [] }),
    });
    assert.equal(official.owner.official, true);
    assert.equal(official.owner.brandId, brandId);
    const [officialSource] = await sql<{ tier: string; first_party: boolean }[]>`
      SELECT tier, first_party FROM sources WHERE id = ${"github-gh-" + T + "-toolkit"}`;
    assert.equal(officialSource?.tier, "T1");
    assert.equal(officialSource?.first_party, true);
    const [officialChannel] = await sql<{ verification: string }[]>`
      SELECT verification FROM wc_channels WHERE id = ${"github-gh-" + T + "-toolkit"}`;
    assert.equal(officialChannel?.verification, "verified");
    assert.equal((await sql`SELECT 1 FROM wc_channel_brands WHERE brand_id = ${brandId} AND channel_id = ${"github-gh-" + T + "-toolkit"}`).length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("the endpoints refuse an address that is not a repository", async () => {
  const devAdmin = config.devAdmin;
  config.devAdmin = null;
  try {
    const guest = await app.inject({ method: "POST", url: "/api/studio/sources/github/check", payload: { url: "x" }, headers: { "content-type": "application/json" } });
    assert.equal(guest.statusCode, 401);
  } finally {
    config.devAdmin = devAdmin;
  }

  const noCsrf = await app.inject({ method: "POST", url: "/api/studio/sources/github/check", payload: { url: "x" }, headers: { "content-type": "application/json" } });
  assert.equal(noCsrf.statusCode, 403);

  const wrongHost = await api("POST", "/api/studio/sources/github/check", { url: "https://example.com/owner/repo" });
  assert.equal(wrongHost.statusCode, 400);
  assert.match((wrongHost.json() as { detail: string }).detail, /github.com/);

  const empty = await api("POST", "/api/studio/sources/github", { url: "" });
  assert.equal(empty.statusCode, 400);
});
