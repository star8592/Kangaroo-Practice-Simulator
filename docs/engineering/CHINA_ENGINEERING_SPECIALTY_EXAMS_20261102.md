# SOC THINK 中国技术岗位专项实操与综合编程模拟笔试
版本：2026-11-02
市场：中国优先。用户端学习和模拟笔试，不是正式企业招录或职业资格认证。
关联研究：国内职业与工程能力测评 Issue #238。

## 1. 市场与题型依据
- 牛客官方产品：https://hr.nowcoder.com/product/test — 2026年网页包含在线编程、AI Coding、岗位胜任力、其他实操互动考核。
- 牛客出题官手册：https://hr.nowcoder.com/article/485 — 2023-12-08手册描述ACM、核心代码、SQL、HDL、前端、Shell等题型和按用例通过比例的评分。
- HackerRank题型：https://support.hackerrank.com/articles/2354192461-question-types-in-hackerrank-tests — 2026年题型包括代码、前端、后端、QA、DevOps和代码仓库。
- HackerRank项目题：https://candidatesupport.hackerrank.com/articles/8606305957-taking-front-end-back-end-full-stack-and-mobile-developer-assessments — 2026-10-28说明多文件项目题和单文件题存在明确区别。
本平台仅做原创独立函数实操，尚不具多文件React/Java/Node服务项目执行能力；不复制商业题库、冒充官方授权或已有认证。

## 2. 实际交付
- 前端工程师：/skill-labs/engineering/frontend，搜索词处理、表单校验、商品列表排序、界面多选状态，四题16组真实QuickJS用例。
- 后端工程师：/skill-labs/engineering/backend，接口分页、资源编辑权限、Webhook幂等、滑动窗口限流，四题16组真实用例。
- 测试及SRE工程师：/skill-labs/engineering/qa，API覆盖、错误指纹、SLO违约、事故升级，四题16组真实用例。
- 软件工程综合模拟笔试：/skill-labs/engineering-mock，60分钟6题100分，前端两题30分、后端两题40分、测试两题30分；正式入场、导航、复查、到时自动交卷、成绩报告。
- 新增原创题12道48组独立用例；模拟考试复用其中6题24组，不虚增独立题库数量。保留原先软件工程基础6题、SQL8和所有原有测评及岗位试卷。

## 3. 核心技术边界
- 纯JavaScript函数实际运行，QuickJS WebAssembly在独立Worker隔离执行，沿用既有16MiB VM上限、单用例中断、源代码长度上限。不会上传用户源代码，也没有生产数据库/账号访问接口。
- 原训练判题模式不变；新增单个公开样例自测和全用例交卷按比例评分。初始starter模板不算有效答题，不计分，空白得0分。
- 模拟卷总分100，六题权重为15/15/20/20/15/15。三领域报告为30/40/30原始分数，绝不编造常模、智商排名、录取概率。
- 试卷倒计时和本地源码草稿存于sessionStorage，版本隔离，刷新不重置倒计时；数据只在本标签页可恢复。
- 限制必须明确公开：题目与测试输入由客户端分发，时钟与成绩可由技术人员篡改，无实名监考、无保密测试和防作弊审计。属于模拟练习，不可用于高风险人才选拔或企业官方能力证明。

## 4. 代码与测试
- src/lib/engineering-code-tracks.ts — 12道原创题。
- src/lib/engineering-code-exam.ts — 6题模拟卷与成绩。
- src/lib/code-lab-engine.ts — 共用QuickJS判题器，新增sampleOnly与collectAll可选行为，原默认行为保持。
- src/components/CodeLabClient.tsx — 原基础训练与新三轨道共用编辑器和版本化练习状态。
- src/components/EngineeringCodeExamClient.tsx、src/workers/engineering-exam.worker.ts — 独立限时考场、公开自测、交卷后分项自动判分。
- scripts/test_engineering_tracks.ts — 12题48组实际运行，错误逻辑拒绝，原6题库存保持。
- scripts/test_engineering_code_exam.ts — 6题100分、分项30/40/30、样例与全量分离、部分分与白卷逻辑。
- tests/e2e/engineering-specialty-exams.spec.ts — 桌面/手机三专项实操、模拟考试满分/部分分/零分/到时交卷/会话恢复以及目录链接。
部署应遵守PR CI全绿、main质量回归通过、生产自动回退发布及公网浏览器实测，不以本地成功代替正式上线。

## 5. 后续产品顺序
优先Python实操、算法与数据结构、真实代码评审、Node服务调试、完整前端多文件项目、故障处理和AI应用工程；新语言和多文件任务必须先完成真正的安全执行器，不能只挂未实现的首页卡片。
