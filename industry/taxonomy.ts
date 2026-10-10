// 这个行业的分类体系：类别、标签词表、公司（主体）名录，以及防止张冠李戴的身份词典。
// 模型按这里的词表打标签，主题页（topics.json）按标签归类，筛选栏按类别分组。
// 换行业时：类别的 key 会出现在网址里（/all?category=…），上线后就不要再改；标签和名录可以随时增减。

/**
 * 网页上的类别（筛选栏、卡片角标、RSS 分类订阅）。key 是网址和接口里的身份，上线后不要改。
 * section 是日报里的分节标题（几个类别可以共用一节，按这里的顺序排）；guide 告诉结构抽取模型这一类收什么、
 * 和相邻类别的边界在哪（总的归类原则写在 prompts/structure.md 里）。
 * commentary 标出评论类（教程、观点）：日报写过的事又有评论类的后续报道，只占一行快讯（报道它的信源够多时除外）。
 * 这里的六个类别都是内容领域、没有评论类，所以日报不区分评论类后续（要恢复这条规则，就给某一类加上 commentary: true）。
 * 没归上类的资料在日报里放进第一个 key 为 industry 的类别所在的节（没有就放最后一节）。
 * feedLabel 是分类 RSS 标题里的名字（不写就用 label）。公开接口、RSS 和 MCP 里要把一类并进另一类发布，写在站点设置里（site/site.ts 的 PUBLIC_CATEGORIES）。
 */
export const CATEGORIES = [
  { key: "ai-models", label: "大模型", feedLabel: "大模型", section: "大模型", guide: "基础模型本身的发布和变化：新模型、版本更新、权重开放、能力与价格调整，以及既有榜单上的模型成绩。厂商同时发的推理框架、算子库、硬件适配组件算软件；只公布一次跑分不算发布新基准，也不是教程。" },
  { key: "software", label: "软件", feedLabel: "软件", section: "软件与开发", guide: "可安装、可调用的软件：应用与客户端、开发工具与编程助手、操作系统与系统更新、框架与开源项目，以及它们的版本、能力、价格和可用性变化。芯片、整机和外设算硬件；模型权重和榜单成绩算大模型。" },
  { key: "hardware", label: "硬件", feedLabel: "硬件", section: "硬件与算力", guide: "看得见摸得着的设备与算力：芯片与加速卡、服务器与算力集群、手机电脑等整机、可穿戴与影像设备、外设与零部件，以及它们的规格、产能、价格和供货变化。机器人和自动驾驶车辆算具身智能；只讲软件功能算软件。" },
  { key: "embodied", label: "具身智能", feedLabel: "具身智能", section: "具身智能", guide: "会动的智能体：人形与工业机器人、机械臂、四足和轮式机器人、自动驾驶、无人机，以及驱动它们的具身模型、训练数据和仿真环境。只讲芯片规格算硬件；没有实体形态的对话模型算大模型。" },
  { key: "film", label: "电影艺术", feedLabel: "电影艺术", section: "电影与艺术", guide: "影像与艺术创作：电影、剧集、动画、纪录片、游戏与互动影像的作品、创作和产业动向，电影节与奖项，拍摄剪辑特效与生成影像的技术和工具，以及生成影像带来的创作与版权争议。摄影、音乐等相邻艺术门类也算。" },
  { key: "industry", label: "行业", feedLabel: "行业动态", section: "行业动态", guide: "已发生的公司经营、融资并购、人事、合作、诉讼、政策监管、真实安全事故及调查进展。新闻由当事人发帖、带有态度，也不因此变成观点。" },
] as const satisfies ReadonlyArray<{ key: string; label: string; feedLabel?: string; section: string; guide: string; commentary?: true }>;

/**
 * 这个行业最受关注的一类发布（这里是新模型）：日报报头的“N 个新模型”、改分类后修订已出的报告都按它数。
 * category 是类别，tag 是标签，两者都对上才算；unit 接在数字后面。
 * 没有这样一类的行业设成 null，报头就不显示这个数。
 */
