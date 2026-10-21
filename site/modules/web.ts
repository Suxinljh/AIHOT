// What the site's modules add to the web pages (site/modules/index.ts).
import type { WebModule } from "@aihot/web/modules";
import { wechatHotWeb } from "@aihot/wechathot/web";

export const WEB_MODULES: readonly WebModule[] = [wechatHotWeb];
