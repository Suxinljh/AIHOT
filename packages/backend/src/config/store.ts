// Integration settings edited from the studio. Non-secret values live in `settings`; secrets are
// AES-256-GCM encrypted in `config_secrets` with CONFIG_ENC_KEY (base64, 32 bytes). API and worker
// apply the stored values to the process environment at boot, so a change takes effect after a
// restart; a value the deployment sets in the environment always wins.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import postgres from "postgres";
import type { Db } from "../db.ts";

export const SECRET_KEYS = [
  "LLM_API_KEY",
  "FEISHU_APP_ID",
  "FEISHU_APP_SECRET",
  "FEISHU_ALERT_CHAT_ID",
  "SMTP_URL",
  "SMTP_FROM",
  "ALERT_EMAIL_TO",
] as const;

export const PLAIN_KEYS = ["LLM_BASE_URL", "LLM_MODEL", "COLLECT_ENABLED", "MODEL_CALLS_ENABLED", "FEISHU_INTERNAL_ENABLED"] as const;

export type SecretKey = (typeof SECRET_KEYS)[number];
export type PlainKey = (typeof PLAIN_KEYS)[number];

export interface StoredIntegrations {
  values: Record<string, string>;
  secrets: Record<string, { configured: boolean; last4: string | null; envFixed: boolean }>;
}

const SETTINGS_KEY = "integrations";
const envFixed = new Set<string>();

function db(): postgres.Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return postgres(url, { max: 1, onnotice: () => {} });
}

function encryptionKey(): Buffer | null {
  const raw = process.env.CONFIG_ENC_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  return key.length === 32 ? key : null;
}

function encrypt(value: string, key: Buffer): { ciphertext: string; nonce: string } {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return { ciphertext: Buffer.concat([ciphertext, cipher.getAuthTag()]).toString("base64"), nonce: nonce.toString("base64") };
}

function decrypt(ciphertext: string, nonce: string, key: Buffer): string {
  const payload = Buffer.from(ciphertext, "base64");
  const tag = payload.subarray(payload.length - 16);
  const body = payload.subarray(0, payload.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(nonce, "base64"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
}

function mask(value: string): string {
  return value.length <= 4 ? "****" : `****${value.slice(-4)}`;
}

/** Reads the stored settings and secrets; used by the settings page. Never returns plaintext. */
export async function readIntegrations(): Promise<StoredIntegrations> {
  const sql = db();
  try {
    const [row] = await sql<{ value: Record<string, string> }[]>`SELECT value FROM settings WHERE key = ${SETTINGS_KEY}`;
    const secrets = await sql<{ key: string; ciphertext: string; nonce: string }[]>`SELECT key, ciphertext, nonce FROM config_secrets`;
    const key = encryptionKey();
    const out: StoredIntegrations["secrets"] = {};
    for (const name of SECRET_KEYS) {
      const stored = secrets.find((secret) => secret.key === name);
      let plain: string | null = null;
      if (stored && key) {
        try { plain = decrypt(stored.ciphertext, stored.nonce, key); } catch { plain = null; }
      }
      out[name] = { configured: !!plain || !!process.env[name], last4: plain ? mask(plain) : null, envFixed: envFixed.has(name) };
    }
    const values: Record<string, string> = {};
    for (const name of PLAIN_KEYS) values[name] = (row?.value ?? {})[name] ?? process.env[name] ?? "";
    return { values, secrets: out };
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export interface IntegrationPatch {
  plain?: Partial<Record<PlainKey, string | boolean | null>>;
  secrets?: Partial<Record<SecretKey, string | null>>;
}

/** Writes settings and encrypted secrets; an empty secret value keeps the stored one. */
export async function saveIntegrations(patch: IntegrationPatch, actor: string): Promise<void> {
  const sql = db();
  try {
    const [row] = await sql<{ value: Record<string, string> }[]>`SELECT value FROM settings WHERE key = ${SETTINGS_KEY}`;
    const values = { ...(row?.value ?? {}) };
    for (const [name, value] of Object.entries(patch.plain ?? {})) {
      if (value === null || value === undefined) continue;
      values[name] = typeof value === "boolean" ? String(value) : value;
    }
    await sql`
      INSERT INTO settings (key, value, updated_at) VALUES (${SETTINGS_KEY}, ${sql.json(values as never)}, now())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;

    const key = encryptionKey();
    for (const [name, value] of Object.entries(patch.secrets ?? {})) {
      if (value === null) {
        await sql`DELETE FROM config_secrets WHERE key = ${name}`;
        continue;
      }
      if (value === undefined || value === "") continue;
      if (!key) throw new Error("CONFIG_ENC_KEY 未配置或不是 32 字节 base64，无法保存密钥");
      const encrypted = encrypt(value, key);
      await sql`
        INSERT INTO config_secrets (key, ciphertext, nonce, updated_at, updated_by)
        VALUES (${name}, ${encrypted.ciphertext}, ${encrypted.nonce}, now(), ${actor})
        ON CONFLICT (key) DO UPDATE SET ciphertext = EXCLUDED.ciphertext, nonce = EXCLUDED.nonce,
          updated_at = now(), updated_by = EXCLUDED.updated_by`;
    }
    // The audit table is written only by its owner; import it after the config has loaded.
    const { audit } = await import("../audit.ts");
    await audit(actor, "integrations.update", "settings:integrations", null, null,
      { plain: Object.keys(patch.plain ?? {}), secrets: Object.keys(patch.secrets ?? {}) }, { db: sql as unknown as Db });
  } finally {
    await sql.end({ timeout: 1 });
  }
}

/**
 * Applies stored values to the process environment before the app imports its config. A value the
 * deployment already set is left alone (and reported as fixed on the page). Missing tables or a
 * missing key are not fatal: the deployment's environment still works.
 */
export async function applyStoredConfig(): Promise<void> {
  for (const name of [...SECRET_KEYS, ...PLAIN_KEYS]) if (process.env[name]) envFixed.add(name);
  const sql = db();
  try {
    const [row] = await sql<{ value: Record<string, string> }[]>`SELECT value FROM settings WHERE key = ${SETTINGS_KEY}`;
    for (const [name, value] of Object.entries(row?.value ?? {})) {
      if (!process.env[name] && value) process.env[name] = value;
    }
    const key = encryptionKey();
    if (!key) return;
    const secrets = await sql<{ key: string; ciphertext: string; nonce: string }[]>`SELECT key, ciphertext, nonce FROM config_secrets`;
    for (const secret of secrets) {
      if (process.env[secret.key]) continue;
      try { process.env[secret.key] = decrypt(secret.ciphertext, secret.nonce, key); } catch { /* wrong key: keep env */ }
    }
  } catch {
    // No table yet (first boot before migrations) or no database: the environment is still usable.
  } finally {
    await sql.end({ timeout: 1 });
  }
}
