// The first workbench seed: one row per code-owned ENTITIES entry, with the official news/blog page
// from docs/WeChatHot/brand-channels.md plus the social and WeChat candidates that were checked there.
// Names, aliases and notes still come from ENTITIES and industry/topics.json; this file only adds the
// fields the industry pack does not carry. Unconfirmed X, GitHub and WeChat candidates stay pending.

import type { ArticleFormat } from "./studio-types.ts";

export type ChannelType = "official_site" | "x" | "wechat" | "github";
export type ChannelProvider = "dajiala" | "socialdata" | "rsshub" | "github" | "rss";
export type ChannelVerification = "verified" | "user" | "pending" | "unavailable";
export type ChannelAvailability = "available" | "unavailable" | "unknown";

export interface ChannelSeed {
  type: ChannelType;
  displayName: string;
  url: string;
  provider?: ChannelProvider;
  verification: ChannelVerification;
  availability?: ChannelAvailability;
  note?: string;
}

export interface BrandSeed {
  website?: string;
  industries: string[];
  channels: ChannelSeed[];
}

export interface WritingPresetSeed {
  id: string;
  kind: "writing";
  name: string;
  columnType: "news" | "insight";
  targetReader: string;
  wordCount: number;
  tone: string;
  titlePreference: string;
  forbiddenExpressions: string[];
  format: Record<string, never>;
  builtin: true;
}

export interface FormatPresetSeed {
  id: string;
  kind: "format";
  name: string;
  columnType: null;
  targetReader: null;
  wordCount: null;
  tone: null;
  titlePreference: null;
  forbiddenExpressions: string[];
  format: ArticleFormat;
  builtin: true;
}

const site = (displayName: string, url: string): ChannelSeed => ({
  type: "official_site",
  displayName,
  url,
  verification: "verified",
  availability: "unknown",
  note: "官网新闻或博客入口。",
});

const x = (displayName: string, handle: string, note?: string): ChannelSeed => ({
  type: "x",
  displayName,
  url: `https://x.com/${handle}`,
  provider: "socialdata",
  verification: "verified",
  availability: "unknown",
  note,
});

const github = (displayName: string, org: string, verification: ChannelVerification = "verified", note?: string): ChannelSeed => ({
  type: "github",
  displayName,
  url: `https://github.com/${org}`,
  provider: "github",
  verification,
  availability: "unknown",
  note,
});

const wechat = (displayName: string): ChannelSeed => ({
  type: "wechat",
  displayName,
  // The display name is not a stable account id. This search page is only a candidate locator; the
  // channel stays pending until Dajiala confirms the authenticated subject and mp_id.
  url: `https://weixin.sogou.com/weixin?type=1&query=${encodeURIComponent(displayName)}`,
  provider: "dajiala",
  verification: "pending",
  availability: "unknown",
  note: "候选公众号：目前只有显示名，待用极致了确认认证主体与 mp_id。",
});

const PENDING_GITHUB = "候选 GitHub 组织，尚未用 GitHub API 确认 Organization 身份。";

