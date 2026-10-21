# WeChatHot 品牌与渠道核对

> 核对时间：2026-10-21
> 输入：`厂商.md`、`industry/topics.json`、`industry/taxonomy.ts` 的 `ENTITIES`、`industry/sources.json`
> 用途：`WCH-5` 的品牌种子、`WCH-36` 的主题与示范信源，以及后续 `wc_brands` / `wc_channels` 的初始数据

## 先说结论

原表是一份**厂商清单**，还不是可直接采集的**渠道清单**。需要补三层信息：

1. **渠道要落到可采集对象**：官网首页不能直接当信源，应优先找新闻中心、博客、Release、RSS、微博/公众号账号主页。
2. **X 和公众号必须逐一确认身份**：原表里已经出现过期、重名、个人号和抢注号；公众号显示名也不是唯一 ID，必须用极致了搜索到 `mp_id` 并确认认证主体。
3. **品牌实体要先去重**：Google/Pixel/Gemini、华为/问界、小米/小米汽车、腾讯/腾讯游戏、索尼/PlayStation 应建立父子或产品关系，不要各建一个互不关联的品牌。

## 已经发现的问题

### 官网或入口需要替换

| 原表 | 问题 | 建议 |
|---|---|---|
| `www.miacar.com` | 无法访问 | 小米汽车改用 `https://www.xiaomiev.com/` |
| `yiyan.baidu.com` | 会跳转 | 文心一言改用 `https://wenxin.baidu.com/` |
| `tongyi.aliyun.com/qianwen` | 会跳转 | 千问改用 `https://www.qianwen.com/` |
| `kimi.moonshot.cn` | 会跳转 | Kimi 改用 `https://www.kimi.com/` |
| `www.minimax.com` | 跳到国际站 | 国内主体用 `https://www.minimaxi.com/`；国际站 `https://www.minimax.io/` |
| `www.gac.com.cn` | 会跳转 | 广汽改用 `https://www.gacgroup.com/cn/news` |
| `www.nokia.com` | 是诺基亚网络，不是手机 | 手机业务已由 HMD 运营，改用 `https://www.hmd.com/` |
| `store.google.com` | 是商店，不是新闻 | 改用 `https://blog.google/products/gemini/` 或 Google 官方博客 |
| `consumer.huawei.com/cn` | 是消费者产品站 | 新闻增加 `https://www.huawei.com/cn/news`；消费者动态用 `https://consumer.huawei.com/cn/press/news/` |
| `www.samsung.com/cn` | 需要地区跳转 | 使用 `https://www.samsung.com.cn/` 和 `https://news.samsung.com/global/feed` |

### X 账号需要修正

以下按公开资料页核对，账号可能随平台改名；写入 `wc_channels` 时应保存 URL 和核对时间，不只保存 `@handle`。

| 品牌 | 原表或常见写法 | 核对结果 |
|---|---|---|
| 百度 | `@BaiduInc` | 该号是个人号；官方用 `@Baidu_Inc` |
| MiniMax | `@MiniMax__AI` | 404；官方用 `@MiniMax_AI` |
| Google Gemini | `@GoogleGemini` | 无有效资料页；官方产品号用 `@GeminiApp` |
| 小鹏汽车 | `@XPengMotors` | 该号是抢注号（简介为出售用户名）；官方全球号用 `@XPENG_Global` |
| 理想汽车 | `@LiAuto` | 该号是 Dota 个人号；未找到官方全球号 |
| 吉利汽车 | `@Geely` | 简介和粉丝数不像官方；未找到官方全球号 |
| 广汽 | `@GACMotor` | 粉丝数极少，不像官方；未找到官方全球号 |
| 奇瑞 | `@CheryAuto` | 该号是个人号；未找到官方全球号 |
| xAI | `@xAI` | 2026-10 已随公司改名为 `@SpaceXSI`（SpaceXSI，原名 xAI） |
| 字节跳动 | 空 | 官方企业号是 `@BytedanceTalk`；豆包产品号需另行确认 |
| 比亚迪 | 空 | 官方用 `@BYDCompany` |
| 华为 | 空 | 官方用 `@Huawei` |
| 小米 | 空 | 官方用 `@Xiaomi` |
| OPPO | 空 | 官方用 `@oppo` |
| vivo | 空 | 官方用 `@vivo` |
| 荣耀 | 空 | 官方用 `@Honorglobal` |
| Apple | 空 | 官方用 `@Apple` |
| 阿里巴巴 | 空 | 集团号 `@AlibabaGroup`；千问产品号另查 |
| 腾讯 | 空 | 官方用 `@TencentGlobal` |
| 智谱 | 空 | 官方用 `@ZhipuAI` |
| 百川智能 | 空 | 官方用 `@BaichuanAI` |
| 科大讯飞 | 空 | 未找到可确认的官方 X 号 |

