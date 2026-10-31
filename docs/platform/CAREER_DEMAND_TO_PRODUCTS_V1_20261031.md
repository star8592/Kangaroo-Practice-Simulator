# SOC THINK 职业招聘需求反推训练商品：2026-10-31 首轮基线

**日期**：2026-10-31。**状态**：官方公开资料初样本已核对；以下 SKU 是待开发产品，不代表已经上架、可以付款或已取得企业授权。

**架构归属**：沿用 [超级考试与综合测评平台 ADR-001](./SUPER_ASSESSMENT_PLATFORM_ADR001.md) 中的 `career` 业务线及统一的 Catalog / Question / Blueprint / Attempt / Grade / Report / Sandbox / Order / Entitlement。禁止另造一套用户、支付、题库、考试、交付服务。

## 1. 商业产品原则

反向需求链：**招聘企业 → 真实 JD → 明确技能与评估环节 → 原创考试蓝图 → 题目/场景/可执行实验 → 可出售教程及训练 → 完考/复测/付费反馈**。

区分三种主张：
- **官方确认**：引用能核查的招聘职位或流程原始页面；保留来源和核查日期。
- **平台推导**：根据岗位所需技能设计原创的训练任务；不可称“企业实际考试就是这套题”。
- **未知**：不掌握考试题数/时长/原卷/通过率/录用规则时保留未知，绝不猜测或编造“内部真题”。

**范围**：第一市场为中国大陆校招与早期社招；先做跨岗位复用度高、可以自动判分的 SQL、Python、后端工程与 AI 应用，再拓展商业分析、产品、供应链、硬件和科研方向。岗位信息以 2026/2027 的公开招聘为主，滚动更新，不以老旧题库冒充现行笔试。

## 2. 有来源的首批大厂岗位事实与产品推导

