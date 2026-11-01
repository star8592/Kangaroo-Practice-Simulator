# 智量测评中心 / SOCTHINK Measurement Center

> 版本：v3（2026-11-01）；含 v1 研究预览、v2 原创任务练习及 v3 阅读练习与公开证据登记簿。部署结果以 `https://socthink.cn/api/release` 的实际 SHA 和公网页面验收为准；任何工程测试都不代表正式心理测量学认证或测评收费已获批准。

## 产品边界

- 正式入口：`/assessment-center`；现有 `/assessments` 保留为考试平台总目录。
- 六个业务方向：人格、认知推理、职业兴趣、岗位胜任、学习能力、心理状态与生活发展。
- 人格与职业兴趣的免费研究试测：`career-interest-exploration-30`、`ipip-big-five-50-cn-preview`；认知与技能的非标准化练习：`reasoning-practice-20`、`sql-lab`。
- 不创建第二套登录、用户档案、订单、支付或题库数据库。未验证量表不可售卖，也不允许冒充 IQ 测验、心理疾病诊断或企业招聘淘汰工具。

## 数据模型与单一路径

```text
src/lib/measurement-center.ts
  -> 量表注册/版本/许可/年龄与验证状态
  -> 题项、维度、反向计分
  -> scoreInstrument: 严格 1..5 单选输入，完整作答后确定性评分
src/app/assessment-center/* + src/components/MeasurementRunner.tsx
  -> 量表说明、18+确认、逐题作答、结果展示与打印
src/lib/assessment-platform.ts
  -> 原考试总目录注册"测评中心研究预览"真实可用路由
```

结果为各维度 `mean = sum((reverse ? 6 - x : x))/itemCount`（1~5 分）。这不是人群百分位、IQ 分数或中国常模标准分。任何收费及“高于多少用户”的展示都需要后续独立数据与审批验证。

### 当前题库来源

1. **职业兴趣探索 30题**：SOCTHINK 原创活动偏好问卷；以 Holland RIASEC 理论为组织框架，每维五题。**不声称为 O*NET® 官方 Interest Profiler，不沿用 O*NET 标准化效度或职业匹配结论。** 参考：https://www.onetcenter.org/IP.html；许可说明：https://www.onetcenter.org/license_tools.html。
2. **大五人格 50题**：按照 IPIP 官方 50-Item Big Five Markers 原始顺序、五个维度及正反计分键制作研究性中文译稿。英文源及计分键：https://ipip.ori.org/new_ipip-50-item-scale.htm。IPIP 原始题项属于 public domain：https://ipip.ori.org/ 。**当前中文译稿未完成双向翻译、认知访谈、信效度与中国样本测量等值性检验，不可用英文或其它语种研究指标冒充中文版效度。**
3. 指南：ITC/ATP Technology-Based Assessment Guidelines（2025年7月更新）https://www.intestcom.org/page/16 。

## 隐私与使用范围

- 本版前端组件在浏览器内存中保存用户临时选项并确定性计算，不向服务端上传答卷；刷新即失效。此说明仅限此测评模块，不替代全站隐私声明。
- 两套试测均暂限定 18+，不需要输入姓名/手机/年龄/其他身份信息。
- 不保存个人回答、临床/敏感心理内容，不做后台排行榜、人格画像营销或雇主评分。
- 进入正式服务前，必须确认个人信息处理告知、年龄与监护机制、数据删除、身份绑定的业务必要性、异常访问防范；不能用用户统一微信账号自动索取不必要的敏感资料。

## 运行与自动化验收

```bash
npm ci
npm run test:measurement-center
npm run test:platform
npx tsc --noEmit
npm run build
```

`scripts/test_measurement_center.ts` 校验独立维度与题数、完整性、输入合法性、反向计分、来源、18+范围、免费状态、浏览器内存交互约束。

## 后续验收计划（正式产品前置条件，不是阻碍研究预览的新增发布门禁）

