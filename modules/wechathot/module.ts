// WeChatHot's addresses. The product's pages live under /studio; the redirect from / and the
// product shell arrive with WCH-3, so this module only claims the placeholder page for now.
import { defineModule } from "@aihot/contracts/modules";

export const wechatHot = defineModule({
  name: "wechathot",
  pages: [
    { path: "studio", file: "web/studio.tsx", id: "studio" },
  ],
});
