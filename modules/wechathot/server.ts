// WeChatHot's backend socket. The api and worker install it from site/modules/server.ts. The studio's
// private API starts here: the same admin session as /admin, never a second account system.
import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import type { AdminMe } from "@aihot/contracts/admin";
import { actorOf, sessionPrincipal, type AdminPrincipal } from "@aihot/backend/admin/auth";
import { Conflict } from "@aihot/backend/audit";
import { sql } from "@aihot/backend/db";
import { config } from "@aihot/backend/config";
import { listStudioEvents } from "./event-list.ts";
import { defineServerModule } from "@aihot/backend/modules";
import { BrandRejected, brandDetail, createBrand, deleteBrand, listBrands, mergeBrands, updateBrand } from "./brands.ts";
import { projectRecentEvents } from "./events.ts";
import { studioEventDetail, updateStudioEventState } from "./event-detail.ts";
import {
  TOPIC_STATUSES,
  TopicExists,
  TopicRejected,
  createTopic,
  listTopics,
  refreshTopicSnapshot,
  topicDetail,
  updateTopic,
} from "./topics.ts";
import { articleDetail, articleSources, createArticleFromTopic, generateReview, listArticles, updateArticle, updateReview } from "./articles.ts";
import { markdown, markdownLosesEvidence, markdownToDoc, plainText } from "./export.ts";
import { queueArticleStep, queueWriteStep } from "./writing.ts";
import { listAlerts, markAllAlertsRead, setAlertStatus } from "./alerts.ts";
import { deleteChannel, removeBrandFollow, saveBrandFollow, setBrandChannel, updateChannel } from "./follows.ts";
import { checkGithubRepo, subscribeGithubReleases } from "./github.ts";
import { createStylePreset, deleteStylePreset, setTopicPreset, updateStylePreset } from "./presets.ts";
import { renderWechatHtml } from "./wechat-html.ts";
import { readUpload, saveUpload } from "./uploads.ts";
import { currentMonth, loadCalendar } from "./calendar.ts";
import type {
  ColumnType,
  PresetKind,
  StylePreset,
  StudioPresets,
} from "./studio-types.ts";

interface PresetRow {
  id: string;
  kind: PresetKind;
  name: string;
  column_type: ColumnType | null;
  target_reader: string | null;
  word_count: number | null;
  tone: string | null;
  title_preference: string | null;
  forbidden_expressions: string[];
  format: Record<string, unknown>;
  builtin: boolean;
}

const PROBLEM_TITLES: Record<number, string> = {
  400: "Bad request",
  403: "Forbidden",
  404: "Not found",
  409: "Conflict",
  500: "Internal error",
};

function problem(req: FastifyRequest, reply: FastifyReply, status: number, code: string, detail: string) {
  return reply
    .code(status)
    .header("Content-Type", "application/problem+json")
    .header("X-Request-Id", req.id)
    .header("Cache-Control", "no-store")
    .send({
      type: `/problems/${code.replace(/_/g, "-")}`,
      title: PROBLEM_TITLES[status] ?? "Error",
      status,
      detail,
      code,
      requestId: req.id,
    });
}

type StudioHandler = (req: FastifyRequest, reply: FastifyReply, admin: AdminPrincipal) => Promise<unknown>;

