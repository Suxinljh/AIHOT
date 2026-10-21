# WeChatHot 精选标注样本说明

> 用途：校准 `industry/selection.ts` 的门槛，并比较 `selection-score.md` 提示词的效果
> 对应任务：`WCH-38`
> 相关文档：`docs/selection.md`、`industry/gold.example.jsonl`

## 1. 需要多少

| 方案 | 总量 | 每类 | 用途 |
|---|---:|---:|---|
| 最低可校准 | 100–140 | 15–20 | 先跑通流程，看大致方向 |
| 建议 | 210 | 30 | 7 类各 30 条，结论更稳 |
| 更稳 | 280–350 | 40–50 | 需要比较多个模型或改多版提示词时 |

建议先做 **140 条**（每类 20 条）跑第一版，再用同一批补充到 210 条。不要一次标 500 条，先看错例再决定补什么。

每条样本的构成建议：

- 约 **50% `select`**：值得写、值得进精选。
- 约 **40% `reject`**：营销、传闻、旧闻、标题党、无关、重复。
- 约 **10% `either`**：真的两可，用于观察边界，不计入准确率。
- 开发集 / 留出集约 **70% / 30%**；调提示词只看开发集，最后用留出集验收。

## 2. 从哪里取样

从**自己实际采集到的资料**里抽，不要手工挑“标准好例子”。取样前先做两步：

1. 去掉完全重复的 URL 和同一内容的转载。
2. 每条至少保留标题、发布时间、信源名和正文（或订阅摘要/帖子全文）。只有标题、没有正文的普通文章不要放进样本；这类资料本来就不该在缺材料时评分。

每个行业至少覆盖：

| 类型 | 例子 |
|---|---|
| 官方一手 | 官网新闻、官方博客、GitHub Release、官方公众号 |
| 媒体报道 | 科技媒体、行业媒体、通讯社 |
| 社交/社区 | X、微博、论坛、开发者社区 |
| 难例 | 差一点该选、差一点不该选 |
| 噪声 | 营销稿、通稿、传闻、标题党、旧闻、拼盘、无关内容 |

不要只放官方稿。官方稿太容易判断，准确率会虚高；真正需要校准的是“媒体稿值不值得写”和“官方营销稿要不要压掉”。

## 3. 每条样本的格式

沿用现有评测脚本的 JSONL 格式，一行一条，文件放 `.data/gold.jsonl`（`.data/` 不进 Git）。

```json
{"caseId":"auto-001","material":{"title":"某车企发布新平台，首批车型四季度交付","originalTitle":null,"publishedAt":"2026-10-01T09:00:00+08:00","sourceName":"某车企官网","bodyZh":null,"bodyOriginal":"正文……"},"sourceFacts":{"sourceKind":"rss","sourceTier":"T1","firstParty":true,"language":"zh"},"samplingContext":{"benchmarkSplit":"development","samplingStratum":"auto-release"},"gold":{"decision":"select"}}
```

字段说明：

| 字段 | 必填 | 说明 |
|---|---|---|
| `caseId` | 是 | 唯一编号，建议 `<行业>-<序号>`，如 `auto-001` |
| `material.title` | 是 | 原文标题，不要改写 |
| `material.originalTitle` | 否 | 原文是外文时保留原标题 |
| `material.publishedAt` | 是 | 带时区的 ISO 时间；中文网页没有时区时按信源时区读，默认 `+08:00` |
| `material.sourceName` | 是 | 信源名称 |
| `material.bodyZh` | 二选一 | 中文正文 |
| `material.bodyOriginal` | 二选一 | 原文正文；`bodyZh` 和它至少有一个 |
| `sourceFacts.sourceKind` | 是 | `rss` / `web_list` / `json_list` / `x_search` / `mp_account` / `github` 等 |
| `sourceFacts.sourceTier` | 是 | `T1` / `T1_5` / `T2`，必须和线上信源分级一致 |
| `sourceFacts.firstParty` | 是 | 只有线上 `T1` 才能标 `true`，保持一致 |
| `sourceFacts.language` | 是 | `zh` / `en` / `ja` 等 |
| `samplingContext.benchmarkSplit` | 建议 | `development` 或 `holdout` |
| `samplingContext.samplingStratum` | 建议 | 自己的分组，如 `auto-release`、`game-rumor`，用来看错在哪类 |
| `gold.decision` | 是 | `select` / `reject` / `either` |

如果不想手写 JSON，可以用 CSV 先标，再转换成 JSONL。CSV 至少要有这些列：

```text
caseId,title,url,sourceName,sourceKind,sourceTier,firstParty,language,publishedAt,body,decision,benchmarkSplit,stratum,notes
```

`url` 和 `notes` 是给人看的，评测脚本不要求；`body` 必须真的填正文，不要只填链接。

