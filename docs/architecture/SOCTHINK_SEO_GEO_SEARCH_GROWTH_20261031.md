# SOCTHINK 全站 SEO + GEO 搜索增长工程（ADR，2026-10-31）

**决策状态：已采纳；实施状态：待 P0 生产级技术审计。**
**站点**：https://socthink.cn
**代码仓库**：star8592/Kangaroo-Practice-Simulator
**上位约束**：[模块化单体与减法式治理](SOCTHINK_MODULAR_MONOLITH_20261031.md)和[工程生命周期](../engineering/ENGINEERING_OPERATING_SYSTEM.md)。
**目标市场**：中国大陆优先；同时覆盖 Google、Bing 和国际竞赛，保留国际化能力。

本文是已确认的**正式技术方案**；文档落库不等于代码已部署、站长后台已验证、生产爬虫已验收或获得了收录/排名。

## 1. 商业目标与衡量

建立“真实考试/试卷/资料 → 搜索发现与索引 → 传统搜索点击或 AI 准确引用 → 进入站点 → 阅读、练习、购买”的长期自然增长链路。

SEO 测量可抓取 URL、真实索引、关键词曝光与自然点击、有效训练和付款；GEO 测量 AI 回答中的可验证来源引用、准确率、可点击到站链接和实际引流。**不保证平台收录、排名第一或 AI 必然引用**。

禁止批量制造 AI 空文章、堆关键词、购买垃圾外链、伪造真题年份/来源/授权/成绩与引用、把平台自编卷写成官方真题、为不同搜索平台复制第二套内容事实库、伪造访问/收录报告。

## 2. 渠道与技术路线

| 优先级 | 平台 | 正式手段 | 量化方式 |
| --- | --- | --- | --- |
| P0 | 百度搜索 | 百度搜索资源平台验证、普通收录、抓取诊断、死链/流量关键词与移动体验 | 实际抓取/索引/自然点击 |
| P0 | Google 搜索、AI Overviews、AI Mode | Search Console、有效 HTML、Sitemap、内部链接、用户优先的可信内容 | 常规搜索表现和 AI 引荐 |
| P0 | Bing 与 Microsoft Copilot | Bing Webmaster Tools、Sitemap、IndexNow、AI Performance（若账号实际开放） | 索引、点击、被引用 URL/关联查询 |
| P0 | ChatGPT Search | 公共页面允许 OAI-SearchBot，稳定 URL、可访问且可靠的正文 | 可验证的引用及到站访问 |
| P1 | 豆包、DeepSeek、千问、Kimi、元宝、文心等 | 分平台核实官方机制，运行固定真实联网问题集 | 引用有无、准确性、是否带链接 |
| P2 | 搜狗、360、神马等 | 保持标准搜索可抓取；有实际流量再针对性优化 | 实际引流与转化 |

重要约束：
1. Google 官方明确：AI Overviews / AI Mode 没有独立于传统搜索的特殊技术标记要求，关键是页面可索引、可生成摘要、提供实用可信内容；不必额外制造神奇的 AI 文本文件。
2. Bing/Copilot 的 AI 检索建立在发现、抓取、索引与权威度等 SEO 基础之上；Bing AI Performance 的**引用**不代表点击。
3. 百度普通收录仅帮助加速链接发现，不能保证收录。
4. ChatGPT 的 OAI-SearchBot（搜索抓取）与 GPTBot（训练用途）是不同控制对象，可分开决定抓取权限；不因此暴露任何私有内容。
5. 不假定国内各 AI 产品都有官方“统一一键提交”接口，需逐一核实官方文档和实际可用性。

## 3. 架构决策：唯一权威源，独立只读发布投影

沿用现有 **Next.js/React**、已有考试内容及商品权威数据、现有 Web CI 和自动发布体系；**不另建 Vue 前台、SEO 微服务、独立事实数据库、第二套 CMS**。