export const RELEASE: { category: string; tag: string; unit: string } | null = { category: "ai-models", tag: "模型发布", unit: "个新模型" };

/** 周报月报的总述可以直接写、不必在报道里找到出处的行业通用词（小写）。站名会自动算进去。 */
export const PLAIN_TERMS: readonly string[] = ["ai", "api", "llm", "gpu", "cpu", "soc", "os", "app", "sdk", "pc", "vr", "ar", "xr", "cg", "vfx", "hdr", "imax", "ceo", "ipo", "rss"];

/**
 * 内容理解一步给每篇资料判的“内容类型”（写在 prompts/content-understanding.md 里，改了类型要同步改那份提示词）。
 * 评分提示词（prompts/selection-score.md）按类型给五个维度不同的权重。
 */
export const ITEM_TYPES = ["model_release", "product_launch", "tool_or_prompt", "research_paper", "industry_event", "opinion_analysis", "tutorial_explainer"] as const;

// ── 标签词表 ────────────────────────────────────────────────────────────────────────────

/** 每篇资料的第一个标签必须是这些“分类标签”之一。 */
export const CATEGORY_TAGS = [
  "模型发布", "产品更新", "硬件发布", "作品发布", "论文/研究", "开源/仓库", "评测/基准", "教程/实践", "观点/评论", "现象/趋势",
  "政策/监管", "安全/事故", "融资/并购", "人事变动", "供应链/产能", "非关注/通用", "其他",
] as const;

/** 可选的主题标签（细分领域和内容形态）。 */
export const TOPIC_TAGS = [
  "Agent", "编码", "推理", "多模态", "语音", "视频生成", "图像生成", "RAG", "端侧", "数据/训练", "部署/工程", "开源生态", "MCP/工具调用",
  "操作系统", "开发工具", "云服务", "安全/隐私", "芯片", "算力", "消费电子", "可穿戴", "机器人", "自动驾驶", "无人机", "仿真",
  "电影", "剧集", "动画", "游戏", "特效", "AI 影像", "音乐", "摄影",
] as const;

/** 可选的实体标签（公司、机构、平台）。 */
export const ENTITY_TAGS = ["OpenAI", "Anthropic", "Google", "Meta", "Microsoft", "Apple", "NVIDIA", "Intel", "Tesla", "阿里巴巴", "字节跳动", "腾讯", "迪士尼", "Netflix", "索尼"] as const;