### GitHub 组织需要区分

以下组织已用 GitHub API 核对为 `Organization`：

`openai`、`anthropics`、`google`、`meta-llama`、`mistralai`、`xai-org`、`deepseek-ai`、`MiniMax-AI`、`MoonshotAI`、`zai-org`、`baichuan-inc`、`QwenLM`、`Tencent`、`Huawei`、`Xiaomi`、`OPPO`、`vivo`、`Apple`、`Samsung`、`Nokia`、`ByteDance`、`Baidu`、`Alibaba`、`iFlytek`、`porscheofficial`。

注意：

- `honor` 是个人用户，不是荣耀官方组织；荣耀暂时不要填 GitHub。
- 比亚迪、吉利、蔚来、小鹏、理想、零跑、特斯拉等汽车品牌的同名 GitHub 账号多为个人用户或无内容，不要凭名字认定官方。
- `Nokia` 组织是诺基亚网络，不等于 HMD 手机业务。
- 特斯拉的 GitHub 组织需要登录后再确认；不要把 `tesla` 个人号当官方。

### 公众号需要二次核验

原表的公众号名称只能作为**候选显示名**，不能直接写进 `wc_channels`。原因：

- “华为终端客户服务”“小米服务”“OPPO 服务”是客服号，不是发布新闻的号。
- 同一公司可能有“集团号 / 产品号 / 客服号 / 区域号”，需要按用途选择。
- 公众号改名后显示名会变，唯一标识是 `mp_id`，不是名称。
- 需要通过极致了（Dajiala）搜索账号，确认认证主体、最近更新时间和 `mp_id`，再标记 `verified`。

建议每个品牌最多保留 1 个集团号 + 1 个核心产品号；客服号只在确实需要售后信息时添加。

## 首批建议渠道

下表优先列“能产生新闻/发布”的一手渠道；“公众号”列是候选显示名，状态仍为 `pending`。X 和 GitHub 列的 `-` 表示未确认，不是“永久没有”。

### AI 大模型

| 品牌 / 实体 | 一手渠道 | X | GitHub | 公众号候选 |
|---|---|---|---|---|
| OpenAI (`openai`) | `https://openai.com/news/` + RSS `https://openai.com/news/rss.xml` | `@OpenAI` | `openai` | 无国内官方号 |
| Anthropic (`anthropic`) | `https://www.anthropic.com/news` | `@AnthropicAI` | `anthropics` | 无国内官方号 |
| Google / Gemini (`google`) | `https://blog.google/products/gemini/` | `@GeminiApp` | `google` | 无 |
| Meta / Llama (`meta`) | `https://ai.meta.com/blog/` | `@MetaAI` | `meta-llama` | 无 |
| Microsoft / Copilot (`microsoft`) | `https://blogs.microsoft.com/` | `@Microsoft` | `microsoft` | 无 |
| xAI / SpaceXSI (`xai`) | `https://x.ai/news` | `@SpaceXSI` | `xai-org` | 无 |
| Mistral (`mistral`) | `https://mistral.ai/news/` | `@MistralAI` | `mistralai` | 无 |
| DeepSeek (`deepseek`) | `https://www.deepseek.com/` | `@deepseek_ai` | `deepseek-ai` | DeepSeek 深度求索 |
| 阿里 / 千问 (`qwen`) | `https://www.qianwen.com/` | `@AlibabaGroup` | `QwenLM` | 通义千问 |
| 字节 / 豆包 (`bytedance`) | `https://www.doubao.com/` | `@BytedanceTalk` | `ByteDance` | 豆包 |
| 腾讯 / 元宝 (`tencent`) | `https://yuanbao.tencent.com/` | `@TencentGlobal` | `Tencent` | 腾讯元宝 |
| 百度 / 文心 (`baidu`) | `https://wenxin.baidu.com/` | `@Baidu_Inc` | `Baidu` | 文心一言 |
| 科大讯飞 (`iflytek`) | `https://xinghuo.xfyun.cn/` | `-` | `iFlytek` | 讯飞星火 |
| 智谱 (`zhipu`) | `https://chatglm.cn/`、`https://z.ai/` | `@ZhipuAI` | `zai-org` | BigModel 智谱 AI |
| Kimi / 月之暗面 (`kimi`) | `https://www.kimi.com/` | `@Kimi_Moonshot` | `MoonshotAI` | Kimi 智能助手 |
| MiniMax (`minimax`) | `https://www.minimaxi.com/` | `@MiniMax_AI` | `MiniMax-AI` | MiniMax |
| 百川智能 (`baichuan`) | `https://www.baichuan-ai.com/` | `@BaichuanAI` | `baichuan-inc` | 百川智能 |

