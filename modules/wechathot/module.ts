// WeChatHot's addresses. The workbench owns the root routes; its own pathless layout draws the shell,
// so every page below shares the same private chrome. `/studio/*` still redirects for old bookmarks.
import { defineModule } from "@aihot/contracts/modules";

export const wechatHot = defineModule({
  name: "wechathot",
  pages: [
    {
      layout: "web/studio-layout.tsx",
      id: "studio-layout",
      pages: [
        { index: true, path: "", file: "web/studio.tsx", id: "studio" },
        { path: "events/:publicId", file: "web/studio-event.tsx", id: "studio-event" },
        { path: "alerts", file: "web/studio-alerts.tsx", id: "studio-alerts" },
        { path: "topics", file: "web/studio-topics.tsx", id: "studio-topics" },
        { path: "topics/:id", file: "web/studio-topic.tsx", id: "studio-topic" },
        { path: "articles", file: "web/studio-articles.tsx", id: "studio-articles" },
        { path: "calendar", file: "web/studio-calendar.tsx", id: "studio-calendar" },
        { path: "articles/:id", file: "web/studio-article.tsx", id: "studio-article" },
        { path: "sources", file: "web/studio-sources.tsx", id: "studio-sources" },
        { path: "sources/new", file: "web/studio-source-new.tsx", id: "studio-source-new" },
        { path: "sources/:id", file: "web/studio-source.tsx", id: "studio-source" },
        { path: "brands", file: "web/studio-brands.tsx", id: "studio-brands" },
        { path: "brands/:id", file: "web/studio-brand.tsx", id: "studio-brand" },
        { path: "settings", file: "web/studio-settings.tsx", id: "studio-settings" },
      ],
    },
    // Old /studio addresses land on their root equivalents.
    { path: "studio", file: "web/legacy-studio.tsx", id: "legacy-studio" },
    { path: "studio/*", file: "web/legacy-studio.tsx", id: "legacy-studio-splat" },
  ],
});
