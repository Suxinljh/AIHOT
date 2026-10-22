# WeChatHot

**面向微信公众号科技内容创作者的单用户 AI 内容工作台。**

从一个热点链接开始，到一篇可以粘进公众号的稿子结束：找热点、判断值不值得写、生成角度和大纲、写正文和标题、逐项核对事实、排版、导出公众号兼容的富文本。不做注册、团队和协作——管理员会话就是唯一使用者。

覆盖 7 个行业：AI 大模型、汽车、数码硬件、软件与互联网、具身智能、电影与剧集、游戏。

> 状态：开发中。公开阅读站已下线，`/` 只跳转到 `/studio`；对外只有工作台、后台和健康检查。

---

## 它解决什么问题

公众号科技编辑的日常是断开的：在十几个信源里翻热点，用聊天窗口判断值不值得写，在文档里写稿，再手工排版粘进公众号。每一步都换一个工具，判断依据留不下来，写完也复盘不了。

WeChatHot 把这条链路收进一个工作台：

```
信源采集 → 预筛与评分 → 事件归组 → 热点列表 → 选题 → 角度 / 大纲 → 正文 / 标题
        → 审核清单 → 排版预设 → 公众号 HTML / Markdown → 复制
```

每一段都留下可回看的记录：为什么推荐、引用了哪篇报道、哪一段是官方说法、哪一句还没核实、这一篇花了多少模型成本。

## 能做什么

- **热点发现**：按行业、品牌、渠道、来源等级、已读状态筛选；五种排序，热度、新闻价值、选题推荐三套分数并列。
- **事件详情**：时间线、事实、报道与评分理由，编辑自己的已读 / 收藏 / 忽略 / 跟进状态。
- **选题看板**：选题冻结事件证据；角度、栏目、备注、状态沿流水线流转；可排计划日期。
- **写作**：角度候选、大纲、正文、标题候选；写作风格预设按栏目或单篇覆盖。
- **审核**：生成事实 / 数字 / 日期 / 来源 / 夸大表述清单，逐项确认、修改或忽略，结果单独存储，不改正文。
- **排版与交付**：内容 / 排版 / 公众号 / Markdown 四视图；字号、行高、段距、对齐、图片圆角；白名单标签 + inline style 生成公众号兼容 HTML，支持富文本、纯文本、Markdown 复制与下载。
- **信源与品牌**：RSS、网页列表、JSON、X、公众号、外部推送、GitHub API 七类信源；品牌库、别名、渠道、关注规则与站内通知。
- **指标**：选题采纳率、草稿完成率、人工改写率、单篇模型成本、每百条采集成本。
- **发布日历**：选题和稿件按计划日排布，只做计划，不自动发布。

## 技术栈

- **Web**：React Router 8（SSR）、TipTap 3、Tailwind 4
- **API**：Fastify
- **数据库**：PostgreSQL 17
- **任务**：pg-boss（采集、模型调用、事件投影、告警）
- **模型**：按步骤配置（预筛、评分、理解、写作、审核、翻译……），统一走回执与预算熔断
- **测试**：Node test runner，600+ 自动化测试

### 架构

```
apps/web      React Router 页面（工作台 / 后台），只通过 HTTP 读 API
apps/api      Fastify：/api/studio、/api/admin、/api/ingest、/api/health
apps/worker   pg-boss 定时任务：采集、模型流水线、事件投影、通知
packages/     backend（业务）、contracts（共享类型）、web（组件）
modules/      wechathot：工作台私有表、API、页面、测试
industry/     7 类行业的知识：分类、主题、示范信源、提示词、门槛
site/         站名、模型选择、品牌、启用哪些模块
```

关键设计：

- **事件读模型**：采集与分析写入公开事件表，工作台读 `wc_event_meta`，不直接对事件表做多表筛选。
- **私有数据隔离**：所有 `wc_` 表只通过管理员会话读取，不进入任何公开出口。
- **付费请求可回放**：每个模型调用先记回执，失败重试复用已付过的结果；每个服务有预算上限。
- **公众号兼容**：序列化只输出基础标签，样式写 inline，`sanitize-html` 兜底去脚本、事件属性和未知样式，图片限制在正文宽度内。

## 本地运行

需要 Node.js 24、PostgreSQL 17。

```bash
git clone https://github.com/Suxinljh/WeChatHot.git
cd WeChatHot
npm install

cp .env.example .env        # 或 node scripts/init-env.ts --llm-key <key>
# 至少填：DATABASE_URL、SESSION_SECRET、ADMIN_PASSWORD、LLM_API_KEY

npm run db:migrate
npm run seed:wechathot      # 7 类品牌、写作与排版预设

npm run dev:api             # http://127.0.0.1:3001
npm run dev:web             # http://127.0.0.1:3000
npm run dev:worker          # 需要采集/投影/通知时再开
```

打开 http://127.0.0.1:3000 ，用 `ADMIN_PASSWORD` 登录，进入 `/studio`。

安全阀默认关闭：`COLLECT_ENABLED=false`、`MODEL_CALLS_ENABLED=false`。只想看界面时保持关闭；要真正采集和调用模型再打开。后台在 `/admin`。

## 测试

```bash
npm run typecheck
npm test                                                     # 需要 *_test 或 *_ci 结尾的数据库
npm run build -w @aihot/web && node --test apps/web/tests/*.test.ts
node scripts/smoke.ts --base http://localhost:3000           # 站点跑起来后
```

`npm test` 会给每个测试文件复制一份数据库并并行运行，账号需要有建库权限。测试不访问外部服务，模型和付费接口由本地假服务回答。

## 目录

| 路径 | 内容 |
|---|---|
| `modules/wechathot/` | 工作台产品代码：事件、品牌、选题、写作、审核、导出、通知、指标 |
| `modules/wechathot/web/` | 工作台页面：热点、事件、选题、文章、信源、品牌、日历、指标、设置 |
| `industry/` | 分类、主题、示范信源、提示词、入选门槛 |
| `site/` | 站名、每一步用哪个模型、品牌与启用模块 |
| `database/migrations/` | 引擎迁移；模块自己的迁移在 `modules/*/migrations/` |
| `docs/` | 架构、部署、信源、选择标准、WeChatHot 产品文档 |

## 文档

- [产品需求](docs/WeChatHot/PRD.md)
- [架构](docs/architecture.md)
- [部署](docs/deploy.md)
- [信源](docs/sources.md)
- [选择标准](docs/selection.md)
- [行业名录模板](docs/WeChatHot/industry-seed-template.md) · [已收录品牌库](docs/WeChatHot/industry-seed.md)
- [公众号粘贴验收清单](docs/WeChatHot/wechat-paste-checklist.md)

## 边界

- 单用户：不设计注册、团队、权限和协作。
- 不自动发布到公众号：只生成可粘贴的富文本，发布仍在公众号后台手动完成。
- 图片默认存在部署机本地磁盘（`.data/uploads`），公众号访问不到时需要手动上传。
- 公开阅读站、RSS、API v1、MCP 和站点地图已下线。

## 许可与来源

MIT。引擎框架改造自 [AIHOT](https://github.com/KKKKhazix/AIHOT)（MIT），产品和界面已按 WeChatHot 重做。