新能力是由现有正式内容发布结果派生 **Public Search Projection（公开只读搜索投影）**：已审核、允许公开的信息生成服务端可读 HTML、目录页、详情页、页面元数据、规范 URL、Sitemap 与结构化数据。投影可以重建，不能反向写入试卷、订单和用户主数据。

流水线：

资料发现/采集（独立任务） → 来源/规则/授权核验 → 唯一正式内容源 → 公开投影与 SEO 页面 → 正式发布成功 → 平台支持的 URL 更新通知 → 独立搜索/AI 监测。

字段合同按逻辑定义，不强制增加新表：
- identity：stableId、canonicalUrl、type、status、locale；
- facts：examId/paperId/productId、officialName、year、region、grade、format、questionCount、duration；
- provenance：sourceName、可公开 sourceUrl、verifiedAt、规则适用期、rightsStatus；
- availability：官方真题/样题/自编、答案有无、真实可用的训练/下载/购买入口；
- publication：publishedAt、substantiveUpdatedAt、indexable、visibility。

**绝不可进入公开投影**：个人身份及学习画像、考试答案、订单/支付数据、密钥、未授权 PDF、无权公开的付费交付文件。robots.txt 只是抓取提示，不是鉴权；服务端仍须严守权限。

外部平台暂时不可用、通知失败、GEO 评测失败均只记录独立可重试异常，不阻止用户训练、支付或正常 Web 发布；不增设跨模块锁、无关门禁及重复调度。

## 4. URL 与可索引内容信息架构

以下是建议 URL 示意，**不代表当前生产已有这些路由**；正式实施先审计现存路由，能复用旧 URL 就不迁移。

| 页面类型 | 候选 URL | 用户需求 |
| --- | --- | --- |
| 考试专题 | /exams/{exam-slug} | 考试简介、官方规则、参赛对象 |
| 年度专题 | /exams/{exam-slug}/{year} | 特定年度安排和版本变化 |
| 试卷详情 | /papers/{verified-paper-id} | 特定年份年级试卷、答案有无及练习 |
| 资料专题 | /resources/{topic} | 各类真题、样题、资料目录 |
| 规则指南 | /guides/{topic} | 有出处的规则解释、备考指引 |
| 商品详情 | 继续用现有有效商品路径 | 真实目录、格式、价格、交付说明 |
| 在线训练 | 继续用现有训练路径 | 可立即开始的练习/测评 |

内部链接形成“首页/栏目 → 考试 → 年度 → 试卷/资料 → 练习或购买”；普通 HTML 链接必须可遍历，不能只依赖站内 JS 搜索框。

使用 Next.js SSR/SSG 或现有服务端 HTML 渲染，让爬虫无需完整 JS 执行就能读取标题、主要正文与链接。每页真实且唯一的 Title、H1、Meta Description、资料属性、官方出处、实质更新时间、可用动作及相关推荐。官方原卷、官方样题、自编卷严格分类，不混写。

旧路由若必须改变，使用 301/308、canonical、内部链接/Sitemap 同步更新，不能全站旧链接随意跳首页。

## 5. 技术 SEO 审计清单及验收标准

| 项目 | 验收 |
| --- | --- |
| HTTP/TLS | 有效页正确返回 200；缺失/删除返回 404/410；无假 404、无死循环跳转 |
| robots/CDN/WAF | 公开网页允许目标搜索爬虫；受保护内容经服务端鉴权仍不可访问 |
| Sitemap | 仅含发布成功、canonical、可索引、实际 200 的 URL；lastmod 表示真实实质改动 |
| Canonical | 一份内容一个首选 URL；筛选、排序、跟踪参数不制造大量重复索引 |
| 元信息和正文 | Title/H1/摘要准确且不机械重复；非登录访客的原始 HTML 能读到主要文字 |
| 内部链接 | 目录到详情到实际训练/购买均有标准可爬取链接 |
| Structured data | 使用现阶段受支持且适合的 Organization、BreadcrumbList、Article/Product 等；属性与可见正文一致 |
| 移动性能 | 检查安卓、苹果 Safari/iPad、实际加载和 Core Web Vitals；避免布局/交互故障 |
| 国际化 | 中文优先；仅真实独立英文版使用 hreflang，不能大量机器伪翻译 |
| 内容版权和安全 | 未授权原卷、答案、个人数据、订单、密钥均无公开索引和缓存泄漏 |
| 搜索分析 | 监测真实抓取、索引错误、曝光、点击、AI 引用及付费漏斗 |

