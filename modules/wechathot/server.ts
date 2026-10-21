// WeChatHot's backend socket. The api and worker install it from site/modules/server.ts; the empty
// module keeps the registration and the package boundary in place until the workbench routes arrive.
import { defineServerModule } from "@aihot/backend/modules";

export const wechatHotServer = defineServerModule({
  name: "wechathot",
});
