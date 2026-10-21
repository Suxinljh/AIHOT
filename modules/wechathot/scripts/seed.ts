// Re-runnable workbench seed for local and container setup.
import { closeDb } from "@aihot/backend/db";
import { seedWeChatHot } from "../seed.ts";

try {
  const result = await seedWeChatHot();
  console.log(
    `WeChatHot seed: brands +${result.brands}, channels +${result.channels}, links +${result.links}, presets +${result.presets}`,
  );
} finally {
  await closeDb();
}