## 4. 怎么判断 `select` / `reject`

### `select`

满足以下大部分条件：

- 有一个**新的、具体的事实**：发布、更新、价格、规格、时间、版本、合作、监管决定、技术报告。
- 对科技内容读者有信息价值，不只是“某公司发了一条动态”。
- 来源可信，或虽然来自媒体但有明确出处和可核实信息。
- 能支撑一篇资讯或洞察，而不是只能写一句“值得关注”。
- 即使不是头部公司，只要事件本身重要，也可以选。

### `reject`

典型情况：

- 纯营销：抽奖、促销、品牌联名、代言、节日海报、招聘。
- 没有新事实的通稿：只重复“行业领先”“持续创新”“赋能生态”。
- 传闻和未证实消息：只有“据传”“网传”，没有可信来源。
- 标题党、清单体、SEO 拼盘：`10 个技巧`、`一文看懂` 但没有新增信息。
- 旧闻重发、换平台重发、同一事件的重复报道（按这条资料本身判断，不要因为“已经选过另一篇”就判 reject；但如果它本身没有新信息，可以 reject）。
- 与 7 类行业无关：娱乐八卦、纯政治、纯财经行情、与科技无关的社会新闻。
- 材料不足：只有标题、只有视频播放页、正文无法读取。

### `either`

只有真的两可才标 `either`：

- 事件有信息，但价值取决于账号定位。
- 官方稿有事实，但主要是营销。
- 媒体稿有分析，但事实密度低。

不要为了“省事”把难例都标成 `either`；`either` 不进入准确率分母，标太多会让评测看起来虚高。

## 5. 7 类行业的取样重点

| 行业 | 正例重点 | 噪声重点 |
|---|---|---|
| AI 大模型 | 模型发布、版本更新、API 价格、开源权重、技术报告、重要安全事件 | 只发排行榜、提示词技巧、AI 换脸娱乐、无来源的“AGI 来了” |
| 汽车 | 官宣、预售/上市、交付、智驾技术、召回、重大合作 | 经销商优惠、车展模特、油耗软文、重复参数表 |
| 数码硬件 | 新品发布、规格价格、开售、芯片/影像/屏幕技术 | 促销、开箱无结论、配件软文、跑分互踩 |
| 软件与互联网 | 重要版本、功能更新、开源项目、平台规则、故障与安全 | 版本号+1、UI 小改、会员促销、应用推荐清单 |
| 具身智能 | 机器人产品、量产、演示、核心部件、落地部署 | 概念视频、无参数演示、融资通稿、玩具机器人 |
| 电影与剧集 | 定档、预告、上映、票房里程碑、流媒体策略、产业交易 | 明星绯闻、路透、粉丝二创、无来源票房猜测 |
| 游戏 | 官宣、发售、延期、版本更新、平台政策、重要收购 | 玩家吐槽、攻略、模组推荐、无来源爆料 |

每个行业至少放 2 条“官方营销稿”作为 hard negative，再放 2 条“媒体分析稿”作为 hard positive。这样门槛不会因为官方稿太多而偏低。

## 6. 标注流程

1. 从采集库按行业、信源等级、时间各抽一批候选，先去重。
2. 按上表配额分层抽样，生成 `caseId`。
3. 逐条读正文，先标 `select/reject/either`，再写 `samplingStratum`（可选）。
4. 标完 20–30 条先跑一次，看看有没有大量“材料不足”或“正文为空”的样本，先修样本再继续。
5. 用开发集跑：

```bash
node --env-file=.env scripts/eval-selection.ts \
  --gold .data/gold.jsonl \
  --split development \
  --label "WeChatHot 7 类第一版"
```

6. 在后台 SelectBench 看错例。先改 `industry/prompts/selection-score.md` 的标准，再动 `industry/selection.ts` 的数字。
7. 最后用留出集跑一次，确认不是只对开发集有效。

## 7. 不要做的事

- 不要用模型先标一遍再“照着改”，否则测的是模型自己的偏见。
- 不要只放头部品牌；每个行业都要有中小品牌和媒体稿。
- 不要把“同一事件已经选过”当成 reject 理由；精选评测看单条资料本身。
- 不要用运行机器的本地时区解释发布时间；统一按信源时区写进 `publishedAt`。
- 不要把样本提交到 Git；放 `.data/gold.jsonl`。
- 不要为了追求高分改门槛；先看错例属于哪一类，再改标准。

## 8. 交付方式

把标好的文件放到：

```text
.data/gold.jsonl
```

或者给我一个 CSV（列名按上面的模板），我可以转换并检查字段。最低需要 100 条，建议 140 条起，最终补到 210 条。

按每条 1–2 分钟估算，140 条约 3–5 小时，210 条约 5–8 小时。可以先标 AI 大模型和汽车两类共 40 条试跑，确认口径后再标其余五类。
