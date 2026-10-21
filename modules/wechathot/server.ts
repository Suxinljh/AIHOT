// WeChatHot's backend socket. The api and worker install it from site/modules/server.ts. The studio's
// private API starts here: the same admin session as /admin, never a second account system.
import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import type { AdminMe } from "@aihot/contracts/admin";
import { actorOf, sessionPrincipal, type AdminPrincipal } from "@aihot/backend/admin/auth";
import { Conflict } from "@aihot/backend/audit";
import { sql } from "@aihot/backend/db";
import { defineServerModule } from "@aihot/backend/modules";
import { BrandRejected, brandDetail, createBrand, deleteBrand, listBrands, mergeBrands, updateBrand } from "./brands.ts";
import { projectRecentEvents } from "./events.ts";
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
  },
});
