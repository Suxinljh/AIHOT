// The backend of the site's modules, installed by the api and the worker when they start (site/modules/index.ts).
import type { ServerModule } from "@aihot/backend/modules";
import { listTranslate } from "@aihot/list-translate";
import { wechatHotServer } from "@aihot/wechathot";

export const SERVER_MODULES: readonly ServerModule[] = [listTranslate, wechatHotServer];