/** 模型常写的近义词，统一成词表里的写法。 */
export const TAG_SYNONYMS: Readonly<Record<string, string>> = {
  "教程/玩法": "教程/实践", "技巧/最佳实践": "教程/实践", 入门: "教程/实践", 教程: "教程/实践", 玩法: "教程/实践", 指南: "教程/实践", 技巧: "教程/实践", 最佳实践: "教程/实践", 实践: "教程/实践",
  公司动态: "行业动态", 合作: "行业动态", 动态: "行业动态", 行业: "行业动态", "合作/生态": "行业动态",
  融资: "融资/并购", 收购: "融资/并购", 投资: "融资/并购", 并购: "融资/并购", 上市: "融资/并购", ipo: "融资/并购",
  人事: "人事变动", 高管变动: "人事变动", 离职: "人事变动", 任命: "人事变动",
  供应链: "供应链/产能", 产能: "供应链/产能", 涨价: "供应链/产能", 供货: "供应链/产能",
  政策: "政策/监管", 监管: "政策/监管", 法规: "政策/监管", 合规: "政策/监管",
  安全: "安全/事故", 对齐: "安全/事故", 漏洞: "安全/事故", 事故: "安全/事故", 泄露: "安全/事故", "数据泄露": "安全/事故",
  论文: "论文/研究", 研究: "论文/研究", 技术报告: "论文/研究", paper: "论文/研究", papers: "论文/研究",
  "open-source": "开源/仓库", 开源: "开源/仓库", 仓库: "开源/仓库", repo: "开源/仓库", repository: "开源/仓库",
  产品: "产品更新", 更新: "产品更新", 功能: "产品更新",
  发布: "模型发布", 模型: "模型发布", 新模型: "模型发布",
  硬件: "硬件发布", 新品: "硬件发布", 设备: "硬件发布",
  电影: "作品发布", 影片: "作品发布", 剧集: "作品发布", 上映: "作品发布", 定档: "作品发布", 预告: "作品发布",
  趋势: "现象/趋势", 现象: "现象/趋势",
  观点: "观点/评论", 评论: "观点/评论", 解读: "观点/评论", 访谈: "观点/评论", 复盘: "观点/评论", 大佬观点: "观点/评论",
  评测: "评测/基准", 基准: "评测/基准", benchmark: "评测/基准", 跑分: "评测/基准", 榜单: "评测/基准", 参数: "评测/基准",
  生态: "开源生态", 开源社区: "开源生态",
  半导体: "芯片", 芯片: "芯片", 处理器: "芯片",
  数据中心: "算力", 算力: "算力", 集群: "算力",
  手机: "消费电子", 电脑: "消费电子", 笔记本: "消费电子", 平板: "消费电子",
  眼镜: "可穿戴", 手表: "可穿戴", 耳机: "可穿戴",
  机械臂: "机器人", robot: "机器人", robotics: "机器人",
  智驾: "自动驾驶", 无人驾驶: "自动驾驶", 智能驾驶: "自动驾驶", 机器人出租车: "自动驾驶",
  大模型: "模型发布",
  "非ai": "非关注/通用", "non-ai": "非关注/通用", 通用工具: "非关注/通用", 工程工具: "非关注/通用", 安全扫描: "非关注/通用", devops: "非关注/通用",
};

// ── 公司与主体 ──────────────────────────────────────────────────────────────────────────

/**
 * 公司主题：id → 显示名、卡片上显示的标签（null 表示只用 entity:<id> 归类）、别名。
 * aliases 给结构抽取模型看；otherNames 是公司自己的其他称呼（官方账号名、子品牌），
 * 把事实的主体对到发布方时也认它们。
 */