| 企业/官方出处 | 核实到的招聘需求或流程 | SOC THINK 原创训练方向 |
|---|---|---|
| [美团 AI应用开发工程师（应届）](https://zhaopin.meituan.com/web/position/detail?highlightType=campus&jobShareType=1&jobUnionId=4694862735) | Python/Go/Java/TS、数据库与 API、RAG、Agent、MCP 等 | AI应用实操、工具调用、RAG 检索、后端故障定位 |
| [美团 商业分析师 BA/DS（应届）](https://zhaopin.meituan.com/web/position/detail?highlightType=campus&jobUnionId=4697298860) | 商业分析、实验设计、数据洞察；AI工具/Text-to-SQL/Agent 经验加分 | SQL 经营分析、业务实验与数据论证、AI+分析工作样本 |
| [美团 产品经理（应届）](https://zhaopin.meituan.com/web/position/detail?jobUnionId=4697314739) | 逻辑、系统分析、数据敏感、复杂问题拆解，AI产品经验优先 | 需求优先级、PRD、产品决策 Case 面试 |
| [京东 数据科学家（2026-09-09）](https://zhaopin.jd.com/web/job-info-detail?requementId=224411) | SQL、Python/R、实验设计、A/B测试、因果推断、AI/Agent | 数据清洗、因果与实验评估、指标解释 |
| [京东 商业分析岗（2026-09-02）](https://zhaopin.jd.com/web/job-info-detail?requementId=223848) | SQL、经营分析、指标框架、业务策略 | 业务指标与 SQL 模拟、书面建议书 |
| [小米 2027校招岗位列表](https://xiaomi.jobs.f.mioffice.cn/campus/?current=14&limit=10) | 大数据研发涵盖 ETL、仓库建模、数据质量；Agent 基础架构涵盖 Sandbox、Trace、MCP | ETL/数据质量实验；Agent 安全隔离和排障 |
| [小米 2027校招岗位列表](https://xiaomi.jobs.f.mioffice.cn/campus/m/position/list) | 供应链数据与供应商管理、汽车质量测试、硬件可靠性/DOE/DFMEA | 采购与物流 KPI、测试用例、可靠性案例 |
| [小米 显示算法工程师](https://xiaomi.jobs.f.mioffice.cn/campus/position/7671293856755943716/detail) | C++或Python、图像处理、色彩相关项目 | 数字图像算法编码与结果解释 |
| [百度 2027校招岗位列表](https://talent.baidu.com/jobs/list?recommendCode=ISK4BS) | 后端开发包括架构、AI接入、稳定性与性能；网络研发包括 CDN/DNS/流量调度 | 服务端/网络基础专项、可复现排障实验 |
| [字节跳动 Seed 2027 大模型校招](https://seed.bytedance.com/zh/seedearlycareer) | 岗位覆盖基础模型、视觉、语音、ML系统等；官方表示一般 3–5 轮技术面+1轮 HR，依人和岗位变化 | 研究方法、模型评估、工程实验、分轮模拟面试 |
| [阿里 2027校招](https://campus-talent.alibaba.com/campus/index) 与 [官方流程](https://talent-holding.alibaba.com/campus/notice?tab=delivery) | 研发、算法、芯片、产品、游戏、运营、商务；岗位不同，可能有在线测评与编程笔试 | 按岗位族建立不同 Blueprint，不造“阿里统一卷” |
| [华为 2027校招](https://career.huawei.com/cn/campus-recruitment) 与 [官方流程FAQ](https://career.huawei.com/reccampportal/portal5/faq.html) | 研发岗位需上机及综合测评；部分非研发岗位需语言测评；面试包含专业与业务主管环节 | 编程机考训练、项目答辩、职业语言模拟 |
| [腾讯 官方招聘流程](https://careers.tencent.com/jobopportunity.html) | 专业初试、复试和 HR 面试；复试轮次随岗位调整 | 分阶段模拟问答训练，未取得具体卷型不得宣称 |
| [京东 官网热招](https://zhaopin.jd.com/home?cooperationId=2) | 可见研发、产品、零售/物流、客户经理等非研发岗位 | 将运营与商科训练纳入职业产品线，而非只有程序员题库 |

**样本解释**：这是有来源的*非随机岗位例证*，不是完整爬虫数据库，也不是官方统计的岗位量/薪资/录用数据。具体岗位是否仍开放须按使用当天重新核实。不同企业的招聘流程不能混为一套“大厂通用真题”。

## 3. 首批产品矩阵：卖什么、怎么交付

| 内部 SKU | 面向岗位 | 顾客实际获得的内容 | 优先 |
|---|---|---|---|
| CAREER-SQL-01 | 数据分析、运营、商业分析、产品 | 10题免费摸底；60分钟在线 SQL 考试；完整解析与错因、复测 | P0 |
| CAREER-DATA-02 | 数据科学、数据分析 | Python/Pandas 数据清洗 + 统计/可视化 + 商业结论；可运行判分 | P0 |
| CAREER-AGENT-03 | AI应用、AI工程、Agent开发 | RAG、API工具调用、错误处理、Trace 的真实浏览器实验 | P0 |
| CAREER-BACKEND-04 | Java/Go/Python 后端 | 编程任务、数据库/缓存/幂等、服务故障模拟、案例讲解 | P0 |
| CAREER-BA-05 | 商业分析、产品、策略运营 | 业务 Case、指标设计、实验假设、PRD/答辩评分与讲解 | P0 |
| CAREER-INTERVIEW-06 | 校招/社招通用 | 录音/文字模拟面试：项目追问、技术表达、HR环节与可改进建议 | P1 |
| CAREER-DW-07 | 大数据研发 | 星型模型、ETL、数据质量、慢查询诊断在线实验 | P1 |
| CAREER-QA-08 | 测试开发 | 写测试案例、接口自动化、Bug复现与日志定位 | P1 |
| CAREER-PM-09 | 产品经理 | PRD、用户分层、增长指标与 A/B 测试项目包 | P1 |
| CAREER-SUPPLY-10 | 采购、物流、供应链运营 | 交付/库存/供应商指标的电子表格或 SQL 实操与案例面试 | P1 |
| CAREER-HARDWARE-11 | 嵌入式/汽车/硬件测试 | C/C++基础、DFMEA/DOE、质量测试诊断案例 | P2 |
| CAREER-RESEARCH-12 | 大模型算法/研究 | 实验复现、评估误差分析、研究方案答辩；不冒充研究岗正式笔试 | P2 |

**可售单元形态**：①电子讲义/微教程；②在线限时模拟笔试；③浏览器可运行实操项目；④情景模拟面试；⑤岗位能力报告与针对性补弱。由同一知识点/题目仓库映射不同 SKU；商品必须真实有交付物才能展示“购买”。

**建议价格仅是 A/B 测试候选，不是现售价格**：讲义/专项小包 ¥2.9–9.9；完整模拟 ¥9.9–29.9；沙箱实验及可验证反馈 ¥19.9–49.9。以用户真实意愿、答题完成率、沙箱/LLM成本与支付成功为准。

## 4. 优先上线的三套完整考试/实验蓝图

### SQL 商业分析（第一个闭环）
构造有版本号的合成订单、用户、渠道、退款、营销费用数据。一个完整考试包含：基础查询、JOIN、窗口函数、漏斗/留存、指标口径与一份简短商业解释。SQL 必须在隔离数据库**实际执行**，隐藏测试数据比较结果集（不是只比字符串），给出确定性得分和可复测错因。考试提交、计时、报告、已购权益共享平台协议。

### AI Agent 工程实验
构造一个模拟客服/知识库业务。候选人通过在线编辑器完成检索、工具调用、失败恢复、权限约束与可观测性要求。隔离容器限时/限资源，不能连接生产密钥或生产网络；自动评分来自真实执行、边界测试及成本，AI只辅助解释。失败任务提供明确错误，不以模型自称成功代替回执。

### 业务产品 Case
提供合成真实感经营数据与用户需求摘要。考生进行问题定义→指标→实验→方案权衡→PRD概要。计算题确定性判分，开放性部分使用公开 rubric 和置信度标注的 AI 辅助评价；可进行复测与改写。

## 5. 最简采集、更新与质量闭环

```text
官方招聘站 / 公开大学就业公告 / 合规招聘聚合入口
     ↓ 来源 URL + 抓取/观察时间 + 内容哈希 + 证据等级
去重职位快照 → 必需/加分技能词典 → 岗位/技能图谱
     ↓
商品优先级（跨岗位复用 × 实操可判分 × 用户意向 ÷ 单次交付成本）
     ↓
原创题目/数据集/rubric/教程/隔离沙箱 → 统一考试底座
     ↓
真实免费样题 → 完考 → 付费试购/交付 → 复测与经营反馈
```

岗位最小字段：`company, posting_id?, title, career_stage, location?, source_url, source_kind, published_at?, seen_at, content_hash?, required_skills[], preferred_skills[], process_notes?, verification_status`。

采集纪律：官方招聘网站优先；只在站点允许的范围及适用法规内读取公开信息、合理限速与缓存；不绕过登录、验证码、反爬限制，不下载简历等个人资料，不搬运受版权保护的面试题库或私密泄题。招聘公告仅用于能力分析，商品内容全部原创或经许可。对公开职位需求可摘要并指向原始链接，不把岗位原文整库售卖。

每份考试/商品至少包含 `original_source_basis`、`skill_ids`、`question/asset_version`、`rubric_version`、`delivery_manifest`、`rights_review`、`actual_execution_receipt`。岗位详情页显示来源与更新日期，不能用“华为真题”“官方内推”“包过”“保offer”等未获证据授权的营销文案。

**运营指标**：去重且可追溯的有效 JD 数 / 站点覆盖 / 更新时间；技能跨公司重复出现的岗位样本数（非市场占比）；原创已通过测试题数；免费开启→完考→复测→支付→交付漏斗；每笔 AI/沙箱/OCR 成本与实际毛贡献。

## 6. 状态与下一步

- **已完成**：第一轮多家大厂官方公开岗位与流程的证据核对、SKU矩阵和前三项考试/实验的产品蓝图。此文件属调研设计，不是代码部署验收。
- **未完成**：规模化 JD 合规抓取、自动去重刷新、正式技能库导入、SQL 在线执行、Agent 隔离沙箱、真实考试答题 UI、真实 SKU 上架及微信支付交易验证。
- **开发次序**：先接入结构化岗位记录和通用技能字典，再把 SQL 原创数据集+判分器做成一条实际可运行的 `catalog → start → submit → score → report → retest` 路径；通过后复用同一底座接 AI Agent 和产品 Case。
- **发布验收**：不动现有数学竞赛与支付路径；新业务不得显示虚假库存、空卷或虚构订单。验收通过后才更新“可购买/已上线”状态。


## 7. 招聘平台采集边界：2026-10-31 额外核查

**「公开可搜索」不等于「可批量爬取并商业使用」**。特别要按平台单独识别：
- [BOSS直聘用户协议](https://www.zhipin.com/web/common/protocol/protocol-2019-09-30.html) 对未经许可借助爬虫、插件等非法获取平台信息及商业使用有限制；不得把绕过反爬当作数据策略。
- [国家大学生就业服务平台用户协议](https://job.ncss.cn/student/connectUser.html) 明确限制商业用途，不能把其职位数据直接当商品原材料批量搬运。
- [人社部门等五部门有关招聘信息规范的通知](https://rsj.gz.gov.cn/ywzt/ldgx/ldlscjg/glfw/content/post_10782885.html) 对经营性招聘服务及以就业指导、测评等形式变相发布招聘信息作了规制。本站应清晰定位为**独立的原创职业训练与能力测评**，不经营招聘信息发布、收简历代投或宣传付费保录。

因此第一阶段**不对 BOSS/其他有访问限制的招聘平台开展未授权自动爬取**；以企业可公开核查的职位介绍、获许可的数据接口、经企业授权的职位数据与自主原创技能内容为主。职位素材的“分析依据”和能够公开售卖的“原创测评产品”必须分开管理。
