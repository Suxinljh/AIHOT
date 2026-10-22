// WeChatHot's addresses. The product's pages live under /studio; its own pathless layout draws the
// workbench shell, so every page below shares the same private chrome.
import { defineModule } from "@aihot/contracts/modules";

export const wechatHot = defineModule({
  name: "wechathot",
  redirects: [
    { match: "exact", path: "/", status: 302, location: "/studio", keepQuery: true, why: "WeChatHot entry" },
  ],
  pages: [
    {
      layout: "web/studio-layout.tsx",
      id: "studio-layout",
      pages: [
        { path: "studio", file: "web/studio.tsx", id: "studio" },
        { path: "studio/events/:publicId", file: "web/studio-event.tsx", id: "studio-event" },
        { path: "studio/alerts", file: "web/studio-alerts.tsx", id: "studio-alerts" },
        { path: "studio/topics", file: "web/studio-topics.tsx", id: "studio-topics" },
        { path: "studio/topics/:id", file: "web/studio-topic.tsx", id: "studio-topic" },
        { path: "studio/articles", file: "web/studio-articles.tsx", id: "studio-articles" },
        { path: "studio/calendar", file: "web/studio-calendar.tsx", id: "studio-calendar" },
        { path: "studio/articles/:id", file: "web/studio-article.tsx", id: "studio-article" },
        { path: "studio/sources", file: "web/studio-sources.tsx", id: "studio-sources" },
        { path: "studio/sources/new", file: "web/studio-source-new.tsx", id: "studio-source-new" },
        { path: "studio/sources/:id", file: "web/studio-source.tsx", id: "studio-source" },
        { path: "studio/brands", file: "web/studio-brands.tsx", id: "studio-brands" },
        { path: "studio/brands/:id", file: "web/studio-brand.tsx", id: "studio-brand" },
        { path: "studio/settings", file: "web/studio-settings.tsx", id: "studio-settings" },
        { path: "studio/metrics", file: "web/studio-metrics.tsx", id: "studio-metrics" },
      ],
    },
  ],
});