/** /api/studio/* uses the same live admin session and CSRF token as /api/admin/*. */
function studioHandler(fn: StudioHandler) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    reply.header("Cache-Control", "no-store").header("X-Robots-Tag", "noindex, nofollow");
    const admin = await sessionPrincipal(req.headers.cookie);
    if (!admin) return problem(req, reply, 401, "unauthorized", "Sign in to the studio first.");
    if (req.method !== "GET" && req.method !== "HEAD" && req.headers["x-csrf-token"] !== admin.csrf) {
      return problem(req, reply, 403, "forbidden", "Missing or stale CSRF token.");
    }
    try {
      return await fn(req, reply, admin);
    } catch (error) {
      if (error instanceof ZodError) {
        const detail = error.issues.map((issue) => `${issue.path.join(".") || "请求"}: ${issue.message}`).join("; ");
        return problem(req, reply, 400, "invalid_request", detail.slice(0, 300));
      }
      if (error instanceof BrandRejected || (error as { statusCode?: number }).statusCode === 400 || error instanceof SyntaxError) {
        return problem(req, reply, 400, "invalid_request", String((error as Error).message).slice(0, 300));
      }
      if (error instanceof TopicExists) {
        return reply
          .code(409)
          .header("Content-Type", "application/problem+json")
          .header("X-Request-Id", req.id)
          .header("Cache-Control", "no-store")
          .send({ status: 409, code: "conflict", detail: error.message, existing: error.existing, requestId: req.id });
      }
      if (error instanceof Conflict || (error as { code?: string }).code === "conflict") {
        return problem(req, reply, 409, "conflict", (error as Error).message);
      }
      req.log.error({ err: error, path: req.url.split("?")[0] }, "studio api error");
      return problem(req, reply, 500, "internal_error", String((error as Error).message).slice(0, 300));
    }
  };
}