### 数码硬件

| 品牌 / 实体 | 一手渠道 | X | GitHub | 公众号候选 |
|---|---|---|---|---|
| 华为 (`huawei`) | `https://www.huawei.com/cn/news`、`https://consumer.huawei.com/cn/press/news/` | `@Huawei` | `Huawei` | 华为 / 华为终端 |
| 小米 (`xiaomi`) | `https://www.mi.com/global/discover/` | `@Xiaomi` | `Xiaomi` | 小米公司 |
| OPPO (`oppo`) | `https://www.oppo.com/en/newsroom/` | `@oppo` | `OPPO` | OPPO |
| vivo (`vivo`) | `https://www.vivo.com.cn/brand/news/list` | `@vivo` | `vivo` | vivo |
| 荣耀 (`honor`) | `https://www.honor.com/cn/news/` | `@Honorglobal` | `-` | 荣耀 HONOR |
| Apple (`apple`) | `https://www.apple.com.cn/newsroom/` + RSS `https://www.apple.com/newsroom/rss-feed.rss` | `@Apple` | `Apple` | 无 |
| Samsung (`samsung`) | `https://news.samsung.com/global/feed` | `@Samsung` | `Samsung` | 中国三星 |
| HMD / Nokia (`hmd`) | `https://www.hmd.com/` | `@NokiaMobile` | `Nokia`（网络业务） | 诺基亚手机 |
| Sony (`sony`) | `https://www.sony.com/` | `@Sony` | `sony` | 索尼 |
| NVIDIA (`nvidia`) | `https://blogs.nvidia.com/feed/` | `@nvidia` | `nvidia` | 英伟达 |
| AMD (`amd`) | `https://newsroom.amd.com/rss` | `@AMD` | `amd` | AMD |
| Intel (`intel`) | `https://newsroom.intel.com/` | `@Intel` | `intel` | 英特尔 |
| Qualcomm (`qualcomm`) | `https://www.qualcomm.com/news/releases` | `@Qualcomm` | `qualcomm` | 高通 |

### 汽车

汽车品牌通常没有可用的 GitHub 组织；不要为了“字段完整”填一个同名个人号。X 列中有 `待确认` 的，先作为候选，不要直接开启通知。

| 品牌 / 实体 | 一手渠道 | X | GitHub | 公众号候选 |
|---|---|---|---|---|
| 奇瑞 (`chery`) | `https://www.chery.cn/` | `-` | `-` | 奇瑞汽车 |
| 长安 (`changan`) | `https://www.changan.com.cn/news` | `@changanauto`（待确认） | `-` | 长安汽车 |
| 广汽 (`gac`) | `https://www.gacgroup.com/cn/news` | `-` | `-` | 广汽传祺 / AION 埃安 |
| 大众 (`volkswagen`) | `https://www.volkswagen.com.cn/` | `@volkswagen` | `-` | 大众汽车 |
| 比亚迪 (`byd`) | `https://www.byd.com/cn/news` | `@BYDCompany` | `-` | 比亚迪汽车 |
| 小米汽车 (`xiaomi` 子品牌) | `https://www.xiaomiev.com/` | `@Xiaomi` | `-` | 小米汽车 |
| 问界 / AITO (`aito`) | `https://aito.auto/` | `-` | `-` | 问界 |
| 小鹏 (`xpeng`) | `https://www.xiaopeng.com/news` | `@XPENG_Global` | `-` | 小鹏汽车 |
| 蔚来 (`nio`) | `https://www.nio.com/news` | `@NIOGlobal` | `-` | 蔚来 |
| 理想 (`lixiang`) | `https://www.lixiang.com/news.html` | `-` | `-` | 理想汽车 |
| 零跑 (`leapmotor`) | `https://www.leapmotor.com/news.html` | `@LeapmotorGlobal` | `-` | 零跑汽车 |
| 吉利 (`geely`) | `https://www.geely.com/news` | `-` | `-` | 吉利汽车 |
| 奔驰 (`mercedes`) | `https://www.mercedes-benz.com.cn/` | `@MercedesBenz` | `-` | 梅赛德斯-奔驰 |
| 宝马 (`bmw`) | `https://www.bmw.com.cn/` | `@BMW` | `-` | BMW 中国 |
| 奥迪 (`audi`) | `https://www.audichina.cn/` | `@AudiOfficial` | `-` | 奥迪中国 |
| 特斯拉 (`tesla`) | `https://www.tesla.cn/`、`https://www.tesla.com/blog` | `@Tesla` | `tesla`（待确认） | Tesla 特斯拉 |
| 丰田 (`toyota`) | `https://www.toyota.com.cn/mediacenter/` | `@Toyota`（Toyota USA） | `-` | 丰田中国 |
| 福特 (`ford`) | `https://www.ford.com.cn/news` | `@Ford` | `-` | 福特中国 |
| 现代 (`hyundai`) | `https://www.hyundai.com.cn/news/` | `@Hyundai`（Hyundai USA） | `-` | 现代汽车中国 |
| 保时捷 (`porsche`) | `https://www.porsche.cn/` | `@Porsche` | `porscheofficial` | 保时捷中国 |

