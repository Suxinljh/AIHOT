// The site's list-translate module: it gives the entries of a source list (site/site.ts FEED_LISTS with
// translate) a Chinese note. Registered in site/modules/server.ts, which the api and the worker install.
import type { ServerModule } from "@aihot/backend/modules";
import { translatePendingListNotes } from "./translate.ts";

export const listTranslate: ServerModule = {
  name: "list-translate",
  models: {
    listTranslate: {
      label: "热榜翻译（信源条目的中文说明）",
      env: "LIST_TRANSLATE_MODEL",
      purposes: ["list-translate"],
    },
  },
  schedules: [
    // Every ten minutes, so a fresh list is translated within minutes of being collected.
    { name: "list-translate", cron: "*/10 * * * *", run: translatePendingListNotes, missed: "skip" },
  ],
};
