# SOCTHINK 跨帖测评：提议与实际上线清单

核查日：2026-11-02。核查时正式线上版本 aa28d7e30a188c9517d4c1518dfa84c64f5bff8f，/api/release 与服务器一致。追踪：职业能力 Issue #238；心理测量 Issue #213；付费交付 Issue #243。

## 已经上线：有正式入口、真实题库及评分/执行器
| 类型 | 状态 | 真实范围 | 公开入口 |
|---|---|---|---|
| RIASEC职业兴趣 | 免费研究试测 | 原创30题、六维，非O*NET官方量表，无本土常模 | /assessment-center/career-interest-exploration-30 |
| IPIP大五人格 | 免费研究试测 | 中文研究译稿50题、五维，中文信效度尚未验证 | /assessment-center/ipip-big-five-50-cn-preview |
| 数量/逻辑/空间/信息推理 | 免费练习 | 原创20题、四组各5题，非IQ标准测验 | /assessment-center/reasoning-practice-20 |
| 招聘通用能力 | 免费完整模拟 | 40题、45分钟，言语/数量/逻辑/资料/空间各8题，非企业官方CATA | /assessment-center/career-aptitude-40 |
| 阅读与证据判断 | 免费练习 | 4篇原创文本×4题，逐题证据反馈，非年级诊断 | /assessment-center/reading-practice-16 |
| SQL岗位实操 | 免费实训 | 8项SQL任务，SQLite/WASM、三组数据验证 | /skill-labs/sql-lab |
| JavaScript软件工作样例 | 免费实训 | 6项真实QuickJS执行任务、每项4组测试；不等于完整软件工程师岗位考核 | /skill-labs/code-lab |
| 采购与供应商管理 | 免费模拟笔试 | 24题、45分钟、服务端判分；非真实企业卷 | /career |
| 商品运营与增长分析 | 免费模拟笔试 | 24题、45分钟、服务端判分；非真实企业卷 | /career |
| 工业质量与FMEA | 免费模拟笔试 | 24题、45分钟、服务端判分；非机械制图/电气仿真认证 | /career/exams/quality-paper-2026q4-v1 |

总目录中13个行业与270个岗位是职位导航，不是270套在线考试；不得再上架已退休的6题版。SQL旧路由重定向到唯一正式入口 /skill-labs/sql-lab。

## 曾讨论过，但未完整上线
| 产品建议 | 实际状态 | 未交付部分 | 优先级 |
|---|---|---|---|
| 深度逻辑专项（条件、归纳、论证、图形） | 部分：20题基础和40题内逻辑已有 | 完整专门题库、分难度卷与独立解析 | P0 |
| 职业价值观、工作风格 | 未上线 | 专属原创问卷、审校与独立解释，不能拿RIASEC或大五替代 | P0 |
| 沟通协作、冲突处理、管理情境判断SJT | 未上线 | 独立情境题库、多专家答案审校与评分 | P0/P1 |
| MBTI、DISC行为/性格测试 | 未上线 | 可核验使用许可、适用性及独立完整产品；不把大五改名 | 先研究授权 |
| 软件工程岗位分轨：Python/Java/前后端/测试/SRE | 部分：JS6任务已上线 | 分语言岗位卷、实际故障修复、混合题型和评分 | P0 |
| 数据工程与AI工程：Python清洗、统计、RAG/Agent | 部分：SQL8及JS数据样例已上线 | Python实操、数据质量、AI工作流专业测评 | P0/P1 |
| 电气/嵌入式/硬件/FPGA/汽车电子 | 未上线 | 原创电路图、测量、故障定位、仿真与专业复算 | P1 |
| 机械工程/制图/公差/工艺/SPC | 部分：工业质量24题 | 工程图与制造场景独立实测 | P1 |
| 运维、网络、安全、工业互联网、储能、智能制造 | 未上线完整独立卷 | 仅JS日志/重试微任务，尚无系统级岗位考试 | P1/P2 |
| 金融、风控、产品、营销等专岗 | 部分：采购和商品运营已上线 | 其他岗位各自完整蓝图及正式卷 | P1 |
| 央国企专项、公考、职业资格 | 未上线独立专卷 | 最新官方考试规则、完整仿真卷及题源 | P1 |
| 标准化IQ及中国常模 | 未上线 | 合法标准量表、规范化施测及本土信效度 | 不得伪称已上线 |
| 心理健康、压力、倦怠与临床筛查 | 未上线 | 专业伦理、许可、风险处置规范 | P2 |

## 已完成和未完成的支付边界
两项报告商品已经进入正式商品表，但当前 report SKU 两项均未启用，官方报价接口两项均 unavailable，成功支付订单0。免费探索的基础反馈可用；详细付费报告不可宣称正式开售。真实付款及权益交付跟踪 #243。

## 施工优先顺序
1. 原创且可验证的职业价值观/工作风格或情境判断独立产品，不复用人格题换标题。
2. 逻辑推理分难度题库与完整正式考试流程，继续使用客观准确率，不冒充智商或人群百分位。
3. 软件/数据工程从现有SQL8、JavaScript6延伸到明确职责的实操题组；输入、结果、失败原因可复现。
4. 电气/嵌入式与机械制图分别建立工程图/参数/独立复算/沙箱机制；不能将工业质量题代替全部工程技能。
5. 所有项目的后台状态至少区分：PLANNED、IN_REVIEW、TEST_PASS、DEPLOYED、PUBLIC_E2E；客户页只显示真实可用的产品。按当前一套考试/评分/账本架构推进，不另建第二套身份或收费系统。

## 检查依据
2026-11-02 公网 GET: /assessments、/assessment-center 及5项免费测评、/skill-labs/sql-lab、/skill-labs/code-lab、/career 与已列的招聘正式卷均HTTP200。题库及评分源：src/lib/measurement-center.ts、reasoning-practice.ts、career-aptitude-bank.ts、reading-practice.ts、sql-practice.ts、code-lab.ts、career-formal-bank.ts；自动验收：scripts/test_measurement_center.ts、test_career_aptitude_40.ts、test_code_lab.ts 及 tests/e2e/ 对应浏览器测试。HTTP 200只证明入口存在，不能单独证明正式测量学效度或真实付款。市场研究与产品蓝图见 docs/engineering/CHINA_CAREER_ENGINEERING_ASSESSMENT_MARKET_20261102.md 和 CAREER_APTITUDE_40_AND_ENGINEER_SKILLS_BLUEPRINT_20261102.md。

边界：IPIP中文译稿未验证常模，RIASEC是原创探索问卷；不能生成心理诊断、IQ、招聘录取概率；未实现的产品不要假装可点击。
