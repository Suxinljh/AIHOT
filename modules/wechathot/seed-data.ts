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
  website: string;
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
