// What a module's web.tsx (modules/<name>/web.tsx) may add to the web app: admin navigation entries and
// the parts of a few admin pages that leave room for them. The public reading site is retired, so the
// reader-side extension points are gone. Its own pages come from its module.ts (routes.ts).
import type { ComponentType } from "react";

export interface AdminNavEntry {
  to: string;
  label: string;
  /** The badge: a key of the admin's navigation counts (its server module's admin.counts). */
  count?: string;
  tone?: "bad" | "accent";
}

export type Part<T> = () => Promise<{ default: T }>;

export interface WebModule {
  /** Its folder under modules/. */
  name: string;
  admin?: {
    /** Navigation groups of its own, ahead of the engine's. */
    groups?: Array<{ group: string; items: AdminNavEntry[] }>;
    /** Entries in the 内容 group, after the engine's 信源. */
    content?: AdminNavEntry[];
    /** Its part of the runs page, drawn from what its server module's admin.runs returns. */
    runs?: Part<ComponentType<{ data: unknown }>>;
    /** The page the admin opens on instead of the sources (routes/admin/index.tsx); the first module's wins. */
    landing?: string;
    /** Where the model prices are kept: the models page links its 未定价 there (routes/admin/models.tsx). */
    prices?: string;
  };
  /** Paths of the marks it serves that are drawn in white, for a dark tile (components/BrandMark.tsx). */
  darkMarks?: string[];
}

export function defineWebModule(module: WebModule): WebModule {
  return module;
}
