// Repeatable first backfill of the workbench event read model. The default covers every live event;
// --recent uses the same 30-day window as the five-minute worker schedule.
import { closeDb } from "@aihot/backend/db";
import { projectEvents } from "../events.ts";

const recent = process.argv.includes("--recent");
try {
  const result = await projectEvents({ scope: recent ? "recent" : "all" });
  console.log(JSON.stringify(result, null, 2));
  if (result.failed || result.mergeError || result.heatError || (result.merged?.failures.length ?? 0) > 0) process.exitCode = 1;
} finally {
  await closeDb();
}
