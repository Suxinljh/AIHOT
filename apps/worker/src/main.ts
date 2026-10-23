// Worker process: queues and schedules for collection, processing, events, reports and ops, and the site's
// modules (site/modules/server.ts). Stored integrations are applied before the config is read.
import { applyStoredConfig } from "@aihot/backend/config/store";

await applyStoredConfig();

const [{ assertProductionSecrets }, { closeDb }, { getBoss, stopBoss, workModuleQueues }, { installModules }, { SERVER_MODULES }, { registerContentJobs }, { registerSourceJobs }, { registerEventJobs }, { registerNotifyJobs }, { registerPublicationJobs }, { registerSchedules }, { ensureContentTargets }, { startHeartbeat }] = await Promise.all([
  import("@aihot/backend/config"),
  import("@aihot/backend/db"),
  import("@aihot/backend/jobs/queue"),
  import("@aihot/backend/modules"),
  import("@aihot/site/modules/server"),
  import("@aihot/backend/jobs/content"),
  import("@aihot/backend/jobs/sources"),
  import("@aihot/backend/jobs/events"),
  import("@aihot/backend/jobs/notify"),
  import("@aihot/backend/jobs/publication"),
  import("./schedules.ts"),
  import("@aihot/backend/notify/deliver"),
  import("@aihot/backend/operations/heartbeat"),
]);

installModules(SERVER_MODULES);
assertProductionSecrets([["auth", "IMG_PROXY_SIGN_SECRET"]]);

await ensureContentTargets();
const boss = await getBoss();
await registerContentJobs(boss);
if (process.env.COLLECT_ENABLED === "true") await registerSourceJobs(boss);
await registerEventJobs(boss);
await registerNotifyJobs(boss);
await registerPublicationJobs(boss);
await workModuleQueues(boss);
await registerSchedules(boss);
const heartbeat = startHeartbeat("worker");
console.log(JSON.stringify({ level: "info", msg: "worker started", pid: process.pid }));

let stopping = false;
const shutdown = async () => {
  if (stopping) return;
  stopping = true;
  const started = performance.now();
  console.log(JSON.stringify({ level: "info", msg: "worker stopping" }));
  clearInterval(heartbeat);
  await stopBoss();
  const closing = performance.now();
  await closeDb();
  console.log(JSON.stringify({ level: "info", msg: "worker stopped", elapsedMs: Math.round(performance.now() - started),
    databaseCloseMs: Math.round(performance.now() - closing) }));
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
