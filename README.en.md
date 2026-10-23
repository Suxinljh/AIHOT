# WeChatHot

**A single-user AI content workbench for WeChat public-account tech writers.**

From a hot event to a draft you can paste into the WeChat editor: discover, judge whether it is worth writing, generate angles and an outline, write the body and titles, check the facts, lay it out, and export WeChat-compatible rich text. No sign-up, teams or collaboration — the admin session is the only user.

Seven industries: AI models, automotive, consumer hardware, software & internet, embodied AI, film & TV, games.

> Status: in development. The public reading site is retired; `/` is the workbench. Only the workbench, the admin and the health check are served.

## What it does

- **Hot list** — filter by industry, brand, channel, source tier and read state; three side-by-side scores (heat, news value, topic recommendation).
- **Event detail** — timeline, facts, reports and score reasons, plus the editor's own read/save/ignore/follow-up state.
- **Topics** — freeze the event's evidence, move a topic along the pipeline, plan a publish day.
- **Writing** — angle candidates, outline, body and title candidates, with writing-style presets.
- **Review** — a checklist of facts, numbers, dates, sources and potential exaggeration; confirm, edit or ignore each item without touching the body.
- **Layout & delivery** — content / layout / WeChat / Markdown views; font size, line height, spacing, alignment and image radius; whitelisted tags with inline styles, sanitized, ready to paste.
- **Sources & brands** — RSS, web lists, JSON, X, WeChat accounts, external pushes and the GitHub API; brand library, aliases, channels, follow rules and in-site alerts.
- **Metrics & calendar** — adoption, completion, rewrite rate, model cost per draft and per hundred collected items; a publishing calendar.

## Stack

- Web: React Router 8 (SSR), TipTap 3, Tailwind 4
- API: Fastify
- Database: PostgreSQL 17
- Jobs: pg-boss
- Models: configured per step, with receipts and budget circuit breakers
- Tests: Node test runner, 600+ automated tests

## Run locally

Requires Node.js 24 and PostgreSQL 17.

```bash
git clone https://github.com/Suxinljh/WeChatHot.git
cd WeChatHot
npm install

cp .env.example .env        # or: node scripts/init-env.ts --llm-key <key>
# fill at least DATABASE_URL, SESSION_SECRET, ADMIN_PASSWORD, LLM_API_KEY

npm run db:migrate
npm run seed:wechathot

npm run dev:api             # http://127.0.0.1:3001
npm run dev:web             # http://127.0.0.1:3000
npm run dev:worker          # collection, projection and alerts
```

Open http://127.0.0.1:3000 and sign in with `ADMIN_PASSWORD`. The back office lives at `/admin`.

Collection and model calls stay off until you set `COLLECT_ENABLED=true` and `MODEL_CALLS_ENABLED=true`.

## Tests

```bash
npm run typecheck
npm test                                                     # needs a database ending in _test or _ci
npm run build -w @aihot/web && node --test apps/web/tests/*.test.ts
node scripts/smoke.ts --base http://localhost:3000
```

## Docs

The detailed documentation is in Chinese:

- [Product requirements](docs/WeChatHot/PRD.md)
- [Architecture](docs/architecture.md)
- [Deployment](docs/deploy.md)
- [Sources](docs/sources.md)
- [Selection](docs/selection.md)
- [WeChat paste checklist](docs/WeChatHot/wechat-paste-checklist.md)

## Boundaries

- Single user; no registration, teams or permissions.
- No automatic publishing to WeChat: it produces paste-ready rich text, publishing stays manual.
- Uploaded images live on the deployment's local disk (`.data/uploads`) and need a public URL before WeChat can fetch them.
- The public reading site, RSS, API v1, MCP and sitemaps are retired.

## License

MIT. The engine framework is adapted from [AIHOT](https://github.com/KKKKhazix/AIHOT) (MIT); the product and interface are rebuilt for WeChatHot.
