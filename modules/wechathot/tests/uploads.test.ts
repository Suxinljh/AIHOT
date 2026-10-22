// Draft images: one upload lands on the scratch data directory under a generated name, and only that
// shape can be read back; anything else — wrong type, empty payload, traversal — is refused.
import assert from "node:assert/strict";
import { test } from "node:test";
import { readUpload, saveUpload, UploadRejected } from "../uploads.ts";

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

test("an uploaded image is stored under the data directory and reads back byte for byte", async () => {
  const saved = await saveUpload({ contentType: "image/png", data: `data:image/png;base64,${PNG}` });
  assert.match(saved.url, /^\/api\/studio\/uploads\/\d{4}-\d{2}\/[0-9a-f-]{36}\.png$/);
  const [, folder, name] = saved.url.split("/").slice(3);
  const read = await readUpload(folder!, name!);
  assert.ok(read);
  assert.equal(read!.contentType, "image/png");
  assert.equal(read!.buffer.toString("base64"), PNG);
});

test("a non-image, an empty payload and an oversized image are refused", async () => {
  await assert.rejects(() => saveUpload({ contentType: "text/plain", data: "aGVsbG8=" }), UploadRejected);
  await assert.rejects(() => saveUpload({ contentType: "image/png", data: "" }), UploadRejected);
  const huge = Buffer.alloc(5 * 1024 * 1024 + 1, 1).toString("base64");
  await assert.rejects(() => saveUpload({ contentType: "image/png", data: huge }), /5MB|超过/);
});

test("only generated names are read; traversal and foreign folders are not found", async () => {
  assert.equal(await readUpload("../etc", "passwd"), null);
  assert.equal(await readUpload("2026-05", "../../etc/passwd"), null);
  assert.equal(await readUpload("2026-05", "not-a-uuid.png"), null);
  assert.equal(await readUpload("2026-05", "00000000-0000-0000-0000-000000000000.png"), null);
});