export const BRAND_SEEDS: Record<string, BrandSeed> = {
  openai: {
    website: "https://openai.com/",
    industries: ["ai-models", "software"],
    channels: [site("OpenAI News", "https://openai.com/news/"), x("OpenAI", "OpenAI"), github("OpenAI", "openai")],
  },
  anthropic: {
    website: "https://www.anthropic.com/",
    industries: ["ai-models"],
    channels: [site("Anthropic News", "https://www.anthropic.com/news"), x("Anthropic", "AnthropicAI"), github("Anthropic", "anthropics")],
  },
  google: {
    website: "https://blog.google/",
    industries: ["ai-models", "software", "hardware"],
    channels: [site("Google Gemini Blog", "https://blog.google/products/gemini/"), x("Gemini", "GeminiApp"), github("Google", "google")],
  },
  meta: {
    website: "https://ai.meta.com/",
    industries: ["ai-models", "software", "hardware"],
    channels: [site("AI at Meta Blog", "https://ai.meta.com/blog/"), x("Meta AI", "MetaAI"), github("Meta Llama", "meta-llama")],
  },
  microsoft: {
    website: "https://www.microsoft.com/",
    industries: ["software", "ai-models"],
    channels: [
      site("Microsoft Blog", "https://blogs.microsoft.com/"),
      x("Microsoft", "Microsoft"),
      github("Microsoft", "microsoft", "pending", PENDING_GITHUB),
    ],
  },
  apple: {
    website: "https://www.apple.com/",
    industries: ["hardware", "software"],
    channels: [site("Apple Newsroom", "https://www.apple.com.cn/newsroom/"), x("Apple", "Apple"), github("Apple", "Apple")],
  },
  nvidia: {
    website: "https://www.nvidia.com/",
    industries: ["hardware", "ai-models"],
    channels: [
      site("NVIDIA Blog", "https://blogs.nvidia.com/"),
      x("NVIDIA", "nvidia"),
      github("NVIDIA", "nvidia", "pending", PENDING_GITHUB),
      wechat("英伟达"),
    ],
  },
  amd: {
    website: "https://www.amd.com/",
    industries: ["hardware"],
    channels: [
      site("AMD Newsroom", "https://newsroom.amd.com/"),
      x("AMD", "AMD"),
      github("AMD", "amd", "pending", PENDING_GITHUB),
      wechat("AMD"),
    ],
  },
  intel: {
    website: "https://www.intel.com/",
    industries: ["hardware"],
    channels: [
      site("Intel Newsroom", "https://newsroom.intel.com/"),
      x("Intel", "Intel"),
      github("Intel", "intel", "pending", PENDING_GITHUB),
      wechat("英特尔"),
    ],
  },
  qualcomm: {
    website: "https://www.qualcomm.com/",
    industries: ["hardware"],
    channels: [
      site("Qualcomm News", "https://www.qualcomm.com/news/releases"),
      x("Qualcomm", "Qualcomm"),
      github("Qualcomm", "qualcomm", "pending", PENDING_GITHUB),
      wechat("高通"),
    ],
  },
  huawei: {
    website: "https://www.huawei.com/",
    industries: ["hardware", "software"],
    channels: [site("华为新闻", "https://www.huawei.com/cn/news"), x("Huawei", "Huawei"), github("Huawei", "Huawei"), wechat("华为")],
  },
  xiaomi: {
    website: "https://www.mi.com/",
    industries: ["hardware", "embodied"],
    channels: [site("小米发现", "https://www.mi.com/global/discover/"), x("Xiaomi", "Xiaomi"), github("Xiaomi", "Xiaomi"), wechat("小米公司")],
  },
  samsung: {
    website: "https://www.samsung.com/",
    industries: ["hardware"],
    channels: [site("Samsung Newsroom", "https://news.samsung.com/global/"), x("Samsung", "Samsung"), github("Samsung", "Samsung"), wechat("中国三星")],
  },
  sony: {
    website: "https://www.sony.com/",
    industries: ["hardware", "film"],
    channels: [
      site("Sony", "https://www.sony.com/"),
      x("Sony", "Sony"),
      github("Sony", "sony", "pending", PENDING_GITHUB),
      wechat("索尼"),
    ],
  },
  deepseek: {
    website: "https://www.deepseek.com/",
    industries: ["ai-models"],
    channels: [site("DeepSeek", "https://www.deepseek.com/"), x("DeepSeek", "deepseek_ai"), github("DeepSeek", "deepseek-ai"), wechat("DeepSeek 深度求索")],
  },
  qwen: {
    website: "https://qwen.ai/",
    industries: ["ai-models"],
    channels: [
      site("千问", "https://www.qianwen.com/"),
      x("Alibaba Group", "AlibabaGroup", "集团号；千问产品号待确认。"),
      github("Qwen", "QwenLM"),
      wechat("通义千问"),
    ],
  },
  bytedance: {
    website: "https://www.bytedance.com/",
    industries: ["ai-models", "software"],
    channels: [
      site("豆包", "https://www.doubao.com/"),
      x("ByteDance", "BytedanceTalk", "企业号；豆包产品号待确认。"),
      github("ByteDance", "ByteDance"),
      wechat("豆包"),
    ],
  },
  tencent: {
    website: "https://www.tencent.com/",
    industries: ["ai-models", "software", "film"],
    channels: [site("腾讯元宝", "https://yuanbao.tencent.com/"), x("Tencent", "TencentGlobal"), github("Tencent", "Tencent"), wechat("腾讯元宝")],
  },
  kimi: {
    website: "https://www.kimi.com/",
    industries: ["ai-models"],
    channels: [site("Kimi", "https://www.kimi.com/"), x("Kimi", "Kimi_Moonshot"), github("Moonshot AI", "MoonshotAI"), wechat("Kimi 智能助手")],
  },
  zhipu: {
    website: "https://z.ai/",
    industries: ["ai-models"],
    channels: [site("智谱清言", "https://chatglm.cn/"), x("Zhipu AI", "ZhipuAI"), github("Z.ai", "zai-org"), wechat("BigModel 智谱 AI")],
  },
  minimax: {
    website: "https://www.minimaxi.com/",
    industries: ["ai-models"],
    channels: [site("MiniMax", "https://www.minimaxi.com/"), x("MiniMax", "MiniMax_AI"), github("MiniMax", "MiniMax-AI"), wechat("MiniMax")],
  },
  xai: {
    website: "https://x.ai/",
    industries: ["ai-models"],
    channels: [site("xAI News", "https://x.ai/news"), x("SpaceXSI", "SpaceXSI", "2026-10 公司改名，原 @xAI。"), github("xAI", "xai-org")],
  },
  mistral: {
    website: "https://mistral.ai/",
    industries: ["ai-models"],
    channels: [site("Mistral News", "https://mistral.ai/news/"), x("Mistral", "MistralAI"), github("Mistral", "mistralai")],
  },
  "hugging-face": {
    website: "https://huggingface.co/",
    industries: ["ai-models", "software"],
    channels: [site("Hugging Face Blog", "https://huggingface.co/blog")],
  },
  github: {
    website: "https://github.com/",
    industries: ["software"],
    channels: [site("GitHub Blog", "https://github.blog/"), github("GitHub", "github")],
  },
  cursor: {
    website: "https://cursor.com/",
    industries: ["software", "ai-models"],
    channels: [site("Cursor Blog", "https://cursor.com/blog")],
  },
  figma: {
    website: "https://www.figma.com/",
    industries: ["software"],
    channels: [site("Figma Blog", "https://www.figma.com/blog/")],
  },
  adobe: {
    website: "https://www.adobe.com/",
    industries: ["software", "film"],
    channels: [site("Adobe Blog", "https://blog.adobe.com/")],
  },
  tesla: {
    website: "https://www.tesla.com/",
    industries: ["embodied"],
    channels: [
      site("Tesla Blog", "https://www.tesla.com/blog"),
      x("Tesla", "Tesla"),
      github("Tesla", "tesla", "pending", "候选 GitHub 组织，需登录后确认；不要把同名个人号当官方。"),
      wechat("Tesla 特斯拉"),
    ],
  },
  unitree: {
    website: "https://www.unitree.com/",
    industries: ["embodied"],
    channels: [site("宇树科技", "https://www.unitree.com/")],
  },
  figure: {
    website: "https://www.figure.ai/",
    industries: ["embodied"],
    channels: [site("Figure News", "https://www.figure.ai/news")],
  },
  "boston-dynamics": {
    website: "https://bostondynamics.com/",
    industries: ["embodied"],
    channels: [site("Boston Dynamics Blog", "https://bostondynamics.com/blog/")],
  },
  waymo: {
    website: "https://waymo.com/",
    industries: ["embodied"],
    channels: [site("Waymo Blog", "https://waymo.com/blog/")],
  },
  dji: {
    website: "https://www.dji.com/",
    industries: ["embodied", "hardware"],
    channels: [site("DJI Newsroom", "https://www.dji.com/newsroom")],
  },
  disney: {
    website: "https://www.disney.com/",
    industries: ["film"],
    channels: [site("Disney", "https://www.disney.com/"), x("Disney", "Disney"), wechat("迪士尼")],
  },
  netflix: {
    website: "https://www.netflix.com/",
    industries: ["film"],
    channels: [
      site("Netflix", "https://www.netflix.com/"),
      x("Netflix", "netflix"),
      github("Netflix", "netflix", "pending", PENDING_GITHUB),
      wechat("Netflix"),
    ],
  },
  "warner-bros": {
    website: "https://www.warnerbros.com/",
    industries: ["film"],
    channels: [site("Warner Bros.", "https://www.warnerbros.com/"), x("Warner Bros.", "warnerbros"), wechat("华纳兄弟")],
  },
  a24: {
    website: "https://a24films.com/",
    industries: ["film"],
    channels: [site("A24", "https://a24films.com/"), x("A24", "A24"), wechat("A24")],
  },
  runway: {
    website: "https://runwayml.com/",
    industries: ["film", "ai-models"],
    channels: [site("Runway News", "https://runwayml.com/news")],
  },
  // 汽车（WCH-35/36 首批）
  "byd": {
    website: "https://byd.com/",
    industries: ["auto"],
    channels: [site("比亚迪 官网", "https://byd.com/")],
  },
  "li-auto": {
    website: "https://lixiang.com/",
    industries: ["auto"],
    channels: [site("理想汽车 官网", "https://lixiang.com/")],
  },
  "xpeng": {
    website: "https://xiaopeng.com/",
    industries: ["auto"],
    channels: [site("小鹏汽车 官网", "https://xiaopeng.com/")],
  },
  "nio": {
    website: "https://nio.com/",
    industries: ["auto"],
    channels: [site("蔚来 官网", "https://nio.com/")],
  },
  "leapmotor": {
    website: "https://leapmotor.cn/",
    industries: ["auto"],
    channels: [site("零跑汽车 官网", "https://leapmotor.cn/")],
  },
  "geely-auto": {
    website: "https://geely.com/",
    industries: ["auto"],
    channels: [site("吉利汽车 官网", "https://geely.com/")],
  },
  "zeekr": {
    website: "https://zeekr.com/",
    industries: ["auto"],
    channels: [site("极氪 官网", "https://zeekr.com/")],
  },
  "lynk-and-co": {
    website: "https://lynkco.com/",
    industries: ["auto"],
    channels: [site("领克 官网", "https://lynkco.com/")],
  },
  "changan": {
    website: "https://changan.com.cn/",
    industries: ["auto"],
    channels: [site("长安汽车 官网", "https://changan.com.cn/")],
  },
  "deepal": {
    website: "https://deepal.com.cn/",
    industries: ["auto"],
    channels: [site("深蓝汽车 官网", "https://deepal.com.cn/")],
  },
  "avatr": {
    website: "https://avatr.com/",
    industries: ["auto"],
    channels: [site("阿维塔 官网", "https://avatr.com/")],
  },
  "chery": {
    website: "https://chery.cn/",
    industries: ["auto"],
    channels: [site("奇瑞汽车 官网", "https://chery.cn/")],
  },
  "jetour": {
    website: "https://jetour.com.cn/",
    industries: ["auto"],
    channels: [site("捷途汽车 官网", "https://jetour.com.cn/")],
  },
  "great-wall-motor": {
    website: "https://gwm.com.cn/",
    industries: ["auto"],
    channels: [site("长城汽车 官网", "https://gwm.com.cn/")],
  },
  "gac-group": {
    website: "https://gac.com.cn/",
    industries: ["auto"],
    channels: [site("广汽集团 官网", "https://gac.com.cn/")],
  },
  "gac-aion": {
    website: "https://aion.com.cn/",
    industries: ["auto"],
    channels: [site("广汽埃安 官网", "https://aion.com.cn/")],
  },
  "seres": {
    website: "https://seres.cn/",
    industries: ["auto"],
    channels: [site("赛力斯 官网", "https://seres.cn/")],
  },
  "hima": {
    website: "https://hima.auto/",
    industries: ["auto"],
    channels: [site("鸿蒙智行 官网", "https://hima.auto/")],
  },
  "saic-motor": {
    website: "https://saicmotor.com/",
    industries: ["auto"],
    channels: [site("上汽集团 官网", "https://saicmotor.com/")],
  },
  "im-motors": {
    website: "https://immotors.com/",
    industries: ["auto"],
    channels: [site("智己汽车 官网", "https://immotors.com/")],
  },
  "wuling": {
    website: "https://sgmw.com.cn/",
    industries: ["auto"],
    channels: [site("五菱汽车 官网", "https://sgmw.com.cn/")],
  },
  "hongqi": {
    website: "https://hongqi.com.cn/",
    industries: ["auto"],
    channels: [site("红旗 官网", "https://hongqi.com.cn/")],
  },
  "volkswagen": {
    website: "https://volkswagen.com.cn/",
    industries: ["auto"],
    channels: [site("大众汽车 官网", "https://volkswagen.com.cn/")],
  },
  "toyota": {
    website: "https://toyota.com.cn/",
    industries: ["auto"],
    channels: [site("丰田汽车 官网", "https://toyota.com.cn/")],
  },
  "honda": {
    website: "https://honda.com.cn/",
    industries: ["auto"],
    channels: [site("本田汽车 官网", "https://honda.com.cn/")],
  },
  "nissan": {
    website: "https://nissan.com.cn/",
    industries: ["auto"],
    channels: [site("日产汽车 官网", "https://nissan.com.cn/")],
  },
  "mercedes-benz": {
    website: "https://mercedes-benz.com.cn/",
    industries: ["auto"],
    channels: [site("梅赛德斯-奔驰 官网", "https://mercedes-benz.com.cn/")],
  },
  "bmw": {
    website: "https://bmw.com.cn/",
    industries: ["auto"],
    channels: [site("宝马 官网", "https://bmw.com.cn/")],
  },
  "audi": {
    website: "https://audichina.cn/",
    industries: ["auto"],
    channels: [site("奥迪 官网", "https://audichina.cn/")],
  },
  "porsche": {
    website: "https://porsche.com/",
    industries: ["auto"],
    channels: [site("保时捷 官网", "https://porsche.com/")],
  },
  "ford": {
    website: "https://ford.com.cn/",
    industries: ["auto"],
    channels: [site("福特汽车 官网", "https://ford.com.cn/")],
  },
  "hyundai": {
    website: "https://hyundai.com/",
    industries: ["auto"],
    channels: [site("现代汽车 官网", "https://hyundai.com/")],
  },
  "kia": {
    website: "https://kia.com/",
    industries: ["auto"],
    channels: [site("起亚 官网", "https://kia.com/")],
  },
  "volvo-cars": {
    website: "https://volvocars.com/",
    industries: ["auto"],
    channels: [site("沃尔沃汽车 官网", "https://volvocars.com/")],
  },
  "lexus": {
    website: "https://lexus.com.cn/",
    industries: ["auto"],
    channels: [site("雷克萨斯 官网", "https://lexus.com.cn/")],
  },
  "rivian": {
    website: "https://rivian.com/",
    industries: ["auto"],
    channels: [site("Rivian 官网", "https://rivian.com/")],
  },
  "lucid-motors": {
    website: "https://lucidmotors.com/",
    industries: ["auto"],
    channels: [site("Lucid 官网", "https://lucidmotors.com/")],
  },
  // 游戏（WCH-35/36 首批）
  "riot-games": {
    website: "https://riotgames.com/",
    industries: ["game"],
    channels: [site("拳头游戏 官网", "https://riotgames.com/")],
  },
  "netease-games": {
    website: "https://neteasegames.com/",
    industries: ["game"],
    channels: [site("网易游戏 官网", "https://neteasegames.com/")],
  },
  "mihoyo": {
    website: "https://mihoyo.com/",
    industries: ["game"],
    channels: [site("米哈游 官网", "https://mihoyo.com/")],
  },
  "papergames": {
    website: "https://papegames.com/",
    industries: ["game"],
    channels: [site("叠纸游戏 官网", "https://papegames.com/")],
  },
  "hypergryph": {
    website: "https://hypergryph.com/",
    industries: ["game"],
    channels: [site("鹰角网络 官网", "https://hypergryph.com/")],
  },
  "kuro-games": {
    website: "https://kurogames.com/",
    industries: ["game"],
    channels: [site("库洛游戏 官网", "https://kurogames.com/")],
  },
  "game-science": {
    website: "https://gamesci.cn/",
    industries: ["game"],
    channels: [site("游戏科学 官网", "https://gamesci.cn/")],
  },
  "xd-games": {
    website: "https://xd.com/",
    industries: ["game"],
    channels: [site("心动网络 官网", "https://xd.com/")],
  },
  "37-interactive-entertainment": {
    website: "https://37.com/",
    industries: ["game"],
    channels: [site("三七互娱 官网", "https://37.com/")],
  },
  "lilith-games": {
    website: "https://lilithgames.com/",
    industries: ["game"],
    channels: [site("莉莉丝游戏 官网", "https://lilithgames.com/")],
  },
  "perfect-world-games": {
    website: "https://wanmei.com/",
    industries: ["game"],
    channels: [site("完美世界游戏 官网", "https://wanmei.com/")],
  },
  "shengqu-games": {
    website: "https://shengqugames.com/",
    industries: ["game"],
    channels: [site("盛趣游戏 官网", "https://shengqugames.com/")],
  },
  "yoozoo-games": {
    website: "https://yoozoo.com/",
    industries: ["game"],
    channels: [site("游族网络 官网", "https://yoozoo.com/")],
  },
  "moonton-games": {
    website: "https://moonton.com/",
    industries: ["game"],
    channels: [site("沐瞳科技 官网", "https://moonton.com/")],
  },
  "bilibili-games": {
    website: "https://game.bilibili.com/",
    industries: ["game"],
    channels: [site("哔哩哔哩游戏 官网", "https://game.bilibili.com/")],
  },
  "valve": {
    website: "https://valvesoftware.com/",
    industries: ["game"],
    channels: [site("Valve 官网", "https://valvesoftware.com/")],
  },
  "epic-games": {
    website: "https://epicgames.com/",
    industries: ["game"],
    channels: [site("Epic Games 官网", "https://epicgames.com/")],
  },
  "blizzard-entertainment": {
    website: "https://blizzard.com/",
    industries: ["game"],
    channels: [site("暴雪娱乐 官网", "https://blizzard.com/")],
  },
  "nintendo": {
    website: "https://nintendo.com/",
    industries: ["game"],
    channels: [site("任天堂 官网", "https://nintendo.com/")],
  },
  "playstation": {
    website: "https://playstation.com/",
    industries: ["game"],
    channels: [site("PlayStation 官网", "https://playstation.com/")],
  },
  "xbox": {
    website: "https://xbox.com/",
    industries: ["game"],
    channels: [site("Xbox 官网", "https://xbox.com/")],
  },
  "ubisoft": {
    website: "https://ubisoft.com/",
    industries: ["game"],
    channels: [site("育碧 官网", "https://ubisoft.com/")],
  },
  "electronic-arts": {
    website: "https://ea.com/",
    industries: ["game"],
    channels: [site("艺电 官网", "https://ea.com/")],
  },
  "take-two-interactive": {
    website: "https://take2games.com/",
    industries: ["game"],
    channels: [site("Take-Two 官网", "https://take2games.com/")],
  },
  "rockstar-games": {
    website: "https://rockstargames.com/",
    industries: ["game"],
    channels: [site("Rockstar Games 官网", "https://rockstargames.com/")],
  },
  "capcom": {
    website: "https://capcom.com/",
    industries: ["game"],
    channels: [site("卡普空 官网", "https://capcom.com/")],
  },
  "sega": {
    website: "https://sega.com/",
    industries: ["game"],
    channels: [site("世嘉 官网", "https://sega.com/")],
  },
  "bandai-namco-entertainment": {
    website: "https://bandainamcoent.com/",
    industries: ["game"],
    channels: [site("万代南梦宫娱乐 官网", "https://bandainamcoent.com/")],
  },
  "square-enix": {
    website: "https://square-enix.com/",
    industries: ["game"],
    channels: [site("史克威尔艾尼克斯 官网", "https://square-enix.com/")],
  },
  "konami": {
    website: "https://konami.com/",
    industries: ["game"],
    channels: [site("科乐美 官网", "https://konami.com/")],
  },
  "krafton": {
    website: "https://krafton.com/",
    industries: ["game"],
    channels: [site("KRAFTON 官网", "https://krafton.com/")],
  },
  "fromsoftware": {
    website: "https://fromsoftware.jp/",
    industries: ["game"],
    channels: [site("FromSoftware 官网", "https://fromsoftware.jp/")],
  },
  "cd-projekt": {
    website: "https://cdprojekt.com/",
    industries: ["game"],
    channels: [site("CD PROJEKT 官网", "https://cdprojekt.com/")],
  },
  "supercell": {
    website: "https://supercell.com/",
    industries: ["game"],
    channels: [site("Supercell 官网", "https://supercell.com/")],
  },
  // 影视（WCH-35/36 首批）
  "china-film": {
    website: "https://chinafilm.com/",
    industries: ["film"],
    channels: [site("中国电影 官网", "https://chinafilm.com/")],
  },
  "enlight-media": {
    industries: ["film"],
    channels: [],
  },
  "bona-film-group": {
    website: "https://bonafilm.cn/",
    industries: ["film"],
    channels: [site("博纳影业 官网", "https://bonafilm.cn/")],
  },
  "huayi-brothers": {
    website: "https://huayimedia.com/",
    industries: ["film"],
    channels: [site("华谊兄弟 官网", "https://huayimedia.com/")],
  },
  "huace-media": {
    website: "https://huacemedia.com/",
    industries: ["film"],
    channels: [site("华策影视 官网", "https://huacemedia.com/")],
  },
  "linmon-media": {
    website: "https://linmon.cn/",
    industries: ["film"],
    channels: [site("柠萌影视 官网", "https://linmon.cn/")],
  },
  "new-classics-media": {
    website: "https://ncmchina.com/",
    industries: ["film"],
    channels: [site("新丽传媒 官网", "https://ncmchina.com/")],
  },
  "daylight-entertainment": {
    industries: ["film"],
    channels: [],
  },
  "damai-entertainment": {
    website: "https://damaiholdings.com/",
    industries: ["film"],
    channels: [site("大麦娱乐 官网", "https://damaiholdings.com/")],
  },
  "china-literature": {
    website: "https://yuewen.com/",
    industries: ["film"],
    channels: [site("阅文集团 官网", "https://yuewen.com/")],
  },
  "iqiyi": {
    website: "https://iqiyi.com/",
    industries: ["film"],
    channels: [site("爱奇艺 官网", "https://iqiyi.com/")],
  },
  "tencent-video": {
    website: "https://v.qq.com/",
    industries: ["film"],
    channels: [site("腾讯视频 官网", "https://v.qq.com/")],
  },
  "youku": {
    website: "https://youku.com/",
    industries: ["film"],
    channels: [site("优酷 官网", "https://youku.com/")],
  },
  "mango-tv": {
    website: "https://mgtv.com/",
    industries: ["film"],
    channels: [site("芒果TV 官网", "https://mgtv.com/")],
  },
  "bilibili": {
    website: "https://bilibili.com/",
    industries: ["film"],
    channels: [site("哔哩哔哩 官网", "https://bilibili.com/")],
  },
  "universal-pictures": {
    website: "https://universalpictures.com/",
    industries: ["film"],
    channels: [site("环球影业 官网", "https://universalpictures.com/")],
  },
  "skydance-corporation": {
    website: "https://skydance.com/",
    industries: ["film"],
    channels: [site("Skydance 官网", "https://skydance.com/")],
  },
  "sony-pictures": {
    website: "https://sonypictures.com/",
    industries: ["film"],
    channels: [site("索尼影业 官网", "https://sonypictures.com/")],
  },
  "amazon-mgm-studios": {
    website: "https://amazonmgmstudios.com/",
    industries: ["film"],
    channels: [site("亚马逊米高梅影业 官网", "https://amazonmgmstudios.com/")],
  },
  "apple-tv": {
    website: "https://tv.apple.com/",
    industries: ["film"],
    channels: [site("Apple TV 官网", "https://tv.apple.com/")],
  },
  "lionsgate": {
    website: "https://lionsgate.com/",
    industries: ["film"],
    channels: [site("狮门影业 官网", "https://lionsgate.com/")],
  },
  "toho": {
    website: "https://toho.co.jp/",
    industries: ["film"],
    channels: [site("东宝 官网", "https://toho.co.jp/")],
  },
  "studio-ghibli": {
    website: "https://ghibli.jp/",
    industries: ["film"],
    channels: [site("吉卜力工作室 官网", "https://ghibli.jp/")],
  },
  "cj-enm": {
    website: "https://cjenm.com/",
    industries: ["film"],
    channels: [site("CJ ENM 官网", "https://cjenm.com/")],
  },
  "bbc-studios": {
    website: "https://bbcstudios.com/",
    industries: ["film"],
    channels: [site("BBC Studios 官网", "https://bbcstudios.com/")],
  },
};