官方注意事项：Google 于 2026-01 取消 Practice Problem 结构化数据在搜索富结果中的支持，旧教程不可照搬；Google Indexing API 仅适用于规定的 JobPosting 或 VideoObject 内 BroadcastEvent 直播页面，**禁止拿普通资料/考试页滥用**；IndexNow 提交也不代表收录保证。llms.txt 等实验性文件不是 P0 核心交付，更不能另造内容权威副本。

## 6. GEO：使内容能够被检索、核实与引用

优先建设三类长期可信资产：
1. **考试知识档案**：正式名称、组织、地区与年级、最新赛制、年份、官方原始来源、更新时间；
2. **真实资源档案**：真题/样题/自编属性、年份、题量/语言、答案可用状态、权利边界、真实行动入口；
3. **平台原创研究**：在拥有合法、足量、匿名数据时，发布方法透明的错因/难度/学习效率分析；没有真实数据不虚构统计。

页面组织以解决问题为先：清楚短结论、严谨标题与表格、出处链接、适用时间、可访问的说明。核心不在于给 AI 堆专用关键词，而在于提供独特且可信的事实。

建立固定问题集（初始 30–50 个，经审核后投入）：例如不同年度考试规则、真题有无、线上模拟入口、资料下载、费用/交付。记录平台/是否联网/日期/查询原文/出现的品牌与 URL/引用是否准确/是否可点击/实际引荐点击。

Bing AI Performance 仅在后台真实有数据时读取引用、URL 和 grounding queries；其他 AI 产品可做明确标为抽样的重复实测。**不能把一次 AI 回答视为排名保证，更不能把 AI 引用次数算作自然访问量。**

## 7. 内容优先顺序

中国市场优先，既有真实训练能力优先：

1. 数学计算及已上线国际数学竞赛，实际有卷可练的资源；
2. 小升初、期中期末、国内升学相关资料，在完成来源和权利核验后发布；
3. 雅思/托福/考研/公考的最新官方规则与可用资料；
4. 职业技能与综合能力测评等已有真实服务能力的方向。

考试资料近期三年优先，规则以最新当届公告为准；未来年度未公布的规则和试卷只可标注待发布，不能冒充已存在。

**首批 30–50 个高价值页面是候选范围，不是必须制造相应数量的空页面。** 先做可核验、可交付、具有真实搜索需求的专题、年度、卷页和产品页。

独立小时采集任务只负责上游供给；没有经过正式资料核验及权利确认的采集结果，不可直接公开、索引或出售。来源采集失败不冻结网站发布。

## 8. 站长工具及通知接入

- 百度：检查真实站点验证、配额、普通收录与抓取诊断，记录接口状态和回执；
- Google：确认 Search Console，提交 Sitemap，采用 URL Inspection 抽样确认状态，不把提交数量作为索引数量；
- Bing：确认 Bing Webmaster，按发布变化使用 IndexNow（支持时）及 Sitemap，并核查 AI Performance 是否提供数据；
- ChatGPT：核实 OAI-SearchBot 的 robots 与 CDN 访问；GPTBot 训练权限单独决定；
- 国内其他 AI：逐一核对当前官方开放文档和可测的搜索抓取情况。

API 凭据仅保留受保护环境，不上传 Git；发布完成后再触发更新通知，按 URL 去重、限速、失败重试并留回执，用户请求和支付链不等待提交成功。

## 9. KPI 看板与每周复盘

- 技术：已发布可索引 URL 数、索引比例、Sitemap/robots 状态、4xx/5xx、规范化与移动问题；
- SEO：百度/Google/Bing 分平台曝光、CTR、自然点击、实际已索引、关键词和着陆页；
- GEO：真实 AI 引用、可点击引用 URL、引用准确率、查询样本覆盖、官方/人工样本标记；
- 商业：自然流量及 AI 引荐到站 → 查资料 → 开始练习 → 有效使用 → 商品详情 → 支付成功。