export const ENTITIES: Record<string, { name: string; displayTag: string | null; aliases: string[]; otherNames?: string[] }> = {
  // 大模型与平台
  openai: { name: "OpenAI", displayTag: "OpenAI", aliases: ["OpenAI", "ChatGPT", "GPT", "Sora", "Codex"], otherNames: ["OpenAI Developers"] },
  anthropic: { name: "Anthropic", displayTag: "Anthropic", aliases: ["Anthropic", "Claude"], otherNames: ["Claude Code"] },
  google: { name: "Google", displayTag: "Google", aliases: ["Google", "DeepMind", "Gemini", "谷歌"], otherNames: ["Google DeepMind", "Google Research", "Google AI", "Google Labs"] },
  meta: { name: "Meta", displayTag: "Meta", aliases: ["Meta", "Llama"], otherNames: ["Meta AI", "AI at Meta"] },
  microsoft: { name: "Microsoft", displayTag: "Microsoft", aliases: ["Microsoft", "微软", "Copilot"], otherNames: ["Microsoft Research", "Microsoft AI"] },
  apple: { name: "Apple", displayTag: "Apple", aliases: ["Apple", "苹果"], otherNames: ["Apple Intelligence", "Apple Silicon"] },
  nvidia: { name: "NVIDIA", displayTag: "NVIDIA", aliases: ["NVIDIA", "英伟达"] },
  amd: { name: "AMD", displayTag: null, aliases: ["AMD", "Advanced Micro Devices"] },
  intel: { name: "Intel", displayTag: "Intel", aliases: ["Intel", "英特尔"] },
  deepseek: { name: "DeepSeek", displayTag: null, aliases: ["DeepSeek", "深度求索"] },
  qwen: { name: "千问 Qwen", displayTag: "阿里巴巴", aliases: ["Qwen", "通义", "阿里"], otherNames: ["通义千问", "千问", "Qwen Team", "通义实验室", "阿里巴巴", "Alibaba", "阿里云", "Alibaba Cloud"] },
  bytedance: { name: "字节跳动", displayTag: "字节跳动", aliases: ["字节跳动", "豆包", "ByteDance"], otherNames: ["火山引擎", "豆包大模型", "即梦", "Seed", "剪映", "TikTok"] },
  tencent: { name: "腾讯", displayTag: "腾讯", aliases: ["腾讯", "混元", "Tencent"], otherNames: ["Hunyuan", "腾讯混元"] },
  kimi: { name: "Kimi / 月之暗面", displayTag: null, aliases: ["Kimi", "月之暗面", "Moonshot"], otherNames: ["Moonshot AI"] },
  minimax: { name: "MiniMax", displayTag: null, aliases: ["MiniMax", "海螺"], otherNames: ["稀宇科技"] },
  zhipu: { name: "智谱 GLM", displayTag: null, aliases: ["智谱", "GLM", "Z.ai"], otherNames: ["智谱AI", "Zhipu", "Zhipu AI"] },
  xai: { name: "xAI", displayTag: null, aliases: ["xAI", "Grok"] },
  mistral: { name: "Mistral", displayTag: null, aliases: ["Mistral"] },
  "hugging-face": { name: "Hugging Face", displayTag: null, aliases: ["Hugging Face"], otherNames: ["HuggingFace"] },
  // 软件与工具
  github: { name: "GitHub", displayTag: null, aliases: ["GitHub"] },
  cursor: { name: "Cursor", displayTag: null, aliases: ["Cursor", "Anysphere"] },
  figma: { name: "Figma", displayTag: null, aliases: ["Figma"] },
  adobe: { name: "Adobe", displayTag: null, aliases: ["Adobe", "Photoshop", "Premiere", "After Effects"] },
  // 硬件
  huawei: { name: "华为", displayTag: null, aliases: ["华为", "Huawei"], otherNames: ["鸿蒙", "HarmonyOS", "昇腾", "Ascend", "麒麟"] },
  xiaomi: { name: "小米", displayTag: null, aliases: ["小米", "Xiaomi"], otherNames: ["Redmi", "红米", "小米汽车"] },
  samsung: { name: "三星", displayTag: null, aliases: ["三星", "Samsung"] },
  qualcomm: { name: "高通", displayTag: null, aliases: ["高通", "Qualcomm"], otherNames: ["骁龙", "Snapdragon"] },
  sony: { name: "索尼", displayTag: "索尼", aliases: ["索尼", "Sony"], otherNames: ["PlayStation", "Alpha"] },
  // 具身智能
  tesla: { name: "Tesla", displayTag: "Tesla", aliases: ["Tesla", "特斯拉"], otherNames: ["Optimus", "FSD", "擎天柱"] },
  unitree: { name: "宇树科技", displayTag: null, aliases: ["宇树", "Unitree"] },
  figure: { name: "Figure", displayTag: null, aliases: ["Figure"], otherNames: ["Figure AI"] },
  "boston-dynamics": { name: "波士顿动力", displayTag: null, aliases: ["波士顿动力", "Boston Dynamics"], otherNames: ["Atlas", "Spot"] },
  waymo: { name: "Waymo", displayTag: null, aliases: ["Waymo"] },
  dji: { name: "大疆", displayTag: null, aliases: ["大疆", "DJI"] },
  // 电影与艺术
  disney: { name: "迪士尼", displayTag: "迪士尼", aliases: ["迪士尼", "Disney"], otherNames: ["皮克斯", "Pixar", "漫威", "Marvel", "卢卡斯影业", "Lucasfilm", "Disney+"] },
  netflix: { name: "Netflix", displayTag: "Netflix", aliases: ["Netflix", "奈飞"] },
  "warner-bros": { name: "华纳兄弟", displayTag: null, aliases: ["华纳兄弟", "Warner Bros"], otherNames: ["HBO", "DC 影业"] },
  a24: { name: "A24", displayTag: null, aliases: ["A24"] },
  runway: { name: "Runway", displayTag: null, aliases: ["Runway"] },
};