1. 由心理测量/职业测评专家审查中文版语义等值；盲式复核正反向键，并保存可审计差异。
2. 完成理解性访谈、认知访谈、真实试测样本、缺失模式、信度、结构效度、测量等值与公平性研究；明确年龄和群体的样本边界。
3. 证明报告结论与适用对象一致；禁止用模型补写没有证据的百分位、常模、IQ、诊断与求职成功率。
4. 将用户同意、撤回、隐私处理和有效期写入业务规范，并做移动端 Safari/Android、键盘、读屏与断网可用性验收。
5. 任意正式收费商品必须先达到内容准确、交付可验收、支付回调服务端核验和用户权益发放闭环；研究预览保持免费。
6. 认知/岗位/学习/心理状态栏目先建立各自可验证的任务蓝图和量表授权，不允许复制粘贴同一套“人格题”冒充不同测评。

## 状态约定

- `CODE_CREATED`：源码落地，不能代表测试通过。
- `TEST_PASS`：本地指定测试真实通过，不能代表已部署。
- `DEPLOYED`：公网实际版本 SHA 和页面响应确认。
- `E2E_VERIFIED`：真实用户完整作答、计分、报告、异常流复测通过。
- `NORM_VALIDATED`：已审查本土验证资料及适用范围，不能由代码测试代替。

生产发布必须遵守 `ops/release/SOCTHINK_DEPLOYMENT.md`，只以 GitHub main 为源，验收失败自动回滚，绝不清理私有用户数据。独立开发工作区不得替换原来 Z890 中的脏工作目录。


## v2 · 2026-11-01：原创认知任务与真实 SQLite 实训

现有同一个测评中心增加两套独立的任务产品：

| 页面 | 类型 | 真实评分 | 限制 |
| --- | --- | --- | --- |
| `/assessment-center/reasoning-practice-20` | 20题原创数量、逻辑、空间方位与信息判断任务，四类各5题 | 题目答案与解析逐题确定性评分、四组原始正确数 | **非 IQ、非智力常模、非招聘筛选** |
| `/assessment-center/sql-lab` | 4项虚构电商业务岗位 SQL 实训 | 使用 SQL.js / SQLite WebAssembly，在 **两套不同数据库**执行相同查询并对比指定列和结果排序 | **训练表现，非岗位资格认证** |

新增 `src/lib/reasoning-practice.ts`（20题与评分报告）、`src/lib/sql-practice.ts`（任务蓝图、两套虚构数据和共用确定性评分器）、`src/workers/sql-practice.worker.ts`（浏览器内存沙箱与独立执行）、`src/components/ReasoningPracticeClient.tsx`、`src/components/SqlPracticeClient.tsx`；不修改已有性格、职业兴趣计分器及登录/账本。

### SQL 执行边界

1. SQLite 原始代码来自 `sql.js` v1.15.2（MIT License），WASM 位于 `public/assessment-center/sql-wasm.wasm`，版权许可文件 `public/assessment-center/sqljs-LICENSE.txt`；题目数据/需求为原创。
2. 每次提交生成浏览器 Worker 和全新内存数据库；仅允许单条 SELECT 或 WITH 查询、最多1500字符；执行前启用 SQLite `PRAGMA query_only=ON`，拒绝 DML、多语句与 SQL 注释。
3. Worker 执行超时12秒即终止，不阻塞主页面。UI 限制查询结果最多150行；每次执行使用独立新库，不连接生产数据库、支付账本或外部接口。
4. 所有答案与题库确切 SQL 在浏览器包内，因此仅适用于学习和自评，不用于具有反作弊要求的正式认证或聘用。
5. 结果按列名/列顺序、行值/行顺序比对；确实执行两套不同的原始数据，防止只对展示数据硬编码通过。**不生成百分位、职业评级或成功率**。
6. 所有题目/答案保留在本页面状态中，无服务端存储；关闭或刷新即失效。两套新产品当前研究阶段暂限18岁及以上。

