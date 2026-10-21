// WeChatHot's web socket. The workbench has its own shell from WCH-3 onward; for now the module is
// registered so the page list and the web build load it from site/modules/web.ts.
import { defineWebModule } from "@aihot/web/modules";

export const wechatHotWeb = defineWebModule({
  name: "wechathot",
});