/**
 * 身份词典：摘要和标题里出现的公司，必须在原文里也出现过，否则退回原标题、丢掉摘要（防止模型张冠李戴）。
 * 行业没有这个问题时可以留空数组。
 */
export const IDENTITY_LEXICON: ReadonlyArray<{ id: string; name: string; patterns: RegExp[] }> = [
  { id: "openai", name: "OpenAI", patterns: [/openai|chatgpt|\bgpt-?[o\d]|\bsora\b|\bcodex\b/i] },
  { id: "anthropic", name: "Anthropic", patterns: [/anthropic|\bclaude\b/i, /\b(?:opus|sonnet|haiku)\s*\d+(?:[.\-]\d+)*\b/i] },
  { id: "google", name: "Google / Gemini", patterns: [/google|deepmind|\bgemini\b|notebooklm|\bveo\s?\d|\bandroid\b|\bpixel\b/i] },
  { id: "apple", name: "Apple", patterns: [/\bapple\b|苹果|\biphone\b|\bmacbook\b|\bipad\b|\bvision\s?pro\b|\bsiri\b/i] },
  { id: "microsoft", name: "Microsoft / Copilot", patterns: [/microsoft|copilot|微软|windows/i] },
  { id: "meta", name: "Meta / Llama", patterns: [/\bMeta\b/, /\bmeta\s?ai\b|\bllama\b|\bquest\s?\d/i] },
  { id: "nvidia", name: "NVIDIA", patterns: [/nvidia|英伟达|\bblackwell\b|\brubin\b|\bcuda\b|\bgeforce\b/i] },
  { id: "amd", name: "AMD", patterns: [/\bamd\b|\bryzen\b|\bradeon\b|\binstinct\b/i] },
  { id: "intel", name: "Intel", patterns: [/\bintel\b|英特尔|\bcore\s?ultra\b|\bxeon\b/i] },
  { id: "qualcomm", name: "高通", patterns: [/qualcomm|高通|\bsnapdragon\b|骁龙/i] },
  { id: "huawei", name: "华为", patterns: [/huawei|华为|鸿蒙|\bharmonyos\b|昇腾|\bascend\b|\bkirin\b/i] },
  { id: "xiaomi", name: "小米", patterns: [/xiaomi|小米|\bredmi\b|红米/i] },
  { id: "samsung", name: "三星", patterns: [/samsung|三星|\bgalaxy\b/i] },
  { id: "sony", name: "索尼", patterns: [/\bsony\b|索尼|\bplaystation\b|\bps\s?5\b/i] },
  { id: "tesla", name: "Tesla", patterns: [/\btesla\b|特斯拉|\boptimus\b|擎天柱/i] },
  { id: "unitree", name: "宇树科技", patterns: [/unitree|宇树/i] },
  { id: "deepseek", name: "DeepSeek", patterns: [/deepseek|深度求索/i] },
  { id: "qwen", name: "千问 Qwen", patterns: [/\bqwen|通义|千问/i] },
  { id: "bytedance", name: "字节跳动", patterns: [/字节跳动|bytedance|豆包|doubao|即梦|\bseedream\b|\bseedance\b/i] },
  { id: "tencent", name: "腾讯", patterns: [/腾讯|tencent|混元|hunyuan/i] },
  { id: "kimi", name: "Kimi / 月之暗面", patterns: [/\bkimi\b|月之暗面|\bmoonshot\s?ai\b/i] },
  { id: "minimax", name: "MiniMax", patterns: [/minimax|海螺/i] },
  { id: "zhipu", name: "智谱 GLM", patterns: [/智谱|\bglm-?[4-9]/i] },
  { id: "xai", name: "xAI / Grok", patterns: [/\bxai\b|\bgrok\b/i] },
  { id: "disney", name: "迪士尼", patterns: [/disney|迪士尼|皮克斯|pixar|漫威|marvel|卢卡斯|lucasfilm/i] },
  { id: "netflix", name: "Netflix", patterns: [/netflix|奈飞/i] },
  { id: "runway", name: "Runway", patterns: [/\brunway\b/i] },
  { id: "midjourney", name: "Midjourney", patterns: [/midjourney/i] },
  { id: "figma", name: "Figma", patterns: [/\bfigma\b/i] },
  { id: "adobe", name: "Adobe", patterns: [/\badobe\b|photoshop|premiere\s?pro|after\s?effects/i] },
  { id: "waymo", name: "Waymo", patterns: [/\bwaymo\b/i] },
  { id: "dji", name: "大疆", patterns: [/\bdji\b|大疆/i] },
  { id: "amazon", name: "Amazon / AWS", patterns: [/amazon|\baws\b|亚马逊/i] },
  { id: "baidu", name: "百度文心", patterns: [/百度|baidu|文心|\bernie\b/i] },
];