### 游戏（原表缺失，建议补）

| 品牌 / 实体 | 一手渠道 | X | GitHub | 公众号候选 |
|---|---|---|---|---|
| 任天堂 (`nintendo`) | `https://www.nintendo.com/` | `@Nintendo` | `-` | 任天堂 |
| PlayStation (`playstation`) | `https://www.playstation.com/` | `@PlayStation` | `-` | PlayStation |
| Xbox (`xbox`) | `https://www.xbox.com/` | `@Xbox` | `-` | Xbox |
| 米哈游 (`mihoyo`) | `https://www.mihoyo.com/` | `@miHoYo` | `-` | 米哈游 |
| 网易游戏 (`netease-games`) | `https://game.163.com/` | `@NeteaseGames` | `-` | 网易游戏 |
| 腾讯游戏 (`tencent-games`) | `https://game.qq.com/` | `@TencentGames` | `-` | 腾讯游戏 |

### 电影与剧集（原表缺失，建议补）

| 品牌 / 实体 | 一手渠道 | X | GitHub | 公众号候选 |
|---|---|---|---|---|
| Disney (`disney`) | `https://www.disney.com/` | `@Disney` | `-` | 迪士尼 |
| Warner Bros. (`warner-bros`) | `https://www.warnerbros.com/` | `@warnerbros` | `-` | 华纳兄弟 |
| Universal Pictures (`universal`) | `https://www.universalpictures.com/` | `@UniversalPics` | `-` | 环球影业 |
| Netflix (`netflix`) | `https://www.netflix.com/` | `@netflix` | `netflix` | Netflix |
| Sony Pictures (`sony-pictures`) | `https://www.sonypictures.com/` | `@SonyPictures` | `-` | 索尼影业 |
| A24 (`a24`) | `https://a24films.com/` | `@A24` | `-` | A24 |
| 爱奇艺 (`iqiyi`) | `https://www.iqiyi.com/` | `@iQIYI` | `-` | 爱奇艺 |
| 腾讯视频 (`tencent-video`) | `https://v.qq.com/` | `-` | `-` | 腾讯视频 |

## 建议的入库规则

1. 一个 `wc_brands` 只对应一个稳定实体；产品线用 `parent_id` 或 `brand_products` 关联，不重复建品牌。
2. 一个 `wc_channels` 只对应一个可采集对象；官网首页不是渠道，新闻中心/博客/Release/账号主页才是。
3. `verification` 初始值：
   - `verified`：官网互链、平台认证或 GitHub 组织主页三者之一能证明；
   - `user`：使用者明确指定；
   - `pending`：只有名称或候选 URL；
   - `unavailable`：已确认无公开渠道或平台不可用。
4. 公众号写入前必须有 `mp_id`；只有显示名的记录保持 `pending`。
5. X 保存完整 URL 和 `checked_at`；账号改名后靠 URL 仍能追踪。
6. 不要自动把“同名 GitHub 用户”当成官方组织；至少确认 `type=Organization`、有官方仓库、官网互链。
7. 同一集团下的产品号（如 `@GeminiApp`、`@PlayStation`）可以单独成为渠道，但归属到父品牌，不单独成为顶级品牌。

## 还需要你确认的部分

- 首批是否只做上面这些品牌，还是把 `industry/topics.json` 里已有的 Microsoft、NVIDIA、AMD、Intel、Qualcomm、Sony、Unitree、Figure、Boston Dynamics、Waymo、DJI、Disney、Netflix、Warner Bros、A24、Runway 全部纳入。
- 游戏和影视领域首批关注哪 5–10 个品牌；上表只是建议。
- 每个品牌的公众号是否已有明确候选；如果没有，我可以先按“集团号 + 核心产品号”生成待核清单。
- 是否接受“X 只作为辅助渠道，公众号和官网新闻为主”的优先级。国内品牌尤其如此。
