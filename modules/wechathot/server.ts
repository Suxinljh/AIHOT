// WeChatHot's backend socket. The api and worker install it from site/modules/server.ts. The studio's
// private API starts here: the same admin session as /admin, never a second account system.
import type { AdminMe } from "@aihot/contracts/admin";
import { sessionPrincipal } from "@aihot/backend/admin/auth";
import { sql } from "@aihot/backend/db";
import { defineServerModule } from "@aihot/backend/modules";
import { projectRecentEvents } from "./events.ts";
import type {
  BrandListItem,
  ColumnType,
  PresetKind,
  StylePreset,
  StudioPresets,
  VerificationStatus,
} from "./studio-types.ts";

interface BrandRow {
  id: string;
  entity_id: string | null;
  name: string;
  aliases: string[];
  website: string | null;
  logo_url: string | null;
  industries: string[];
  verified_status: VerificationStatus;
}

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

function brandItem(row: BrandRow): BrandListItem {
  return {
    id: row.id,
    entityId: row.entity_id,
    name: row.name,
    aliases: row.aliases,
    website: row.website,
    logoUrl: row.logo_url,
    industries: row.industries,
    verifiedStatus: row.verified_status,
  };
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
    app.get("/api/studio/me", async (req, reply) => {
      reply.header("Cache-Control", "no-store").header("X-Robots-Tag", "noindex, nofollow");
      const admin = await sessionPrincipal(req.headers.cookie);
      if (!admin) return reply.code(401).send({ detail: "Sign in to the studio first." });
      const me: AdminMe = { name: admin.name, csrf: admin.csrf, dev: admin.dev };
      return reply.send(me);
    });

    // The first brand-library read. WCH-10 adds the editable CRUD surface on top of this; the list
    // already supports the two filters the event and brand views need.
    app.get("/api/studio/brands", async (req, reply) => {
      reply.header("Cache-Control", "no-store").header("X-Robots-Tag", "noindex, nofollow");
      const admin = await sessionPrincipal(req.headers.cookie);
      if (!admin) return reply.code(401).send({ detail: "Sign in to the studio first." });

      const { q, industry } = req.query as { q?: string; industry?: string };
      const pattern = typeof q === "string" && q.trim() ? `%${q.trim()}%` : null;
      const industryKey = typeof industry === "string" && industry.trim() ? industry.trim() : null;
      const rows = await sql<BrandRow[]>`
        SELECT id, entity_id, name, aliases, website, logo_url, industries, verified_status
        FROM wc_brands
        WHERE (${pattern}::text IS NULL
               OR name ILIKE ${pattern}
               OR EXISTS (SELECT 1 FROM unnest(aliases) AS a(alias) WHERE alias ILIKE ${pattern}))
          AND (${industryKey}::text IS NULL OR ${industryKey} = ANY(industries))
        ORDER BY name
        LIMIT 200`;
      const items: BrandListItem[] = rows.map(brandItem);
      return reply.send({ items });
    });

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