/** 这些域名上的文章，发布方就是对应的公司（托管平台如 GitHub、arXiv 不算）。子域名也算。 */
export const PUBLISHER_DOMAINS: ReadonlyArray<{ entityId: string; domains: readonly string[] }> = [
  { entityId: "openai", domains: ["openai.com"] },
  { entityId: "anthropic", domains: ["anthropic.com", "claude.com"] },
  { entityId: "google", domains: ["deepmind.google", "ai.google", "blog.google", "android.com"] },
  { entityId: "meta", domains: ["ai.meta.com", "about.fb.com"] },
  { entityId: "microsoft", domains: ["microsoft.com", "windows.com"] },
  { entityId: "apple", domains: ["apple.com"] },
  { entityId: "nvidia", domains: ["nvidia.com"] },
  { entityId: "amd", domains: ["amd.com"] },
  { entityId: "intel", domains: ["intel.com"] },
  { entityId: "qualcomm", domains: ["qualcomm.com"] },
  { entityId: "huawei", domains: ["huawei.com"] },
  { entityId: "xiaomi", domains: ["mi.com", "xiaomi.com"] },
  { entityId: "samsung", domains: ["samsung.com"] },
  { entityId: "sony", domains: ["sony.com", "sony.net"] },
  { entityId: "tesla", domains: ["tesla.com"] },
  { entityId: "unitree", domains: ["unitree.com"] },
  { entityId: "dji", domains: ["dji.com"] },
  { entityId: "deepseek", domains: ["deepseek.com"] },
  { entityId: "qwen", domains: ["qwen.ai", "qwenlm.ai"] },
  { entityId: "xai", domains: ["x.ai"] },
  { entityId: "kimi", domains: ["moonshot.cn", "kimi.com"] },
  { entityId: "zhipu", domains: ["zhipuai.cn", "z.ai"] },
  { entityId: "mistral", domains: ["mistral.ai"] },
  { entityId: "figma", domains: ["figma.com"] },
  { entityId: "adobe", domains: ["adobe.com"] },
  { entityId: "cursor", domains: ["cursor.com"] },
  { entityId: "runway", domains: ["runwayml.com"] },
  { entityId: "disney", domains: ["disney.com", "thewaltdisneycompany.com"] },
  { entityId: "netflix", domains: ["netflix.com"] },
  { entityId: "a24", domains: ["a24films.com"] },
];

/** 原文里的这些写法也算提到了对应公司。 */
export const IDENTITY_CONTEXT_ALIASES: ReadonlyArray<{ entityId: string; pattern: RegExp }> = [
  { entityId: "meta", pattern: /@AIatMeta\b/i },
  { entityId: "zhipu", pattern: /\bZhipu(?:\s+AI\b|['’]s\b)/i },
  { entityId: "unitree", pattern: /@Unitree\w*/i },
  { entityId: "dji", pattern: /@DJIGlobal\b/i },
];