### 发布回归

```bash
npm run test:assessment-skills
npm run test:platform
npx tsc --noEmit --incremental false
NEXT_TELEMETRY_DISABLED=1 npx next build
E2E_BASE_URL=http://127.0.0.1:3478 E2E_EXTERNAL_SERVER=1 \
  npx playwright test tests/e2e/assessment-skills.spec.ts tests/e2e/measurement-center.spec.ts
```

同时自动验证真实 SQL 的全任务成功、缺少状态过滤、硬编码订单、越权写入/多语句、未知任务/表名、反作弊宣传边界等条件。端到端桌面+移动测试必须对真实 WASM 运行、Worker 调用、任务进度和结果报告逐项通过。

后续方向：在充分用户体验与真实岗位研究基础上，扩展数据清洗、Excel、Python 与口头表达评估；必须有可靠评分与版权证据后才标记开放。正式 IQ 测试与科学的职业能力量表要求规范化施测、专业资质、适龄常模和信效度证据，不能靠增加题数自动获得。
## v3 · 2026-11-01：阅读证据任务与透明技术档案

### 阅读训练产品
- `/assessment-center/reading-practice-16`：4篇 **SOCTHINK 原创模拟文本** × 每篇4题，共16题，分别测练信息定位、合理推断、数据理解、论证证据边界四个动作。
- 题项、正确答案、对应**逐字可在原文定位的证据片段**及解释放在版本控制，答卷在浏览器内存完成；四维各4题，按当次原始答对数反馈。结果页列出每题原文证据，并只按该套题的错题建议具体练习动作。
- 适合小学高年级及成人的**练习**；未满14岁需监护人同意进入，页面不要求身份、成绩、校名、手机号或未成年人档案，不上传选项。不得把4题的类别正确数解读成稳定阅读能力诊断、年级排名、学障判断或升学预测。
- 源码：`src/lib/reading-practice.ts`、`src/components/ReadingPracticeClient.tsx`、`src/app/assessment-center/reading-practice-16/page.tsx`。

### 公开技术档案
- `/assessment-center/methodology`：从 `src/lib/assessment-evidence.ts` 的版本化登记簿展示当前5个免费产品的来源、许可、评分、适用人群、证据状态和禁止推断结论。
- 不使用“国际认证”“精准测智商”等无证据宣传；5项产品全部标记**无本土常模验证**，非标准化任务训练也不冒充量表。技术测试通过并不意味着心理测量学信效度通过。
- 正式的信效度、中文译文审查与报告证据研究继续跟踪 #213。

### E2E 工具链根因修复
- `playwright.config.ts`：区分两种模式。
  - 缺省本机模式：仅允许 127.0.0.1/localhost 的 HTTP 和非特权显式端口，不放宽原有规则。
  - `E2E_EXTERNAL_SERVER=1`：直接访问指定 HTTP/HTTPS 外部站点，不启动本地 WebServer，不应把 HTTPS 默认443错误判为 `INVALID_E2E_PORT`。拒绝 file:/等其他协议及含用户密码的 URL。
- 自动化配置测试 `scripts/test_playwright_origin.ts` 覆盖8种合法/非法地址。避免增加第二套永久 Playwright 配置；生产回归直接复用正式主配置。
- 对应 GitHub Issue #218。此修复仅影响测试配置，不变更生产路由、支付、权限、数据库或安全策略。

### v3 验收命令
```bash
npm ci
npm run test:assessment-reading
npm run test:e2e-origin
npm run test:platform
npx tsc --noEmit --incremental false
npm run build
E2E_EXTERNAL_SERVER=1 E2E_BASE_URL=https://socthink.cn npx playwright test tests/e2e/assessment-reading.spec.ts
```

完成上述代码测试后仍需执行正式 CI、隔离构建、合并 main、自动回滚式生产发布与公网浏览器验收，不能以单纯提交代码代替上线回执。
