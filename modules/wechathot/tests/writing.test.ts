// The writing steps: the angles a topic can be written from, and the outline of the chosen angle.
// The steps run in the module's own queue, a failure keeps the earlier step's result, and the
// outline can be rewritten by hand.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { tag } from "../../../tests/setup.ts";
import { config } from "@aihot/backend/config";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { installModules } from "@aihot/backend/modules";
import { buildApp } from "../../../apps/api/src/app.ts";
import { wechatHotServer } from "../server.ts";
import { runWriteStep } from "../writing.ts";
import type { StudioTopic, TopicWriting } from "../studio-types.ts";

const T = tag();
const CSRF = "dev";
const originalDevAdmin = config.devAdmin;
let app: Awaited<ReturnType<typeof buildApp>>;
let topicId: number;

before(async () => {
  installModules([wechatHotServer]);
  config.devAdmin = { displayName: "WCH-18 writing test" };
  app = await buildApp();
  const [story] = await sql<{ id: number }[]>`
    INSERT INTO stories (public_id, title, summary, first_report_at, latest_at, created_at, updated_at)
    VALUES (${randomUUID()}, ${`${T} 可写选题`}, ${`${T} 摘要`}, now(), now(), now(), now())
    RETURNING id`;
  const [topic] = await sql<{ id: number }[]>`
    INSERT INTO wc_topics (story_id, angle, column_type, status, source_snapshot)
    VALUES (${story!.id}, null, 'news', 'ready', ${sql.json({
      title: `${T} 可写选题`,
      summary: `${T} 摘要`,
      categories: ["ai-models"],
      brands: ["openai"],
      score: 70,
      capturedAt: new Date().toISOString(),
      reports: [{ id: "a-1", title: `${T} 报道`, summary: null, source: "官网", url: "https://example.org/a1", tier: "T1", publishedAt: new Date().toISOString() }],
    } as never)})
    RETURNING id`;
  topicId = Number(topic!.id);
});

after(async () => {
  await app.close();
  await stopBoss();
  config.devAdmin = originalDevAdmin;
  await closeDb();
});

async function api(method: "GET" | "POST" | "PATCH", url: string, payload?: unknown) {
  return app.inject({
    method,
    url,
    ...(payload === undefined ? {} : { payload: payload as never }),
    headers: {
      ...(payload === undefined ? {} : { "content-type": "application/json" }),
      ...(method === "GET" ? {} : { "x-csrf-token": CSRF }),
    },
  });
}

async function writing(): Promise<TopicWriting> {
  const [row] = await sql<{ writing: TopicWriting }[]>`SELECT writing FROM wc_topics WHERE id = ${topicId}`;
  return row!.writing ?? {};
}

test("the angle step leaves several angles and the outline step needs one", async () => {
  const angles = await runWriteStep({ topicId, step: "angles" }, {
    angles: async () => [
      { title: "从价格变化看", reason: "价格是读者最关心的" },
      { title: "从开发者体验看", reason: "接口变更影响调用方" },
    ],
  });
  assert.equal(angles.ok, true);
  const afterAngles = await writing();
  assert.equal(afterAngles.angles?.length, 2);
  assert.equal(afterAngles.state?.step, "angles");
  assert.equal(afterAngles.state?.status, "done");

  const withoutAngle = await runWriteStep({ topicId, step: "outline" }, { outline: async () => ({ sections: [], note: "" }) });
  assert.equal(withoutAngle.ok, false);
  assert.match(withoutAngle.error ?? "", /角度/);
  const afterFailure = await writing();
  assert.equal(afterFailure.angles?.length, 2, "the earlier step's result is kept");
  assert.equal(afterFailure.state?.status, "failed");
});

test("the chosen angle leads to an outline that can be rewritten by hand", async () => {
  const picked = await api("PATCH", `/api/studio/topics/${topicId}`, { angle: "从价格变化看" });
  assert.equal(picked.statusCode, 200, picked.body);
  assert.equal((picked.json() as StudioTopic).angle, "从价格变化看");

  const outline = await runWriteStep({ topicId, step: "outline" }, {
    outline: async () => ({ sections: [{ title: "发生了什么", points: ["官方公布了新价格", "旧价格同时下线"] }], note: "别把旧价格写成现在的价格" }),
  });
  assert.equal(outline.ok, true);
  const state = await writing();
  assert.equal(state.outline?.sections.length, 1);
  assert.equal(state.outline?.note, "别把旧价格写成现在的价格");
  assert.equal(state.state?.status, "done");

  const edited = await api("PATCH", `/api/studio/topics/${topicId}`, {
    outline: { sections: [{ title: "价格怎么变的", points: ["新价格", "旧价格下线"] }], note: "" },
  });
  assert.equal(edited.statusCode, 200, edited.body);
  const after = (edited.json() as StudioTopic).writing?.outline;
  assert.equal(after?.sections[0]?.title, "价格怎么变的");
  assert.deepEqual(after?.sections[0]?.points, ["新价格", "旧价格下线"]);
  assert.equal(after?.note, "");
});

test("a failed model call keeps the earlier result and can be retried", async () => {
  await assert.rejects(
    runWriteStep({ topicId, step: "angles" }, { angles: async () => { throw new Error("model refused"); } }),
    /model refused/,
  );
  const after = await writing();
  assert.equal(after.state?.status, "failed");
  assert.match(after.state?.error ?? "", /model refused/);
  assert.ok(after.outline?.sections.length, "the outline from before is not lost");

  const retried = await runWriteStep({ topicId, step: "angles" }, { angles: async () => [{ title: "重试后的角度", reason: "换个角度" }] });
  assert.equal(retried.ok, true);
  const done = await writing();
  assert.equal(done.angles?.length, 1);
  assert.equal(done.state?.status, "done");
});

test("the writing endpoints put a step in the queue", async () => {
  const devAdmin = config.devAdmin;
  config.devAdmin = null;
  try {
    const guest = await app.inject({ method: "POST", url: `/api/studio/topics/${topicId}/angles` });
    assert.equal(guest.statusCode, 401);
  } finally {
    config.devAdmin = devAdmin;
  }

  const queued = await api("POST", `/api/studio/topics/${topicId}/angles`, {});
  assert.equal(queued.statusCode, 202, queued.body);
  const body = queued.json() as { jobId: string | null; step: string };
  assert.equal(body.step, "angles");
  const state = await writing();
  assert.equal(state.state?.status, "pending");
  assert.equal(state.state?.step, "angles");
});

test("an outline without an angle is refused", async () => {
  const [other] = await sql<{ id: number }[]>`
    INSERT INTO wc_topics (story_id, column_type, status) VALUES (1, 'news', 'ready') RETURNING id`;
  const response = await api("POST", `/api/studio/topics/${other!.id}/outline`, {});
  assert.equal(response.statusCode, 400);
  assert.match((response.json() as { detail: string }).detail, /角度/);
});
