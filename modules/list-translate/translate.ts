// The Chinese note on a source list's entries (site/site.ts FEED_LISTS with translate): written once by
// the model and stored on the publication row, where the list prefers it over the source's own lead.
// Readers never wait for a model (AGENTS.md) — this runs in the worker on a schedule — and an answer
// already paid for is reused instead of bought again (providers/receipts.ts).
import { z } from "zod";
import { sql } from "@aihot/backend/db";
import { modelFor } from "@aihot/backend/editorial/models";
import { promptText, promptVersion } from "@aihot/backend/editorial/prompts";
import { shutdownSignal } from "@aihot/backend/jobs/queue";
import { collapseWhitespace } from "@aihot/backend/lib/text";
import { setListSummary } from "@aihot/backend/publication/source-list";
import { chatJson } from "@aihot/backend/providers/llm";
import { FEED_LISTS } from "@aihot/site";

/** The model step this module registers: the default is the site's LLM_MODEL, LIST_TRANSLATE_MODEL overrides it. */
export const LIST_TRANSLATE_STEP = "listTranslate";

const SYSTEM = promptText("translate-list");
const PROMPT_VERSION = promptVersion("translate-list");

/** One answer: the note, in Chinese. */
const Note = z.object({ t: z.string().min(1) });

/** How many entries one run takes on: a backlog is worked off over several runs, not in one burst. */
const BATCH = 20;
/** How long one run may spend before it leaves the rest to the next one. */
const BUDGET_MS = 4 * 60_000;
/** How much of the source's own text the model sees: a feed summary, or the start of a short body. */
const TEXT_CHARS = 400;

/** The lists whose entries the site wants in Chinese. */
function translatedSourceIds(): string[] {
  return [...new Set(FEED_LISTS.filter((l) => l.translate).map((l) => l.sourceId))];
}

interface PendingRow {
  id: string;
  title: string;
  text: string;
}

/**
 * Entries of those lists that have no note yet, newest first. Text that already contains Chinese is
 * left as the source wrote it: there is nothing to translate, and the list shows the source's own lead.
 */
async function pending(limit: number): Promise<PendingRow[]> {
  const sources = translatedSourceIds();
  if (sources.length === 0) return [];
  return sql<PendingRow[]>`
    SELECT a.id, coalesce(p.title, a.title) AS title,
           coalesce(nullif(btrim(a.excerpt), ''), left(a.body_text, ${TEXT_CHARS})) AS text
    FROM articles a
    JOIN publications p ON p.article_id = a.id AND p.visibility = 'public'
    WHERE a.source_id = ANY(${sources}::text[]) AND a.processing_state <> 'failed'
      AND coalesce(p.summary, '') = ''
      AND coalesce(nullif(btrim(a.excerpt), ''), left(a.body_text, ${TEXT_CHARS})) !~ '[一-龥]'
    ORDER BY a.discovered_at DESC LIMIT ${limit}`;
}

export interface ListTranslateRun {
  /** Entries that got their note in this run. */
  translated: number;
  /** Entries the model could not answer for: they keep the source's own wording and are tried again. */
  failed: number;
  /** Entries this run did not get to. */
  left: number;
  /** Set when the run stopped early: model calls switched off, no model configured, or the budget spent. */
  stopped?: string;
}

/**
 * Writes the Chinese note of every list entry that has none. One entry the model keeps failing on stays
 * on the source's own wording and does not stop the run; the next run picks up the next entry.
 */
export async function translatePendingListNotes(opts: { limit?: number; budgetMs?: number } = {}): Promise<ListTranslateRun> {
  const rows = await pending(opts.limit ?? BATCH);
  const started = Date.now();
  let translated = 0;
  let failed = 0;
  let stopped: string | undefined;
  let model: string | null = null;
  for (const row of rows) {
    if (shutdownSignal.signal.aborted || Date.now() - started > (opts.budgetMs ?? BUDGET_MS)) break;
    try {
      model ??= await modelFor(LIST_TRANSLATE_STEP);
      const res = await chatJson({
        model,
        purpose: "list_translate",
        subject: `article:${row.id}`,
        promptVersion: PROMPT_VERSION,
        system: SYSTEM,
        user: JSON.stringify({ title: row.title, text: row.text }),
        schema: Note,
        temperature: 0.2,
        maxTokens: 400,
        timeoutMs: 60_000,
      });
      const note = collapseWhitespace(res.data.t);
      if (note) {
        await setListSummary(row.id, note);
        translated += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Switched-off model calls, a model the site does not have, or a spent budget: stop this run.
      if (/disabled|not configured|budget/i.test(message)) {
        stopped = message;
        break;
      }
      failed += 1;
    }
  }
  return { translated, failed, left: rows.length - translated - failed, ...(stopped ? { stopped } : {}) };
}