所有指标首先建立 baseline，未知写 UNKNOWN，不能填 0 或编造已取得的增长。避免把直接流量误算为 AI 引流；监测应尊重隐私和合法数据处理要求。

每周产出：本周有效页面增量、收录与自然流量变化、AI 引用变化、用户转化、重大异常、接下来最值得修复/建设的页面清单。对搜索运营失败单独报警，不阻断无关开发。

## 10. 四阶段实施方案

### P0：真实技术审计（先做，禁止猜测）
- [ ] 盘点全部公网路由、目录、详情页、旧 URL 和独立公开入口；
- [ ] 实际 HTTP/HTML 测试 robots、sitemap、状态码、重定向、meta robots、canonical、SSR HTML、内部链接；
- [ ] 安卓与 iPad/Safari 测试；检查 CDN/WAF 是否拦截目标爬虫；
- [ ] 核实站长账号验证状态、已有流量/索引、提交配额；
- [ ] 形成带实测证据的 P0/P1/P2 问题清单与真实 baseline。

### P1：打通稳定收录基础设施
- [ ] 修复已证明的抓取/渲染/索引问题，不改变业务核心；
- [ ] 统一只读公开投影、服务器可读页面、规范链接、导航、Sitemap、适用结构化数据；
- [ ] 接入已获官方授权的站长工具及更新提交；
- [ ] 真实浏览器、手机、爬虫模拟、身份与资源权限测试，CI/生产 SHA/自动回退真实验收。

### P2：首批优质内容与商业入口
- [ ] 挑选来源清晰、内容有效的 30–50 个候选专题/详情，不凑数量；
- [ ] 逐页确认题卷类别、年份、规则、版权/公开范围、行动入口；
- [ ] 上线后收集真实收录/点击和训练/购买表现；
- [ ] 清理已明确过时的重复实现及错误链接，不保留多套主路径。

### P3：AI 引用分析与持续增长
- [ ] 上线固定 AI 查询集及可追踪引用记录；
- [ ] 接通实际存在的 AI 引用报表与 SEO/购买归因；
- [ ] 根据周报迭代高效页面和内容，随官方规则更新重新核查。

**首轮 30 天用于建立技术能力、真实首批页面和度量基线；不是 30 天流量/排名承诺。**

## 11. 发布治理与状态报告

遵循现有单一 GitHub main → CI → 正式自动部署 → 公网精确 SHA 验证/自动回退；不制造额外独立发布器、无关质量门禁、相互等待的模块。SEO 观察读链与财务、考试、登录权限写链完全解耦。

交付时逐步区分 PLANNED / IN PROGRESS / LOCALLY VERIFIED / CI VERIFIED / DEPLOYED / PUBLICLY VERIFIED。文档写入仓库不等于生产服务已生效；具体代码改造需单独取得真实测试与公网证据。

## 12. 官方依据（2026-10-31 核验）

- Google AI features：https://developers.google.com/search/docs/appearance/ai-features?hl=zh-cn
- Google Crawl & Index：https://developers.google.com/search/docs/crawling-indexing
- Google 官方更新（Practice Problem）：https://developers.google.com/search/updates
- Google Indexing API 范围：https://developers.google.com/search/apis/indexing-api/v3/using-api
- 百度搜索资源平台：https://ziyuan.baidu.com/doc/
- 百度普通收录：https://ziyuan.baidu.com/linksubmit
- Bing Webmaster Guidelines：https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a
- Bing IndexNow：https://www.bing.com/webmasters/help/indexnow-0z209wby
- Bing AI Performance：https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c
- OpenAI Crawlers：https://developers.openai.com/api/docs/bots

**审计边界**：官方资料和工程架构已查核；此次文档保存任务尚未完成生产系统级审计、实际平台接入、代码部署或收录证明。
