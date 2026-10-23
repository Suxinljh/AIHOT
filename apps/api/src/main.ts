// Stored integrations are applied to the environment before anything reads the config.
import { applyStoredConfig } from "@aihot/backend/config/store";

await applyStoredConfig();

const [{ assertProductionSecrets, config }, { closeDb }, { installModules }, { SERVER_MODULES }, { DEPLOYMENT }, { feishuLoginConfigured }, { startHeartbeat }, { startWorkerWatchdog }, { buildApp }] = await Promise.all([
  import("@aihot/backend/config"),
  import("@aihot/backend/db"),
  import("@aihot/backend/modules"),
  import("@aihot/site/modules/server"),
  import("@aihot/site"),
  import("@aihot/backend/admin/auth"),
  import("@aihot/backend/operations/heartbeat"),
  import("@aihot/backend/operations/watch"),
  import("./app.ts"),
]);

installModules(SERVER_MODULES);
assertProductionSecrets([
  ["auth", "SESSION_SECRET"],
  ["auth", "IMG_PROXY_SIGN_SECRET"],
  ...DEPLOYMENT.requiredSecrets,
]);
// Somebody must be able to sign in to the admin.
if (config.environmentName === "production" && !(config.adminPassword && config.adminPassword.length >= 12) && !feishuLoginConfigured()) {
  throw new Error("Refusing to start in production: set ADMIN_PASSWORD (at least 12 characters) or configure Feishu sign-in");
}

const app = await buildApp();
await app.listen({ port: config.apiPort, host: process.env.API_HOST || "127.0.0.1" });
startHeartbeat(`api:${config.apiPort}`);
startWorkerWatchdog();

let stopping = false;
const shutdown = async () => {
  if (stopping) return;
  stopping = true;
  await app.close();
  await closeDb();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