const DEFAULT_FORMAT: ArticleFormat = {
  title: { fontSize: 22, fontWeight: 700, lineHeight: 1.35, marginBottom: 18, color: "#1a1a1a", align: "left" },
  body: { fontSize: 16, lineHeight: 1.85, color: "#333333", letterSpacing: 0.5, paragraphSpacing: 16, align: "justify" },
  heading: { fontSize: 18, fontWeight: 600, lineHeight: 1.5, marginTop: 28, marginBottom: 12, color: "#111111" },
  quote: { fontSize: 15, lineHeight: 1.75, color: "#666666", background: "#f7f7f7", borderColor: "#d9d9d9", padding: 12 },
  image: { width: "100%", borderRadius: 4 },
  link: { color: "#576b95" },
};

const COMPACT_FORMAT: ArticleFormat = {
  title: { fontSize: 20, fontWeight: 700, lineHeight: 1.3, marginBottom: 14, color: "#1a1a1a", align: "left" },
  body: { fontSize: 15, lineHeight: 1.7, color: "#333333", letterSpacing: 0.2, paragraphSpacing: 12, align: "justify" },
  heading: { fontSize: 17, fontWeight: 600, lineHeight: 1.4, marginTop: 22, marginBottom: 10, color: "#111111" },
  quote: { fontSize: 14, lineHeight: 1.65, color: "#666666", background: "#f7f7f7", borderColor: "#d9d9d9", padding: 10 },
  image: { width: "100%", borderRadius: 2 },
  link: { color: "#576b95" },
};

