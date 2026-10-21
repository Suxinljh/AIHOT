// WeChatHot's backend socket. The api and worker install it from site/modules/server.ts. The studio's
// private API starts here: the same admin session as /admin, never a second account system.
import type { AdminMe } from "@aihot/contracts/admin";
import { sessionPrincipal } from "@aihot/backend/admin/auth";
import { defineServerModule } from "@aihot/backend/modules";
import { projectRecentEvents } from "./events.ts";

export const wechatHotServer = defineServerModule({
  name: "wechathot",
  schedules: [
    // The workbench reads its event list from wc_event_meta; a failed event stays out of date until
    // the next run without affecting collection or the public publication pipeline.
    { name: "wechathot.events.project", cron: "*/5 * * * *", run: projectRecentEvents, missed: "skip" },
  ],
  http(app) {
    // The shell reads who is signed in here. A visitor without a live session gets 401, and the web
    // layout turns that into the sign-in page with /studio as its return path.
    app.get("/api/studio/me", async (req, reply) => {
      reply.header("Cache-Control", "no-store").header("X-Robots-Tag", "noindex, nofollow");
      const admin = await sessionPrincipal(req.headers.cookie);
      if (!admin) return reply.code(401).send({ detail: "Sign in to the studio first." });
      const me: AdminMe = { name: admin.name, csrf: admin.csrf, dev: admin.dev };
      return reply.send(me);
    });
  },
});
