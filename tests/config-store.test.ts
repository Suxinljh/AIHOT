// Integration settings: secrets are encrypted at rest, never read back in plaintext, and applied to the
// environment at boot unless the deployment already set that variable.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, test } from "node:test";
import { closeDb, sql } from "@aihot/backend/db";
import { applyStoredConfig, readIntegrations, saveIntegrations } from "@aihot/backend/config/store";

const KEY = randomBytes(32).toString("base64");
const saved: Record<string, string | undefined> = {};

before(async () => {
  saved.CONFIG_ENC_KEY = process.env.CONFIG_ENC_KEY;
  saved.LLM_API_KEY = process.env.LLM_API_KEY;
  saved.LLM_MODEL = process.env.LLM_MODEL;
  process.env.CONFIG_ENC_KEY = KEY;
  delete process.env.LLM_API_KEY;
  delete process.env.LLM_MODEL;
  await sql`DELETE FROM config_secrets`;
  await sql`DELETE FROM settings WHERE key = 'integrations'`;
});

after(async () => {
  await sql`DELETE FROM config_secrets`;
  await sql`DELETE FROM settings WHERE key = 'integrations'`;
  for (const [name, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  await closeDb();
});

test("secrets are encrypted at rest and only their tail is shown", async () => {
  await saveIntegrations({
    plain: { LLM_MODEL: "deepseek-flash", COLLECT_ENABLED: true },
    secrets: { LLM_API_KEY: "sk-test-secret-1234" },
  }, "test:actor");
  const [row] = await sql<{ ciphertext: string }[]>`SELECT ciphertext FROM config_secrets WHERE key = 'LLM_API_KEY'`;
  assert.ok(row);
  assert.ok(!row!.ciphertext.includes("sk-test-secret"), "the stored value is not plaintext");
  const read = await readIntegrations();
  assert.equal(read.values.LLM_MODEL, "deepseek-flash");
  assert.equal(read.values.COLLECT_ENABLED, "true");
  assert.equal(read.secrets.LLM_API_KEY.configured, true);
  assert.equal(read.secrets.LLM_API_KEY.last4, "****1234");
  assert.ok(!JSON.stringify(read).includes("sk-test-secret"), "the page never receives the secret");
});

test("stored values are applied at boot, and the deployment environment wins", async () => {
  await applyStoredConfig();
  assert.equal(process.env.LLM_MODEL, "deepseek-flash");
  assert.equal(process.env.LLM_API_KEY, "sk-test-secret-1234");
  assert.equal(process.env.COLLECT_ENABLED, "true");

  process.env.LLM_MODEL = "env-model";
  await applyStoredConfig();
  assert.equal(process.env.LLM_MODEL, "env-model", "an environment value is not overwritten");
  delete process.env.LLM_MODEL;
});

test("an empty secret keeps the stored one; clearing removes it", async () => {
  await saveIntegrations({ secrets: { LLM_API_KEY: "" } }, "test:actor");
  assert.equal((await readIntegrations()).secrets.LLM_API_KEY.configured, true);
  await saveIntegrations({ secrets: { LLM_API_KEY: null } }, "test:actor");
  delete process.env.LLM_API_KEY;
  assert.equal((await readIntegrations()).secrets.LLM_API_KEY.configured, false);
});
