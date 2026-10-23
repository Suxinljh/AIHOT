// Saving integration settings: the page only sends the fields the editor filled, so an omitted secret
// must keep its stored value instead of failing validation. Unknown keys are still rejected.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { tag } from "../../../tests/setup.ts";
import { config } from "@aihot/backend/config";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { installModules } from "@aihot/backend/modules";
import { buildApp } from "../../../apps/api/src/app.ts";
import { wechatHotServer } from "../server.ts";

const T = tag();
const CSRF = "dev";
const originalDevAdmin = config.devAdmin;
let app: Awaited<ReturnType<typeof buildApp>>;

before(async () => {
  process.env.CONFIG_ENC_KEY = Buffer.alloc(32, 7).toString("base64");
  installModules([wechatHotServer]);
  config.devAdmin = { displayName: `WCH integrations ${T}` };
  app = await buildApp();
});

after(async () => {
  await app.close();
  await stopBoss();
  config.devAdmin = originalDevAdmin;
  await sql`DELETE FROM config_secrets WHERE key IN ('FEISHU_APP_ID', 'FEISHU_APP_SECRET')`;
  await sql`DELETE FROM settings WHERE key = 'integrations'`;
  await closeDb();
});

test("a patch with only the filled secrets is accepted", async () => {
  const response = await app.inject({
    method: "PATCH",
    url: "/api/studio/integrations",
    headers: { "x-csrf-token": CSRF },
    payload: { secrets: { FEISHU_APP_ID: "cli_test_12345" } },
  });
  assert.equal(response.statusCode, 200);
  const body = response.json() as { secrets: Record<string, { configured: boolean; last4: string | null }> };
  assert.equal(body.secrets.FEISHU_APP_ID.configured, true);
  assert.equal(body.secrets.FEISHU_APP_ID.last4, "****2345");
  assert.equal(body.secrets.FEISHU_APP_SECRET.configured, false);
});

test("a later patch does not overwrite the secret it omitted", async () => {
  const response = await app.inject({
    method: "PATCH",
    url: "/api/studio/integrations",
    headers: { "x-csrf-token": CSRF },
    payload: { plain: { FEISHU_INTERNAL_ENABLED: true }, secrets: {} },
  });
  assert.equal(response.statusCode, 200);
  const body = response.json() as { values: Record<string, string>; secrets: Record<string, { last4: string | null }> };
  assert.equal(body.values.FEISHU_INTERNAL_ENABLED, "true");
  assert.equal(body.secrets.FEISHU_APP_ID.last4, "****2345");
});

test("an unknown secret key is rejected", async () => {
  const response = await app.inject({
    method: "PATCH",
    url: "/api/studio/integrations",
    headers: { "x-csrf-token": CSRF },
    payload: { secrets: { NOT_A_KEY: "x" } },
  });
  assert.equal(response.statusCode, 400);
});
