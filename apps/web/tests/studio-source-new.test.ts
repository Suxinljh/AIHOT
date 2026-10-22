// The GitHub branch of the new-source page against a synthetic api: the production web server, no
// database and no model calls. Run after `npm run build -w @aihot/web`.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { startWebServer, type WebServer } from "./web-server.ts";

const SESSION = "aihot_admin=studio-github-test";
let web: WebServer;

const check = {
  repo: {
    owner: "openai",
    repo: "openai-python",
    fullName: "openai/openai-python",
    htmlUrl: "https://github.com/openai/openai-python",
    description: "官方 Python 库",
    private: false,
    archived: false,
    fork: false,
    ownerType: "Organization",
    defaultBranch: "main",
    pushedAt: "2026-05-01T10:00:00.000Z",
    stars: 1200,
    releases: [{
      tag: "v1.2.3",
      name: "1.2.3",
      url: "https://github.com/openai/openai-python/releases/tag/v1.2.3",
      publishedAt: "2026-04-20T08:00:00.000Z",
      notes: "修复若干问题",
    }],
  },
  owner: {
    brandId: "openai",
    brandName: "OpenAI",
    reason: "品牌官网指向该 GitHub 账号",
    official: true,
    candidates: [{ id: "openai", name: "OpenAI", reason: "品牌官网指向该 GitHub 账号" }],
  },
};

const subscribed = {
  source: { id: "github-openai-openai-python", name: "openai/openai-python" },
  preview: { count: 1, items: [{ title: "v1.2.3", url: "https://github.com/openai/openai-python/releases/tag/v1.2.3", publishedAt: "2026-04-20T08:00:00.000Z", excerpt: "版本说明" }] },
  channel: { id: "github-openai-openai-python", displayName: "openai/openai-python" },
  owner: { ...check.owner, brandId: "openai", official: true },
};

const api = createServer((req, res) => {
  const url = new URL(req.url!, "http://api.local");
  res.setHeader("Content-Type", "application/json");
  if (url.pathname === "/api/site/meta") return res.end(JSON.stringify({ changelogVersion: null }));
  if (url.pathname === "/api/studio/me") {
    if (req.headers.cookie?.includes(SESSION)) return res.end(JSON.stringify({ name: "Studio test", csrf: "studio-test-csrf", dev: false }));
    res.statusCode = 401;
    return res.end(JSON.stringify({ detail: "Sign in to the studio first." }));
  }
  if (url.pathname === "/api/studio/sources/github/check" || url.pathname === "/api/studio/sources/github") {
    if (!req.headers.cookie?.includes(SESSION)) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ detail: "Sign in to the studio first." }));
    }
    if (url.pathname.endsWith("/check")) return res.end(JSON.stringify(check));
    return res.end(JSON.stringify(subscribed));
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ code: "not_found" }));
});

before(async () => { web = await startWebServer(api); });
after(() => web.stop());

test("the new-source page offers the GitHub branch", async () => {
  const response = await fetch(`${web.origin}/studio/sources/new`, { headers: { cookie: SESSION } });
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const text of ["添加信源", "GitHub 仓库地址", "检查仓库"]) assert.ok(html.includes(text), text);
  assert.match(html, /<title>添加信源 · WeChatHot Studio<\/title>/);
});
