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
        { path: "studio/topics", file: "web/studio-topics.tsx", id: "studio-topics" },
        { path: "studio/articles", file: "web/studio-articles.tsx", id: "studio-articles" },
        { path: "studio/sources", file: "web/studio-sources.tsx", id: "studio-sources" },
        { path: "studio/settings", file: "web/studio-settings.tsx", id: "studio-settings" },
      ],
    },
  ],
});