function queryValue(req: FastifyRequest, key: string): string | undefined {
  const value = (req.query as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function param(req: FastifyRequest, key: string): string {
  return (req.params as Record<string, string>)[key]!;
}

function stylePreset(row: PresetRow): StylePreset {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    columnType: row.column_type,
    targetReader: row.target_reader,
    wordCount: row.word_count,
    tone: row.tone,
    titlePreference: row.title_preference,
    forbiddenExpressions: row.forbidden_expressions,
    format: row.format,
    builtin: row.builtin,
  };
}

export const wechatHotServer = defineServerModule({
  name: "wechathot",
  schedules: [
    // The workbench reads its event list from wc_event_meta; a failed event stays out of date until
    // the next run without affecting collection or the public publication pipeline.
    { name: "wechathot.events.project", cron: "*/5 * * * *", run: projectRecentEvents, missed: "skip" },
  ],
  http(app) {
    // The shell reads who is signed in here. A visitor without a live session gets 401, and the web
    // layout turns that into the sign-in page with /studio as its return path.
    app.get("/api/studio/me", studioHandler(async (_req, _reply, admin) => {
      const me: AdminMe = { name: admin.name, csrf: admin.csrf, dev: admin.dev };
      return me;




    }));

    // The publishing calendar: what is scheduled this month, topics and drafts together.
    app.get("/api/studio/calendar", studioHandler(async (req) => {
      return await loadCalendar(queryValue(req, "month") ?? currentMonth());
    }));

    // The hot list: filters, five orderings and the facet counts all come from one read model.
    app.get("/api/studio/events", studioHandler(async (req) => listStudioEvents(req.query)));

    // One event: the public evidence plus the editor's own read/star/follow-up state.
    app.get("/api/studio/events/:publicId", studioHandler(async (req, reply) => {
      const event = await studioEventDetail(param(req, "publicId"));
      if (!event) return problem(req, reply, 404, "not_found", "事件不存在。");
      return event;
    }));

    app.patch("/api/studio/events/:publicId/state", studioHandler(async (req, reply, admin) => {
      const event = await updateStudioEventState(param(req, "publicId"), req.body ?? {}, actorOf(admin));
      if (!event) return problem(req, reply, 404, "not_found", "事件不存在。");
      return event;
    }));

    // The pitch board: a topic freezes the event's evidence when it is created.
    app.get("/api/studio/topics", studioHandler(async (req) => {
      const status = queryValue(req, "status");
      if (status !== undefined && status !== "all" && !TOPIC_STATUSES.includes(status as never)) {
        throw new TopicRejected("未知的选题状态");
      }
      const columnType = queryValue(req, "columnType");
      if (columnType !== undefined && columnType !== "news" && columnType !== "insight") {
        throw new TopicRejected("栏目只能是 news 或 insight");
      }
      const storyId = queryValue(req, "storyId");
      return {
        items: await listTopics({
          status: status as never,
          columnType: columnType as never,
          storyId: storyId === undefined ? undefined : Number(storyId),
          q: queryValue(req, "q"),
        }),
      };
    }));

    app.post("/api/studio/topics", studioHandler(async (req, reply, admin) => {
      const topic = await createTopic(req.body ?? {}, actorOf(admin));
      return reply.code(201).send(topic);
    }));

    app.get("/api/studio/topics/:id", studioHandler(async (req, reply) => {
      const topic = await topicDetail(Number(param(req, "id")));
      if (!topic) return problem(req, reply, 404, "not_found", "选题不存在。");
      return topic;
    }));

    app.patch("/api/studio/topics/:id", studioHandler(async (req, reply, admin) => {
      const topic = await updateTopic(Number(param(req, "id")), req.body ?? {}, actorOf(admin));
      if (!topic) return problem(req, reply, 404, "not_found", "选题不存在。");
      return topic;
    }));

    app.post("/api/studio/topics/:id/refresh-snapshot", studioHandler(async (req, reply, admin) => {
      const topic = await refreshTopicSnapshot(Number(param(req, "id")), actorOf(admin));
      if (!topic) return problem(req, reply, 404, "not_found", "选题不存在。");
      return topic;
    }));

    // Writing steps are paid model calls, so the click only puts the step in the queue.
    app.post("/api/studio/topics/:id/angles", studioHandler(async (req, reply) => {
      const id = Number(param(req, "id"));
      if (!(await topicDetail(id))) return problem(req, reply, 404, "not_found", "选题不存在。");
      const jobId = await queueWriteStep(id, "angles");
      return reply.code(202).send({ jobId, step: "angles" });
    }));

    app.post("/api/studio/topics/:id/outline", studioHandler(async (req, reply) => {
      const id = Number(param(req, "id"));
      const topic = await topicDetail(id);
      if (!topic) return problem(req, reply, 404, "not_found", "选题不存在。");
      if (!topic.angle?.trim()) throw new TopicRejected("先选定一个角度，再生成大纲");
      const jobId = await queueWriteStep(id, "outline");
      return reply.code(202).send({ jobId, step: "outline" });
    }));

    app.patch("/api/studio/topics/:id/preset", studioHandler(async (req, reply, admin) => {
      const id = Number(param(req, "id"));
      const body = (req.body ?? {}) as { presetId?: string | null };
      const presetId = typeof body.presetId === "string" ? body.presetId : null;
      if (!(await setTopicPreset(id, presetId, actorOf(admin)))) {
        return problem(req, reply, 404, "not_found", "选题不存在。");
      }
      return await topicDetail(id);
    }));

    app.post("/api/studio/topics/:id/article", studioHandler(async (req, reply) => {
      const mode = (req.body as { mode?: string } | undefined)?.mode === "quick" ? "quick" : "step";
      const article = await createArticleFromTopic(Number(param(req, "id")), mode);
      if (!article) return problem(req, reply, 404, "not_found", "选题不存在。");
      return reply.code(201).send(article);
    }));

    // A draft: its content and versions, and the two paid writing steps.
    app.get("/api/studio/articles", studioHandler(async (req) => ({
      items: await listArticles({ status: queryValue(req, "status"), q: queryValue(req, "q") }),
    })));

    app.get("/api/studio/articles/:id", studioHandler(async (req, reply) => {
      const article = await articleDetail(Number(param(req, "id")));
      if (!article) return problem(req, reply, 404, "not_found", "稿件不存在。");
      return article;
    }));

    // Markdown source mode: the editor applies a whole document; claim kinds and citations are not
    // representable in Markdown, so the caller is warned before this runs.
    app.post("/api/studio/articles/:id/markdown", studioHandler(async (req, reply) => {
      const body = (req.body ?? {}) as { markdown?: unknown };
      if (typeof body.markdown !== "string") return problem(req, reply, 400, "invalid_request", "markdown 必须是字符串");
      const article = await updateArticle(Number(param(req, "id")), { content: markdownToDoc(body.markdown) });
      if (!article) return problem(req, reply, 404, "not_found", "稿件不存在。");
      return article;
    }));

    app.patch("/api/studio/articles/:id", studioHandler(async (req, reply) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const status = body.status;
      const patch: { title?: string; content?: never; status?: "draft" | "review" | "done" | "archived"; plannedFor?: string | null } = {};
      if (typeof body.title === "string") patch.title = body.title;
      if (body.plannedFor === null) patch.plannedFor = null;
      else if (typeof body.plannedFor === "string") patch.plannedFor = body.plannedFor;
      if (body.content && typeof body.content === "object") patch.content = body.content as never;
      if (typeof status === "string" && ["draft", "review", "done", "archived"].includes(status)) {
        patch.status = status as "draft" | "review" | "done" | "archived";
      }
      const article = await updateArticle(Number(param(req, "id")), patch);
      if (!article) return problem(req, reply, 404, "not_found", "稿件不存在。");
      return article;
    }));

    app.post("/api/studio/articles/:id/body", studioHandler(async (req, reply) => {
      const id = Number(param(req, "id"));
      const article = await articleDetail(id);
      if (!article) return problem(req, reply, 404, "not_found", "稿件不存在。");
      const body = (req.body ?? {}) as { sectionIndex?: number; instruction?: string };
      const sectionIndex = typeof body.sectionIndex === "number" ? body.sectionIndex : undefined;
      const jobId = await queueArticleStep({
        articleId: id,
        topicId: article.topicId ?? undefined,
        step: sectionIndex === undefined ? "body" : "bodySection",
        sectionIndex,
        instruction: typeof body.instruction === "string" ? body.instruction : undefined,
      });
      return reply.code(202).send({ jobId, step: sectionIndex === undefined ? "body" : "bodySection" });
    }));

    app.post("/api/studio/articles/:id/titles", studioHandler(async (req, reply) => {
      const id = Number(param(req, "id"));
      const article = await articleDetail(id);
      if (!article) return problem(req, reply, 404, "not_found", "稿件不存在。");
      const jobId = await queueArticleStep({ articleId: id, topicId: article.topicId ?? undefined, step: "titles" });
      return reply.code(202).send({ jobId, step: "titles" });
    }));

    // The review checklist is stored separately from the body: it lists risks for the editor to confirm,
    // modify or ignore, and never rewrites the draft.
    app.post("/api/studio/articles/:id/review", studioHandler(async (req, reply) => {
      const article = await generateReview(Number(param(req, "id")));
      if (!article) return problem(req, reply, 404, "not_found", "稿件不存在。");
      return article;
    }));

    // Draft images: stored on disk under the data directory, read back by the editor through the same
    // admin session. The shape of the URL is checked before anything is read.
    app.post("/api/studio/uploads", studioHandler(async (req) => saveUpload(req.body ?? {})));

    app.get("/api/studio/uploads/:folder/:name", studioHandler(async (req, reply) => {
      const file = await readUpload(param(req, "folder"), param(req, "name"));
      if (!file) return problem(req, reply, 404, "not_found", "图片不存在。");
      return reply.type(file.contentType).header("Cache-Control", "private, max-age=3600").send(file.buffer);
    }));

    // Plain text and Markdown exports: the same body, with an optional list of the cited sources.
    app.get("/api/studio/articles/:id/export", studioHandler(async (req, reply) => {
      const article = await articleDetail(Number(param(req, "id")));
      if (!article) return problem(req, reply, 404, "not_found", "稿件不存在。");
      const withSources = queryValue(req, "sources") !== "0";
      const sources = withSources ? await articleSources(article.id) : [];
      const kind = queryValue(req, "format") === "text" ? "text" : "markdown";
      const text = kind === "markdown" ? markdown(article.content, sources) : plainText(article.content, sources);
      return { format: kind, text, losesEvidence: markdownLosesEvidence(article.content) };
    }));

    // The 公众号 body: whitelisted tags, inline styles and a sanitize pass before anything is copied.
    app.get("/api/studio/articles/:id/wechat-html", studioHandler(async (req, reply) => {
      const article = await articleDetail(Number(param(req, "id")));
      if (!article) return problem(req, reply, 404, "not_found", "稿件不存在。");
      return { html: renderWechatHtml(article.content, article.format as never, config.siteUrl) };
    }));

    app.patch("/api/studio/articles/:id/review", studioHandler(async (req, reply) => {
      const body = (req.body ?? {}) as { items?: unknown };
      const items = Array.isArray(body.items) ? body.items : null;
      if (!items) return problem(req, reply, 400, "invalid_request", "items 必须是数组");
      const article = await updateReview(Number(param(req, "id")), items as never);
      if (!article) return problem(req, reply, 404, "not_found", "稿件不存在。");
      return article;
    }));

    // Notifications: one list, one state command per alert, and a bulk mark-as-read.
    app.get("/api/studio/alerts", studioHandler(async (req) => {
      const status = queryValue(req, "status");
      return await listAlerts({ status: status as never });
    }));

    app.patch("/api/studio/alerts/:id", studioHandler(async (req, reply) => {
      const alert = await setAlertStatus(Number(param(req, "id")), req.body ?? {});
      if (!alert) return problem(req, reply, 404, "not_found", "通知不存在。");
      return alert;
    }));

    app.post("/api/studio/alerts/read-all", studioHandler(async () => {
      return { updated: await markAllAlertsRead() };
    }));

    // Brand library: list/search with industry and follow filters, then the editable CRUD surface.
    app.get("/api/studio/brands", studioHandler(async (req) => {
      const followed = queryValue(req, "followed");
      if (followed !== undefined && followed !== "true" && followed !== "false") {
        throw new BrandRejected("followed 只能是 true 或 false");
      }
      return {
        items: await listBrands({
          q: queryValue(req, "q"),
          industry: queryValue(req, "industry"),
          followed,
        }),
      };
    }));

    app.post("/api/studio/brands", studioHandler(async (req, reply, admin) => {
      const brand = await createBrand(req.body ?? {}, actorOf(admin));
      return reply.code(201).send(brand);
    }));

    // Merge duplicate brands. The target is the survivor; `from` and `into` are brand ids.
    app.post("/api/studio/brands/merge", studioHandler(async (req, reply, admin) => {
      const merged = await mergeBrands(req.body ?? {}, actorOf(admin));
      if (!merged) return problem(req, reply, 404, "not_found", "要合并的品牌不存在。");
      return merged;
    }));

    // The detail page's merge button knows the duplicate it is looking at, so it only sends the target.
    app.post("/api/studio/brands/:id/merge", studioHandler(async (req, reply, admin) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const merged = await mergeBrands({ ...body, from: param(req, "id") }, actorOf(admin));
      if (!merged) return problem(req, reply, 404, "not_found", "要合并的品牌不存在。");
      return merged;
    }));

    app.get("/api/studio/brands/:id", studioHandler(async (req, reply) => {
      const brand = await brandDetail(param(req, "id"));
      if (!brand) return problem(req, reply, 404, "not_found", "品牌不存在。");
      return brand;
    }));

    app.patch("/api/studio/brands/:id", studioHandler(async (req, reply, admin) => {
      const brand = await updateBrand(param(req, "id"), req.body ?? {}, actorOf(admin));
      if (!brand) return problem(req, reply, 404, "not_found", "品牌不存在。");
      return brand;
    }));

    app.delete("/api/studio/brands/:id", studioHandler(async (req, reply, admin) => {
      const deleted = await deleteBrand(param(req, "id"), actorOf(admin));
      if (!deleted) return problem(req, reply, 404, "not_found", "品牌不存在。");
      return reply.code(204).send();
    }));

    // Following a brand and the channels that feed it. A single channel can be paused or removed
    // without cancelling the brand's follow.
    app.put("/api/studio/brands/:id/follow", studioHandler(async (req, reply, admin) => {
      const follow = await saveBrandFollow(param(req, "id"), req.body ?? {}, actorOf(admin));
      if (!follow) return problem(req, reply, 404, "not_found", "品牌不存在。");
      return follow;
    }));

    app.delete("/api/studio/brands/:id/follow", studioHandler(async (req, reply, admin) => {
      const removed = await removeBrandFollow(param(req, "id"), actorOf(admin));
      if (!removed) return problem(req, reply, 404, "not_found", "这个品牌还没有关注。");
      return reply.code(204).send();
    }));

    app.patch("/api/studio/brands/:brandId/channels/:channelId", studioHandler(async (req, reply, admin) => {
      const relation = await setBrandChannel(
        param(req, "brandId"),
        param(req, "channelId"),
        req.body ?? {},
        actorOf(admin),
      );
      if (!relation) return problem(req, reply, 404, "not_found", "品牌没有这个渠道。");
      return relation;
    }));

    app.patch("/api/studio/channels/:id", studioHandler(async (req, reply, admin) => {
      const channel = await updateChannel(param(req, "id"), req.body ?? {}, actorOf(admin));
      if (!channel) return problem(req, reply, 404, "not_found", "渠道不存在。");
      return channel;
    }));

    app.delete("/api/studio/channels/:id", studioHandler(async (req, reply, admin) => {
      const removed = await deleteChannel(param(req, "id"), actorOf(admin));
      if (!removed) return problem(req, reply, 404, "not_found", "渠道不存在。");
      return reply.code(204).send();
    }));

    // GitHub repositories: check one, then subscribe to its releases as an RSS source.
    app.post("/api/studio/sources/github/check", studioHandler(async (req) => {
      const url = (req.body as { url?: unknown } | undefined)?.url;
      return await checkGithubRepo(typeof url === "string" ? url : "");
    }));

    app.post("/api/studio/sources/github", studioHandler(async (req, reply, admin) => {
      const body = (req.body ?? {}) as { url?: unknown; brandId?: unknown };
      const subscribed = await subscribeGithubReleases(
        {
          url: typeof body.url === "string" ? body.url : "",
          brandId: typeof body.brandId === "string" && body.brandId ? body.brandId : null,
        },
        actorOf(admin),
      );
      return reply.code(201).send(subscribed);
    }));

    // The settings page reads the built-in writing and formatting presets from here. Custom presets
    // are returned too, so the page does not need a second endpoint when WCH-23 adds them.
    app.get("/api/studio/presets", async (req, reply) => {
      reply.header("Cache-Control", "no-store").header("X-Robots-Tag", "noindex, nofollow");
      const admin = await sessionPrincipal(req.headers.cookie);
      if (!admin) return reply.code(401).send({ detail: "Sign in to the studio first." });

      const rows = await sql<PresetRow[]>`
        SELECT id, kind, name, column_type, target_reader, word_count, tone, title_preference,
               forbidden_expressions, format, builtin
        FROM wc_style_presets
        ORDER BY builtin DESC, kind, name`;
      const presets = rows.map(stylePreset);
      const body: StudioPresets = {
        writing: presets.filter((preset) => preset.kind === "writing"),
        format: presets.filter((preset) => preset.kind === "format"),
      };
      return reply.send(body);
    });

    app.post("/api/studio/presets", studioHandler(async (req, reply, admin) => {
      const preset = await createStylePreset(req.body ?? {}, actorOf(admin));
      return reply.code(201).send(preset);
    }));

    app.patch("/api/studio/presets/:id", studioHandler(async (req, reply, admin) => {
      const preset = await updateStylePreset(param(req, "id"), req.body ?? {}, actorOf(admin));
      if (!preset) return problem(req, reply, 404, "not_found", "预设不存在。");
      return preset;
    }));

    app.delete("/api/studio/presets/:id", studioHandler(async (req, reply, admin) => {
      const removed = await deleteStylePreset(param(req, "id"), actorOf(admin));
      if (!removed) return problem(req, reply, 404, "not_found", "预设不存在。");
      return removed;
    }));
  },
});
