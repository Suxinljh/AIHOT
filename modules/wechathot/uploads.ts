// Draft images live on this deployment's disk (`.data/uploads`), one folder per month. The API keeps
// the path private behind the admin session; the 公众号 copy links the image the same way.
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "@aihot/backend/config";

const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };
const EXTENSIONS = new Set(Object.values(TYPES));
const MAX_BYTES = 5 * 1024 * 1024;
const FOLDER = /^\d{4}-\d{2}$/;
const NAME = /^[0-9a-f-]{36}\.(png|jpg|webp|gif)$/;

export class UploadRejected extends Error {
  readonly statusCode = 400;
  readonly code = "invalid_request";
}

export interface StoredUpload {
  url: string;
  bytes: number;
}

/** Saves one pasted or chosen image; the editor only needs the URL it can put in an <img>. */
export async function saveUpload(input: unknown): Promise<StoredUpload> {
  const body = (input ?? {}) as { contentType?: unknown; data?: unknown };
  const contentType = typeof body.contentType === "string" ? body.contentType : "";
  const ext = TYPES[contentType];
  if (!ext) throw new UploadRejected("只支持 PNG、JPEG、WebP 和 GIF 图片");
  const raw = typeof body.data === "string" ? body.data.replace(/^data:[^;]+;base64,/, "") : "";
  const buffer = Buffer.from(raw, "base64");
  if (!buffer.length) throw new UploadRejected("图片是空的");
  if (buffer.length > MAX_BYTES) throw new UploadRejected("图片不能超过 5MB");

  const now = new Date();
  const folder = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const name = `${randomUUID()}.${ext}`;
  const dir = path.join(config.dataDir, "uploads", folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buffer);
  return { url: `/api/studio/uploads/${folder}/${name}`, bytes: buffer.length };
}

/** Reads one upload back for the editor; anything outside the generated shape is not found. */
export async function readUpload(folder: string, name: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (!FOLDER.test(folder) || !NAME.test(name)) return null;
  const ext = name.split(".").pop() ?? "";
  if (!EXTENSIONS.has(ext)) return null;
  const contentType = Object.entries(TYPES).find(([, value]) => value === ext)?.[0] ?? "application/octet-stream";
  try {
    const buffer = await readFile(path.join(config.dataDir, "uploads", folder, name));
    return { buffer, contentType };
  } catch {
    return null;
  }
}
