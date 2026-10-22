// Seeds the workbench's code-owned first batch: brands, their candidate channels and the built-in
// writing/format presets. The seed is re-runnable and never overwrites rows an admin has edited.
import { readFileSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "@aihot/backend/config";
import { sql } from "@aihot/backend/db";
import { ENTITIES, PUBLISHER_DOMAINS } from "@aihot/industry/taxonomy";
import { BRAND_SEEDS, FORMAT_PRESETS, WRITING_PRESETS, type ChannelSeed } from "./seed-data.ts";

interface TopicFile {
  topics: Array<{ group: string; entityId?: string; definition?: string }>;
}

const topics = JSON.parse(readFileSync(path.join(REPO_ROOT, "industry/topics.json"), "utf8")) as TopicFile;
const TOPIC_DEFINITIONS = new Map(
  topics.topics
    .filter((topic) => topic.group === "company" && topic.entityId && topic.definition)
    .map((topic) => [topic.entityId!, topic.definition!] as const),
);

export interface SeedResult {
  brands: number;
  channels: number;
  links: number;
  presets: number;
}

function fallbackWebsite(entityId: string): string | null {
  const publisher = PUBLISHER_DOMAINS.find((entry) => entry.entityId === entityId);
  return publisher?.domains[0] ? `https://${publisher.domains[0]}/` : null;
}

function platformFor(channel: ChannelSeed): string {
  if (channel.type === "official_site") return "官网";
  if (channel.type === "x") return "X";
  if (channel.type === "github") return "GitHub";
  return "微信公众号";
}

export async function seedWeChatHot(): Promise<SeedResult> {
  const result: SeedResult = { brands: 0, channels: 0, links: 0, presets: 0 };

  for (const [entityId, entity] of Object.entries(ENTITIES)) {
    const seed = BRAND_SEEDS[entityId];
    const aliases = [...new Set([...entity.aliases, ...(entity.otherNames ?? [])].filter((alias) => alias && alias !== entity.name))];
    const [insertedBrand] = await sql<{ id: string }[]>`
      INSERT INTO wc_brands (id, entity_id, name, aliases, website, industries, verified_status, notes)
      VALUES (${entityId}, ${entityId}, ${entity.name}, ${aliases}::text[], ${seed?.website ?? fallbackWebsite(entityId)},
              ${seed?.industries ?? []}::text[], 'verified', ${TOPIC_DEFINITIONS.get(entityId) ?? null})
      ON CONFLICT DO NOTHING
      RETURNING id`;
    if (insertedBrand) result.brands += 1;

    let brandId = insertedBrand?.id;
    if (!brandId) {
      const [existing] = await sql<{ id: string }[]>`
        SELECT id FROM wc_brands
        WHERE entity_id = ${entityId} OR id = ${entityId}
        ORDER BY (entity_id = ${entityId}) DESC
        LIMIT 1`;
      brandId = existing?.id;
    }
    if (!brandId) continue;

    // Brands inserted before their industry data existed get it filled in; an admin's own website
    // or industry list is never overwritten.
    if (seed) {
      await sql`
        UPDATE wc_brands SET
          website = coalesce(nullif(btrim(website), ''), ${seed.website ?? ""}),
          industries = CASE WHEN cardinality(industries) = 0 THEN ${seed.industries}::text[] ELSE industries END,
          updated_at = now()
        WHERE id = ${brandId}
          AND (website IS NULL OR btrim(website) = '' OR cardinality(industries) = 0)`;
    }

    for (const channel of seed?.channels ?? []) {
      const channelId = `${brandId}-${channel.type}`;
      const [insertedChannel] = await sql<{ id: string }[]>`
        INSERT INTO wc_channels (id, type, platform, display_name, url, provider, verification, availability, note)
        VALUES (${channelId}, ${channel.type}, ${platformFor(channel)}, ${channel.displayName}, ${channel.url},
                ${channel.provider ?? null}, ${channel.verification}, ${channel.availability ?? "unknown"}, ${channel.note ?? null})
        ON CONFLICT DO NOTHING
        RETURNING id`;
      if (insertedChannel) result.channels += 1;

      let channelRowId = insertedChannel?.id;
      if (!channelRowId) {
        const [existing] = await sql<{ id: string }[]>`
          SELECT id FROM wc_channels
          WHERE url = ${channel.url} OR id = ${channelId}
          ORDER BY (id = ${channelId}) DESC
          LIMIT 1`;
        channelRowId = existing?.id;
      }
      if (!channelRowId) continue;

      const [insertedLink] = await sql<{ channel_id: string }[]>`
        INSERT INTO wc_channel_brands (channel_id, brand_id)
        VALUES (${channelRowId}, ${brandId})
        ON CONFLICT DO NOTHING
        RETURNING channel_id`;
      if (insertedLink) result.links += 1;
    }
  }

  for (const preset of [...WRITING_PRESETS, ...FORMAT_PRESETS]) {
    const [inserted] = await sql<{ id: string }[]>`
      INSERT INTO wc_style_presets
        (id, kind, name, column_type, target_reader, word_count, tone, title_preference, forbidden_expressions, format, builtin)
      VALUES (${preset.id}, ${preset.kind}, ${preset.name}, ${preset.columnType}, ${preset.targetReader}, ${preset.wordCount},
              ${preset.tone}, ${preset.titlePreference}, ${preset.forbiddenExpressions}::text[],
              ${sql.json(preset.format as never)}, ${preset.builtin})
      ON CONFLICT DO NOTHING
      RETURNING id`;
    if (inserted) result.presets += 1;
  }

  return result;
}
