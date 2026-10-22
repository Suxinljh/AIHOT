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
  { key: "auto", label: "汽车", feedLabel: "汽车", section: "汽车", guide: "整车与出行产品：新车发布与改款、价格与权益、交付与产能、渠道与出海、智能座舱与车机，以及车企的经营动作。单独讲芯片规格算硬件；自动驾驶系统、Robotaxi 与机器人算具身智能；只讲车载软件功能算软件。" },
  { key: "hardware", label: "硬件", feedLabel: "硬件", section: "硬件与算力", guide: "看得见摸得着的设备与算力：芯片与加速卡、服务器与算力集群、手机电脑等整机、可穿戴与影像设备、外设与零部件，以及它们的规格、产能、价格和供货变化。机器人和自动驾驶车辆算具身智能；只讲软件功能算软件。" },
  { key: "software", label: "软件", feedLabel: "软件", section: "软件与开发", guide: "可安装、可调用的软件：应用与客户端、开发工具与编程助手、操作系统与系统更新、框架与开源项目，以及它们的版本、能力、价格和可用性变化。芯片、整机和外设算硬件；模型权重和榜单成绩算大模型。" },
  { key: "embodied", label: "具身智能", feedLabel: "具身智能", section: "具身智能", guide: "会动的智能体：人形与工业机器人、机械臂、四足和轮式机器人、自动驾驶、无人机，以及驱动它们的具身模型、训练数据和仿真环境。只讲芯片规格算硬件；没有实体形态的对话模型算大模型。" },
  { key: "film", label: "电影与剧集", feedLabel: "电影与剧集", section: "电影与剧集", guide: "影视内容与产业：电影、剧集、动画、纪录片、综艺与流媒体的作品、档期、票房与口碑，影视公司与平台，电影节与奖项，拍摄剪辑特效与生成影像的技术和版权争议。游戏与互动娱乐算游戏；摄影、音乐等相邻艺术门类也算。" },
  { key: "game", label: "游戏", feedLabel: "游戏", section: "游戏", guide: "游戏作品与产业：新作、版本更新、上线与停服、赛事与电竞、厂商与工作室、平台与发行、引擎与渲染技术，以及游戏相关的商业与政策变化。影视剧集算电影与剧集；游戏内的虚拟影像技术算游戏。" },
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
  "汽车", "智能驾驶", "新能源", "影视", "票房", "短剧", "电竞", "主机",
] as const;

/** 可选的实体标签（公司、机构、平台）。 */
export const ENTITY_TAGS = ["OpenAI", "Anthropic", "Google", "Meta", "Microsoft", "Apple", "NVIDIA", "Intel", "Tesla", "阿里巴巴", "字节跳动", "腾讯", "迪士尼", "Netflix", "索尼"] as const;