export const WRITING_PRESETS: WritingPresetSeed[] = [
  {
    id: "writing-news",
    kind: "writing",
    name: "科技快讯",
    columnType: "news",
    targetReader: "关注科技行业的公众号读者",
    wordCount: 1200,
    tone: "冷静、直接，先交代事实和影响，少用形容词",
    titlePreference: "事实或变化放在标题前半句，不用夸张词和悬念问句",
    forbiddenExpressions: ["震惊", "炸裂", "重磅", "颠覆", "遥遥领先", "史诗级", "吊打"],
    format: {},
    builtin: true,
  },
  {
    id: "writing-insight",
    kind: "writing",
    name: "行业洞察",
    columnType: "insight",
    targetReader: "科技从业者、产品经理和关注产业变化的人",
    wordCount: 2200,
    tone: "分析性、克制，明确区分事实、推断和观点",
    titlePreference: "用判断、问题或变化做标题，不用标题党",
    forbiddenExpressions: ["必看", "封神", "碾压", "彻底改变", "赢麻了", "王炸"],
    format: {},
    builtin: true,
  },
];

export const FORMAT_PRESETS: FormatPresetSeed[] = [
  {
    id: "format-wechat-default",
    kind: "format",
    name: "公众号默认",
    columnType: null,
    targetReader: null,
    wordCount: null,
    tone: null,
    titlePreference: null,
    forbiddenExpressions: [],
    format: DEFAULT_FORMAT,
    builtin: true,
  },
  {
    id: "format-wechat-compact",
    kind: "format",
    name: "紧凑排版",
    columnType: null,
    targetReader: null,
    wordCount: null,
    tone: null,
    titlePreference: null,
    forbiddenExpressions: [],
    format: COMPACT_FORMAT,
    builtin: true,
  },
];
