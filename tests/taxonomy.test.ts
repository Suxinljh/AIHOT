// The industry pack's public taxonomy: exactly the seven categories the product agreed on, and the
// first batch of auto/game/film brands present as entities, aliases and identity patterns.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { CATEGORIES, ENTITIES, IDENTITY_LEXICON } from "@aihot/industry/taxonomy";

const WANTED = ["ai-models", "auto", "hardware", "software", "embodied", "film", "game"];

test("the public taxonomy exposes exactly the seven categories", () => {
  assert.deepEqual(CATEGORIES.map((category) => category.key), WANTED);
  assert.ok(CATEGORIES.every((category) => category.section && category.guide), "every category is described");
  const keys: readonly string[] = CATEGORIES.map((category) => category.key);
  assert.ok(!keys.includes("industry"), "company/people/policy news is a tag, not a category");
});

test("every brand in the first industry batch maps to an entity and its aliases", () => {
  const seed = JSON.parse(readFileSync(path.resolve(import.meta.dirname, "../docs/WeChatHot/industry-seed.json"), "utf8")) as {
    industries: Record<string, { brands: Array<{ name: string; aliases: string[] }> }>;
  };
  const known = new Set<string>();
  for (const entity of Object.values(ENTITIES)) {
    known.add(entity.name);
    for (const alias of entity.aliases) known.add(alias);
  }
  const missing: string[] = [];
  for (const [industry, group] of Object.entries(seed.industries)) {
    assert.ok(WANTED.includes(industry), `${industry} is a public category`);
    for (const brand of group.brands) {
      if (!known.has(brand.name) && !brand.aliases.some((alias) => known.has(alias))) missing.push(brand.name);
    }
  }
  assert.deepEqual(missing, [], "every seeded brand has an entity");
});

test("the identity dictionary covers the focus brands of the new industries", () => {
  const ids = new Set(IDENTITY_LEXICON.map((entry) => entry.id));
  for (const id of ["byd", "li-auto", "xpeng", "mihoyo", "netease-games", "nintendo", "playstation", "enlight-media", "iqiyi"]) {
    assert.ok(ids.has(id), `identity lexicon covers ${id}`);
  }
  const byd = IDENTITY_LEXICON.find((entry) => entry.id === "byd");
  assert.ok(byd?.patterns.some((pattern) => pattern.test("比亚迪发布新车型")));
  assert.ok(byd?.patterns.some((pattern) => pattern.test("BYD launches a new model")));
  assert.ok(!byd?.patterns.some((pattern) => pattern.test("无关的一段话")));
});

test("merged brands keep their new aliases and product lines", () => {
  assert.ok(ENTITIES.tesla?.aliases.includes("特斯拉汽车"));
  assert.ok(ENTITIES.tesla?.otherNames?.includes("Cybertruck"));
  assert.ok(ENTITIES.xiaomi?.otherNames?.includes("SU7"));
  assert.ok(ENTITIES.tencent?.otherNames?.includes("王者荣耀"));
  assert.ok(ENTITIES.disney?.aliases.includes("华特迪士尼"));
});

test("the new industries have topics and at least one verifiable demo source", () => {
  const topics = JSON.parse(readFileSync(path.resolve(import.meta.dirname, "../industry/topics.json"), "utf8")) as {
    topics: Array<{ slug: string; entityId?: string; group: string }>;
  };
  const byEntity = new Set(topics.topics.map((topic) => topic.entityId).filter(Boolean));
  for (const id of ["byd", "li-auto", "mihoyo", "netease-games", "playstation", "enlight-media", "iqiyi"]) {
    assert.ok(byEntity.has(id), `a company topic exists for ${id}`);
  }
  assert.ok(topics.topics.some((topic) => topic.group === "field" && topic.slug === "smart-driving"));
  assert.ok(topics.topics.some((topic) => topic.group === "genre" && topic.slug === "film-release"));

  const sources = JSON.parse(readFileSync(path.resolve(import.meta.dirname, "../industry/sources.json"), "utf8")) as {
    sources: Array<{ id: string; tags?: string[]; enabled?: boolean }>;
  };
  const enabled = sources.sources.filter((source) => source.enabled !== false);
  const has = (tags: string[]) => enabled.some((source) => source.tags?.some((tag) => tags.includes(tag)));
  assert.ok(has(["汽车", "自动驾驶"]), "汽车 has an enabled demo source");
  assert.ok(has(["游戏"]), "游戏 has an enabled demo source");
  assert.ok(has(["影视", "电影"]), "影视 has an enabled demo source");
  const candidates = sources.sources.filter((source) => source.tags?.includes("候选"));
  assert.ok(candidates.length > 0, "candidates are listed");
  assert.ok(candidates.every((source) => source.enabled === false), "candidates are not enabled by default");
});