/** 模型常写的近义词，统一成词表里的写法。 */
export const TAG_SYNONYMS: Readonly<Record<string, string>> = {
  "教程/玩法": "教程/实践", "技巧/最佳实践": "教程/实践", 入门: "教程/实践", 教程: "教程/实践", 玩法: "教程/实践", 指南: "教程/实践", 技巧: "教程/实践", 最佳实践: "教程/实践", 实践: "教程/实践",
  公司动态: "其他", 合作: "其他", 动态: "其他", 行业: "其他", "合作/生态": "其他",
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
  tencent: { name: "腾讯", displayTag: "腾讯", aliases: ["腾讯", "混元", "Tencent", "腾讯游戏", "腾讯游戏业务", "Tencent Games", "Tencent Gaming"], otherNames: ["Hunyuan", "腾讯混元", "天美工作室群", "光子工作室群", "魔方工作室群", "王者荣耀", "和平精英", "三角洲行动"] },
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
  xiaomi: { name: "小米", displayTag: null, aliases: ["小米", "Xiaomi", "小米汽车", "小米造车", "小米电动车", "Xiaomi EV"], otherNames: ["Redmi", "红米", "小米汽车", "SU7", "YU7", "Xiaomi HyperOS"] },
  samsung: { name: "三星", displayTag: null, aliases: ["三星", "Samsung"] },
  qualcomm: { name: "高通", displayTag: null, aliases: ["高通", "Qualcomm"], otherNames: ["骁龙", "Snapdragon"] },
  sony: { name: "索尼", displayTag: "索尼", aliases: ["索尼", "Sony"], otherNames: ["PlayStation", "Alpha"] },
  // 具身智能
  tesla: { name: "Tesla", displayTag: "Tesla", aliases: ["Tesla", "特斯拉", "特斯拉汽车", "Tesla Motors"], otherNames: ["Optimus", "FSD", "擎天柱", "Model 3", "Model Y", "Model S", "Model X", "Cybertruck"] },
  unitree: { name: "宇树科技", displayTag: null, aliases: ["宇树", "Unitree"] },
  figure: { name: "Figure", displayTag: null, aliases: ["Figure"], otherNames: ["Figure AI"] },
  "boston-dynamics": { name: "波士顿动力", displayTag: null, aliases: ["波士顿动力", "Boston Dynamics"], otherNames: ["Atlas", "Spot"] },
  waymo: { name: "Waymo", displayTag: null, aliases: ["Waymo"] },
  dji: { name: "大疆", displayTag: null, aliases: ["大疆", "DJI"] },
  // 电影与艺术
  disney: { name: "迪士尼", displayTag: "迪士尼", aliases: ["迪士尼", "Disney", "华特迪士尼", "The Walt Disney Company"], otherNames: ["皮克斯", "Pixar", "漫威", "Marvel", "卢卡斯影业", "Lucasfilm", "Disney+", "20世纪影业"] },
  netflix: { name: "Netflix", displayTag: "Netflix", aliases: ["Netflix", "奈飞", "网飞", "Netflix流媒体"], otherNames: ["Netflix Originals", "Netflix Animation"] },
  "warner-bros": { name: "华纳兄弟", displayTag: null, aliases: ["华纳兄弟", "Warner Bros"], otherNames: ["HBO", "DC 影业"] },
  a24: { name: "A24", displayTag: null, aliases: ["A24", "A24影业", "A24 Films"], otherNames: ["A24 TV", "AAA24"] },
  runway: { name: "Runway", displayTag: null, aliases: ["Runway"] },
  // 汽车（WCH-35 首批）
  "byd": { name: "比亚迪", displayTag: null, aliases: ["比亚迪", "BYD", "比亚迪汽车", "BYD Auto"], otherNames: ["王朝", "海洋", "腾势", "仰望", "方程豹"] },
  "li-auto": { name: "理想汽车", displayTag: null, aliases: ["理想汽车", "Li Auto", "理想", "理想汽车公司"], otherNames: ["L系列", "i系列", "MEGA", "理想同学"] },
  "xpeng": { name: "小鹏汽车", displayTag: null, aliases: ["小鹏汽车", "XPENG", "小鹏", "Xpeng Motors"], otherNames: ["MONA", "P7", "G6", "G9", "X9"] },
  "nio": { name: "蔚来", displayTag: null, aliases: ["蔚来", "NIO", "蔚来汽车", "蔚来公司"], otherNames: ["乐道", "萤火虫", "ET系列", "ES系列", "EC系列"] },
  "leapmotor": { name: "零跑汽车", displayTag: null, aliases: ["零跑汽车", "Leapmotor", "零跑", "零跑科技"], otherNames: ["A系列", "B系列", "C系列", "D系列", "T03"] },
  "geely-auto": { name: "吉利汽车", displayTag: null, aliases: ["吉利汽车", "Geely Auto", "吉利", "吉利汽车集团"], otherNames: ["吉利银河", "中国星", "缤越", "博越"] },
  "zeekr": { name: "极氪", displayTag: null, aliases: ["极氪", "ZEEKR", "极氪汽车", "极氪智能科技"], otherNames: ["001", "007", "7X", "009", "MIX"] },
  "lynk-and-co": { name: "领克", displayTag: null, aliases: ["领克", "Lynk & Co", "领克汽车", "LynkCo"], otherNames: ["01", "03", "06", "07", "08", "09", "Z10", "Z20"] },
  "changan": { name: "长安汽车", displayTag: null, aliases: ["长安汽车", "CHANGAN", "长安", "重庆长安"], otherNames: ["长安启源", "深蓝汽车", "阿维塔", "UNI系列"] },
  "deepal": { name: "深蓝汽车", displayTag: null, aliases: ["深蓝汽车", "DEEPAL", "深蓝", "长安深蓝"], otherNames: ["S05", "S07", "S09", "L07", "L06", "G318"] },
  "avatr": { name: "阿维塔", displayTag: null, aliases: ["阿维塔", "AVATR", "阿维塔汽车", "阿维塔科技"], otherNames: ["阿维塔06", "07", "11", "12"] },
  "chery": { name: "奇瑞汽车", displayTag: null, aliases: ["奇瑞汽车", "Chery", "奇瑞", "奇瑞集团"], otherNames: ["瑞虎", "艾瑞泽", "星途", "捷途", "iCAR"] },
  "jetour": { name: "捷途汽车", displayTag: null, aliases: ["捷途汽车", "JETOUR", "捷途", "奇瑞捷途"], otherNames: ["旅行者", "山海", "自由者"] },
  "great-wall-motor": { name: "长城汽车", displayTag: null, aliases: ["长城汽车", "Great Wall Motor", "长城", "GWM"], otherNames: ["哈弗", "魏牌", "欧拉", "坦克", "长城炮"] },
  "gac-group": { name: "广汽集团", displayTag: null, aliases: ["广汽集团", "GAC Group", "广汽", "广州汽车集团"], otherNames: ["广汽传祺", "广汽埃安", "昊铂"] },
  "gac-aion": { name: "广汽埃安", displayTag: null, aliases: ["广汽埃安", "GAC AION", "埃安", "AION"], otherNames: ["AION系列", "昊铂", "霸王龙"] },
  "seres": { name: "赛力斯", displayTag: null, aliases: ["赛力斯", "SERES", "赛力斯集团", "赛力斯汽车"], otherNames: ["问界合作车型", "赛力斯超级工厂"] },
  "hima": { name: "鸿蒙智行", displayTag: null, aliases: ["鸿蒙智行", "HIMA", "华为鸿蒙智行", "鸿蒙智能汽车技术生态联盟"], otherNames: ["问界", "智界", "享界", "尊界", "尚界"] },
  "saic-motor": { name: "上汽集团", displayTag: null, aliases: ["上汽集团", "SAIC Motor", "上汽", "上海汽车集团"], otherNames: ["荣威", "名爵MG", "智己汽车", "上汽大通"] },
  "im-motors": { name: "智己汽车", displayTag: null, aliases: ["智己汽车", "IM Motors", "智己", "IM汽车"], otherNames: ["L6", "L7", "LS6", "LS7"] },
  "wuling": { name: "五菱汽车", displayTag: null, aliases: ["五菱汽车", "Wuling", "五菱", "上汽通用五菱"], otherNames: ["宏光MINIEV", "缤果", "星光", "宝骏"] },
  "hongqi": { name: "红旗", displayTag: null, aliases: ["红旗", "Hongqi", "一汽红旗", "红旗汽车"], otherNames: ["H系列", "E系列", "金葵花", "天工"] },
  "volkswagen": { name: "大众汽车", displayTag: null, aliases: ["大众汽车", "Volkswagen", "大众", "VW", "德国大众"], otherNames: ["ID.系列", "Golf", "Passat", "Tiguan"] },
  "toyota": { name: "丰田汽车", displayTag: null, aliases: ["丰田汽车", "Toyota", "丰田", "丰田中国"], otherNames: ["卡罗拉", "凯美瑞", "汉兰达", "雷凌", "bZ系列"] },
  "honda": { name: "本田汽车", displayTag: null, aliases: ["本田汽车", "Honda", "本田", "本田中国"], otherNames: ["雅阁", "思域", "CR-V", "皓影", "e:N系列"] },
  "nissan": { name: "日产汽车", displayTag: null, aliases: ["日产汽车", "Nissan", "日产", "日产中国"], otherNames: ["轩逸", "天籁", "奇骏", "N系列", "逍客"] },
  "mercedes-benz": { name: "梅赛德斯-奔驰", displayTag: null, aliases: ["梅赛德斯-奔驰", "Mercedes-Benz", "奔驰", "梅赛德斯", "Mercedes"], otherNames: ["梅赛德斯-AMG", "梅赛德斯-迈巴赫", "G级", "EQ系列"] },
  "bmw": { name: "宝马", displayTag: null, aliases: ["宝马", "BMW", "宝马汽车", "BMW Group"], otherNames: ["BMW M", "BMW i", "MINI", "X系列"] },
  "audi": { name: "奥迪", displayTag: null, aliases: ["奥迪", "Audi", "奥迪汽车", "奥迪中国"], otherNames: ["Audi Sport", "RS", "e-tron", "AUDI"] },
  "porsche": { name: "保时捷", displayTag: null, aliases: ["保时捷", "Porsche", "保时捷汽车"], otherNames: ["911", "Taycan", "Cayenne", "Macan", "Panamera"] },
  "ford": { name: "福特汽车", displayTag: null, aliases: ["福特汽车", "Ford", "福特", "福特中国"], otherNames: ["Mustang", "Bronco", "F-150", "探险者"] },
  "hyundai": { name: "现代汽车", displayTag: null, aliases: ["现代汽车", "Hyundai", "现代", "现代汽车集团"], otherNames: ["IONIQ", "N高性能", "途胜", "伊兰特"] },
  "kia": { name: "起亚", displayTag: null, aliases: ["起亚", "Kia", "起亚汽车", "KIA Motors"], otherNames: ["EV系列", "狮铂拓界", "赛图斯"] },
  "volvo-cars": { name: "沃尔沃汽车", displayTag: null, aliases: ["沃尔沃汽车", "Volvo Cars", "沃尔沃", "富豪汽车"], otherNames: ["EX系列", "XC系列", "S系列"] },
  "lexus": { name: "雷克萨斯", displayTag: null, aliases: ["雷克萨斯", "Lexus", "凌志", "雷克萨斯中国"], otherNames: ["ES", "RX", "NX", "LX", "RZ"] },
  "rivian": { name: "Rivian", displayTag: null, aliases: ["Rivian", "里维安", "Rivian Automotive"], otherNames: ["R1T", "R1S", "R2", "R3"] },
  "lucid-motors": { name: "Lucid", displayTag: null, aliases: ["Lucid", "Lucid Motors", "路西德汽车", "Lucid Group"], otherNames: ["Lucid Air", "Lucid Gravity"] },
  // 游戏（WCH-35 首批）
  "riot-games": { name: "拳头游戏", displayTag: null, aliases: ["拳头游戏", "Riot Games", "拳头", "Riot"], otherNames: ["英雄联盟", "无畏契约", "云顶之弈", "英雄联盟手游"] },
  "netease-games": { name: "网易游戏", displayTag: null, aliases: ["网易游戏", "NetEase Games", "网易游戏事业部", "网易互娱"], otherNames: ["梦幻西游", "逆水寒", "永劫无间", "阴阳师", "第五人格"] },
  "mihoyo": { name: "米哈游", displayTag: null, aliases: ["米哈游", "miHoYo", "米哈游游戏"], otherNames: ["HoYoverse（国际品牌）", "原神", "崩坏：星穹铁道", "绝区零", "崩坏3", "未定事件簿"] },
  "papergames": { name: "叠纸游戏", displayTag: null, aliases: ["叠纸游戏", "Papergames", "叠纸", "上海叠纸"], otherNames: ["恋与深空", "闪耀暖暖", "无限暖暖", "恋与制作人", "万物契约"] },
  "hypergryph": { name: "鹰角网络", displayTag: null, aliases: ["鹰角网络", "Hypergryph", "鹰角", "鹰角游戏"], otherNames: ["明日方舟", "明日方舟：终末地", "来自星尘", "泡姆泡姆"] },
  "kuro-games": { name: "库洛游戏", displayTag: null, aliases: ["库洛游戏", "KURO GAMES", "库洛", "库洛科技"], otherNames: ["鸣潮", "战双帕弥什"] },
  "game-science": { name: "游戏科学", displayTag: null, aliases: ["游戏科学", "Game Science", "游戏科学公司", "GameScience"], otherNames: ["黑神话：悟空", "黑神话系列", "战争艺术：赤潮"] },
  "xd-games": { name: "心动网络", displayTag: null, aliases: ["心动网络", "XD Games", "心动", "心动公司", "XD"], otherNames: ["TapTap", "心动小镇", "香肠派对", "火炬之光：无限"] },
  "37-interactive-entertainment": { name: "三七互娱", displayTag: null, aliases: ["三七互娱", "37 Interactive Entertainment", "37互娱"], otherNames: ["三七游戏", "37手游", "37GAMES", "寻道大千", "斗罗大陆：魂师对决"] },
  "lilith-games": { name: "莉莉丝游戏", displayTag: null, aliases: ["莉莉丝游戏", "Lilith Games", "莉莉丝", "Lilith"], otherNames: ["万国觉醒", "剑与远征", "众神派对"] },
  "perfect-world-games": { name: "完美世界游戏", displayTag: null, aliases: ["完美世界游戏", "Perfect World Games", "完美游戏", "完美世界"], otherNames: ["诛仙", "幻塔", "完美世界", "诛仙世界"] },
  "shengqu-games": { name: "盛趣游戏", displayTag: null, aliases: ["盛趣游戏", "Shengqu Games", "盛趣", "盛大游戏（旧称）"], otherNames: ["传奇", "龙之谷", "最终幻想14国服"] },
  "yoozoo-games": { name: "游族网络", displayTag: null, aliases: ["游族网络", "YOOZOO Games", "游族", "游族游戏"], otherNames: ["少年三国志", "三体游戏IP"] },
  "moonton-games": { name: "沐瞳科技", displayTag: null, aliases: ["沐瞳科技", "MOONTON Games", "沐瞳", "Moonton"], otherNames: ["Mobile Legends: Bang Bang", "决胜巅峰"] },
  "bilibili-games": { name: "哔哩哔哩游戏", displayTag: null, aliases: ["哔哩哔哩游戏", "Bilibili Games", "B站游戏", "Bilibili游戏"], otherNames: ["游戏发行", "游戏联运", "FGO国服"] },
  "valve": { name: "Valve", displayTag: null, aliases: ["Valve", "维尔福", "V社"], otherNames: ["Steam", "Counter-Strike 2", "Dota 2", "Steam Deck"] },
  "epic-games": { name: "Epic Games", displayTag: null, aliases: ["Epic Games", "Epic", "Epic游戏"], otherNames: ["堡垒之夜", "虚幻引擎", "Epic游戏商城"] },
  "blizzard-entertainment": { name: "暴雪娱乐", displayTag: null, aliases: ["暴雪娱乐", "Blizzard Entertainment", "暴雪", "Blizzard"], otherNames: ["魔兽世界", "暗黑破坏神", "守望先锋", "炉石传说"] },
  "nintendo": { name: "任天堂", displayTag: null, aliases: ["任天堂", "Nintendo", "老任", "任天堂公司"], otherNames: ["Switch", "Switch 2", "马力欧", "塞尔达传说", "宝可梦（关联IP）"] },
  "playstation": { name: "PlayStation", displayTag: null, aliases: ["PlayStation", "索尼PlayStation", "索尼互动娱乐"], otherNames: ["PS5", "PlayStation Studios", "PS Plus", "Astro Bot"] },
  "xbox": { name: "Xbox", displayTag: null, aliases: ["Xbox", "微软Xbox", "Xbox游戏业务"], otherNames: ["Xbox Series X/S", "Game Pass", "Xbox Game Studios"] },
  "ubisoft": { name: "育碧", displayTag: null, aliases: ["育碧", "Ubisoft", "育碧娱乐", "UBI"], otherNames: ["刺客信条", "孤岛惊魂", "彩虹六号"] },
  "electronic-arts": { name: "艺电", displayTag: null, aliases: ["艺电", "Electronic Arts", "EA Games"], otherNames: ["EA SPORTS", "FC", "Apex英雄", "模拟人生", "战地"] },
  "take-two-interactive": { name: "Take-Two", displayTag: null, aliases: ["Take-Two", "Take-Two Interactive", "Take Two"], otherNames: ["Rockstar Games", "2K", "Zynga"] },
  "rockstar-games": { name: "Rockstar Games", displayTag: null, aliases: ["Rockstar Games", "R星", "Rockstar"], otherNames: ["侠盗猎车手", "荒野大镖客", "GTA 6"] },
  "capcom": { name: "卡普空", displayTag: null, aliases: ["卡普空", "Capcom", "CAPCOM", "卡普空公司"], otherNames: ["生化危机", "怪物猎人", "街头霸王", "鬼泣"] },
  "sega": { name: "世嘉", displayTag: null, aliases: ["世嘉", "SEGA", "SEGA Games", "世嘉游戏"], otherNames: ["索尼克", "如龙", "人中之龙", "女神异闻录（Atlus）"] },
  "bandai-namco-entertainment": { name: "万代南梦宫娱乐", displayTag: null, aliases: ["万代南梦宫娱乐", "Bandai Namco Entertainment", "万代南梦宫", "万南"], otherNames: ["艾尔登法环（发行）", "铁拳", "吃豆人", "传说系列"] },
  "square-enix": { name: "史克威尔艾尼克斯", displayTag: null, aliases: ["史克威尔艾尼克斯", "Square Enix", "SE社", "史艾"], otherNames: ["最终幻想", "勇者斗恶龙", "王国之心"] },
  "konami": { name: "科乐美", displayTag: null, aliases: ["科乐美", "KONAMI", "Konami Digital Entertainment", "科乐美数字娱乐"], otherNames: ["合金装备", "寂静岭", "实况足球", "游戏王"] },
  "krafton": { name: "KRAFTON", displayTag: null, aliases: ["KRAFTON", "魁匠团", "蓝洞（旧关联称谓）"], otherNames: ["PUBG", "inZOI", "PUBG Studios"] },
  "fromsoftware": { name: "FromSoftware", displayTag: null, aliases: ["FromSoftware", "FS社", "From Soft"], otherNames: ["艾尔登法环", "装甲核心", "黑暗之魂"] },
  "cd-projekt": { name: "CD PROJEKT", displayTag: null, aliases: ["CD PROJEKT", "CDPR", "波兰蠢驴（俗称）"], otherNames: ["CD PROJEKT RED", "赛博朋克2077", "巫师系列"] },
  "supercell": { name: "Supercell", displayTag: null, aliases: ["Supercell", "超级细胞", "Supercell公司"], otherNames: ["部落冲突", "皇室战争", "荒野乱斗"] },
  // 影视（WCH-35 首批）
  "china-film": { name: "中国电影", displayTag: null, aliases: ["中国电影", "China Film", "中影", "中影股份", "中国电影集团"], otherNames: ["中影股份", "CINITY", "中国电影发行"] },
  "enlight-media": { name: "光线传媒", displayTag: null, aliases: ["光线传媒", "Enlight Media", "光线传媒集团"], otherNames: ["光线影业", "彩条屋影业", "哪吒系列", "动画电影"] },
  "bona-film-group": { name: "博纳影业", displayTag: null, aliases: ["博纳影业", "Bona Film Group", "博纳", "博纳电影"], otherNames: ["博纳影城", "长津湖系列", "智取威虎山"] },
  "huayi-brothers": { name: "华谊兄弟", displayTag: null, aliases: ["华谊兄弟", "Huayi Brothers", "华谊", "华谊兄弟传媒", "ST华谊（证券简称）"], otherNames: ["华谊兄弟电影", "前任系列"] },
  "huace-media": { name: "华策影视", displayTag: null, aliases: ["华策影视", "Huace Media", "华策", "华策集团"], otherNames: ["克顿传媒", "国色芳华", "去有风的地方"] },
  "linmon-media": { name: "柠萌影视", displayTag: null, aliases: ["柠萌影视", "Linmon Media", "柠萌", "柠萌影业"], otherNames: ["猎罪图鉴系列", "二十不惑系列", "问心系列"] },
  "new-classics-media": { name: "新丽传媒", displayTag: null, aliases: ["新丽传媒", "New Classics Media", "新丽", "新丽电视"], otherNames: ["庆余年系列", "赘婿", "玫瑰的故事"] },
  "daylight-entertainment": { name: "正午阳光", displayTag: null, aliases: ["正午阳光", "Daylight Entertainment", "东阳正午阳光", "正午阳光影视"], otherNames: ["琅琊榜", "山海情", "开端", "大江大河"] },
  "damai-entertainment": { name: "大麦娱乐", displayTag: null, aliases: ["大麦娱乐", "Damai Entertainment", "阿里影业（旧称）", "Alibaba Pictures", "阿里巴巴影业"], otherNames: ["淘票票", "灯塔", "阿里鱼", "大麦"] },
  "china-literature": { name: "阅文集团", displayTag: null, aliases: ["阅文集团", "China Literature", "阅文", "腾讯阅文"], otherNames: ["新丽传媒", "起点中文网", "IP影视开发"] },
  "iqiyi": { name: "爱奇艺", displayTag: null, aliases: ["爱奇艺", "iQIYI", "爱奇艺视频", "奇艺（旧称）"], otherNames: ["迷雾剧场", "恋恋剧场", "爱奇艺出品"] },
  "tencent-video": { name: "腾讯视频", displayTag: null, aliases: ["腾讯视频", "Tencent Video", "腾讯视频平台"], otherNames: ["腾讯视频出品", "极光TV", "企鹅影视（关联品牌）"] },
  "youku": { name: "优酷", displayTag: null, aliases: ["优酷", "Youku", "优酷视频", "YOUKU"], otherNames: ["优酷剧场", "优酷出品"] },
  "mango-tv": { name: "芒果TV", displayTag: null, aliases: ["芒果TV", "Mango TV", "芒果视频", "芒果TV平台"], otherNames: ["芒果TV出品", "芒果超媒", "湖南卫视（关联）"] },
  "bilibili": { name: "哔哩哔哩", displayTag: null, aliases: ["哔哩哔哩", "Bilibili", "B站", "哔哩哔哩视频"], otherNames: ["B站纪录片", "B站番剧", "B站国创"] },
  "universal-pictures": { name: "环球影业", displayTag: null, aliases: ["环球影业", "Universal Pictures", "环球电影", "环球影片"], otherNames: ["梦工厂动画", "照明娱乐", "速度与激情", "侏罗纪系列"] },
  "skydance-corporation": { name: "Skydance", displayTag: null, aliases: ["Skydance", "Skydance Corporation", "天舞", "派拉蒙天舞", "Paramount Skydance（旧称）"], otherNames: ["派拉蒙影业", "华纳兄弟", "DC Studios", "HBO", "HBO Max", "Paramount+"] },
  "sony-pictures": { name: "索尼影业", displayTag: null, aliases: ["索尼影业", "Sony Pictures", "索尼电影", "Sony Pictures Entertainment"], otherNames: ["哥伦比亚影业", "索尼动画", "Crunchyroll"] },
  "amazon-mgm-studios": { name: "亚马逊米高梅影业", displayTag: null, aliases: ["亚马逊米高梅影业", "Amazon MGM Studios", "Amazon Studios（旧称）", "米高梅", "MGM"], otherNames: ["Prime Video", "MGM", "米高梅电影IP"] },
  "apple-tv": { name: "Apple TV", displayTag: null, aliases: ["Apple TV", "Apple TV+（旧称）", "苹果流媒体"], otherNames: ["Apple Originals", "Apple TV原创剧集"] },
  "lionsgate": { name: "狮门影业", displayTag: null, aliases: ["狮门影业", "Lionsgate", "Lions Gate", "狮门电影"], otherNames: ["饥饿游戏", "疾速追杀系列"] },
  "toho": { name: "东宝", displayTag: null, aliases: ["东宝", "TOHO", "东宝电影", "东宝株式会社"], otherNames: ["哥斯拉", "东宝动画", "TOHO Animation"] },
  "studio-ghibli": { name: "吉卜力工作室", displayTag: null, aliases: ["吉卜力工作室", "Studio Ghibli", "吉卜力", "宫崎骏工作室（俗称）"], otherNames: ["龙猫", "千与千寻", "天空之城"] },
  "cj-enm": { name: "CJ ENM", displayTag: null, aliases: ["CJ ENM", "希杰娱乐", "CJ娱乐"], otherNames: ["CJ ENM Studios", "tvN", "Mnet", "电影发行"] },
  "bbc-studios": { name: "BBC Studios", displayTag: null, aliases: ["BBC Studios", "BBC工作室", "BBC影视"], otherNames: ["BBC Earth", "BBC纪录片", "英剧"] },
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
  { id: "byd", name: "比亚迪", patterns: [/比亚迪|BYD|BYD\s?Auto/i] },
  { id: "li-auto", name: "理想汽车", patterns: [/理想汽车|Li\s?Auto/i] },
  { id: "xpeng", name: "小鹏汽车", patterns: [/小鹏汽车|XPENG|Xpeng\s?Motors/i] },
  { id: "nio", name: "蔚来", patterns: [/蔚来|NIO/i] },
  { id: "leapmotor", name: "零跑汽车", patterns: [/零跑汽车|Leapmotor/i] },
  { id: "geely-auto", name: "吉利汽车", patterns: [/吉利汽车|Geely\s?Auto/i] },
  { id: "zeekr", name: "极氪", patterns: [/极氪|ZEEKR/i] },
  { id: "changan", name: "长安汽车", patterns: [/长安汽车|CHANGAN/i] },
  { id: "avatr", name: "阿维塔", patterns: [/阿维塔|AVATR/i] },
  { id: "chery", name: "奇瑞汽车", patterns: [/奇瑞汽车|Chery/i] },
  { id: "great-wall-motor", name: "长城汽车", patterns: [/长城汽车|Great\s?Wall\s?Motor/i] },
  { id: "gac-group", name: "广汽集团", patterns: [/广汽集团|GAC\s?Group/i] },
  { id: "seres", name: "赛力斯", patterns: [/赛力斯|SERES/i] },
  { id: "hima", name: "鸿蒙智行", patterns: [/鸿蒙智行|HIMA/i] },
  { id: "wuling", name: "五菱汽车", patterns: [/五菱汽车|Wuling/i] },
  { id: "volkswagen", name: "大众汽车", patterns: [/大众汽车|Volkswagen/i] },
  { id: "mercedes-benz", name: "梅赛德斯-奔驰", patterns: [/梅赛德斯-奔驰|Mercedes\-Benz|Mercedes/i] },
  { id: "bmw", name: "宝马", patterns: [/宝马|BMW|BMW\s?Group/i] },
  { id: "audi", name: "奥迪", patterns: [/奥迪|Audi/i] },
  { id: "riot-games", name: "拳头游戏", patterns: [/拳头游戏|Riot\s?Games/i] },
  { id: "netease-games", name: "网易游戏", patterns: [/网易游戏|NetEase\s?Games/i] },
  { id: "mihoyo", name: "米哈游", patterns: [/米哈游|miHoYo/i] },
  { id: "papergames", name: "叠纸游戏", patterns: [/叠纸游戏|Papergames/i] },
  { id: "hypergryph", name: "鹰角网络", patterns: [/鹰角网络|Hypergryph/i] },
  { id: "kuro-games", name: "库洛游戏", patterns: [/库洛游戏|KURO\s?GAMES/i] },
  { id: "game-science", name: "游戏科学", patterns: [/游戏科学|Game\s?Science|GameScience/i] },
  { id: "xd-games", name: "心动网络", patterns: [/心动网络|XD\s?Games/i] },
  { id: "valve", name: "Valve", patterns: [/Valve/i] },
  { id: "epic-games", name: "Epic Games", patterns: [/Epic Games|Epic\s?Games/i] },
  { id: "blizzard-entertainment", name: "暴雪娱乐", patterns: [/暴雪娱乐|Blizzard\s?Entertainment|Blizzard/i] },
  { id: "nintendo", name: "任天堂", patterns: [/任天堂|Nintendo/i] },
  { id: "playstation", name: "PlayStation", patterns: [/PlayStation/i] },
  { id: "xbox", name: "Xbox", patterns: [/Xbox/i] },
  { id: "ubisoft", name: "育碧", patterns: [/育碧|Ubisoft/i] },
  { id: "electronic-arts", name: "艺电", patterns: [/艺电|Electronic\s?Arts|EA\s?Games/i] },
  { id: "rockstar-games", name: "Rockstar Games", patterns: [/Rockstar Games|Rockstar\s?Games|Rockstar/i] },
  { id: "capcom", name: "卡普空", patterns: [/卡普空|Capcom|CAPCOM/i] },
  { id: "krafton", name: "KRAFTON", patterns: [/KRAFTON/i] },
  { id: "fromsoftware", name: "FromSoftware", patterns: [/FromSoftware|From\s?Soft/i] },
  { id: "china-film", name: "中国电影", patterns: [/中国电影|China\s?Film/i] },
  { id: "enlight-media", name: "光线传媒", patterns: [/光线传媒|Enlight\s?Media/i] },
  { id: "bona-film-group", name: "博纳影业", patterns: [/博纳影业|Bona\s?Film\s?Group/i] },
  { id: "huace-media", name: "华策影视", patterns: [/华策影视|Huace\s?Media/i] },
  { id: "new-classics-media", name: "新丽传媒", patterns: [/新丽传媒|New\s?Classics\s?Media/i] },
  { id: "damai-entertainment", name: "大麦娱乐", patterns: [/大麦娱乐|Damai\s?Entertainment|Alibaba\s?Pictures/i] },
  { id: "iqiyi", name: "爱奇艺", patterns: [/爱奇艺|iQIYI/i] },
  { id: "tencent-video", name: "腾讯视频", patterns: [/腾讯视频|Tencent\s?Video/i] },
  { id: "youku", name: "优酷", patterns: [/优酷|Youku/i] },
  { id: "mango-tv", name: "芒果TV", patterns: [/芒果TV|Mango\s?TV/i] },
  { id: "universal-pictures", name: "环球影业", patterns: [/环球影业|Universal\s?Pictures/i] },
  { id: "skydance-corporation", name: "Skydance", patterns: [/Skydance|Skydance\s?Corporation/i] },
  { id: "sony-pictures", name: "索尼影业", patterns: [/索尼影业|Sony\s?Pictures|Sony\s?Pictures\s?Entertainment/i] },
  { id: "apple-tv", name: "Apple TV", patterns: [/Apple TV|Apple\s?TV/i] },
  { id: "a24", name: "A24", patterns: [/A24|A24\s?Films/i] },
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
