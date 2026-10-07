# Web ↔ 微信小程序数据一致性契约

## 原则

Web 与小程序不得维护两份业务事实。题库、学生画像、评分、赛事时间线、复盘必须来自同一 canonical library / API；小程序只允许做展示裁剪，不允许复制并长期维护第二份数据。

## A 类：小程序必须直接展示

- 计算训练次数与计算画像摘要（`arithmetic.sessions`、`arithmetic.plan.summaryZh`）
- 正式竞赛完成数、累计正确率（`overview.examAttempts`、`overview.accuracy`）
- 综合训练指数与数据置信度（`readiness`、`dataConfidence`）
- 下一步训练建议（`nextPlan`）
- 推荐下一套试卷（`recommendedExams`）
- 可训练竞赛目录的赛事、年份、年级、题数、时长/总分、赛制与 miniappReady
- 当前有效赛事服务、任务、日期、清单与完成状态
- 已完成考试的逐题复盘：题干、图、原答案、正确答案、解析

## B 类：小程序精简展示，Web 保留完整分析

- concepts / difficulty / phases：小程序只需在诊断/报告入口呈现最重要结论
- trend：小程序可展示最近趋势摘要，完整历史与图表保留 Web
- practice topics：小程序展示主要专项成果，不复制 Web 的完整分析面板

## C 类：当前明确保留 Web

- PDF 报告下载与 A4 批量打印
- 管理员与家长后台
- 大型深度分析图表与完整行为证据
- 尚未完成原生交互适配的复杂分段计时赛制

## 自动验收

`npm run test:miniapp-parity` 验证：
1. 学习画像 API 与 `buildStudentAnalytics()` 同源；
2. 小程序竞赛目录与 `listTrainingExamProfiles()` 同源；
3. 当前赛事服务与 `COMPETITION_COMPANIONS` 同源；
4. 首页、竞赛、赛事、复盘页面实际引用 A 类核心字段。

CI worktree 不携带生产私有题库，因此 CI 负责结构/映射契约；生产发布后仍必须运行 live smoke，确认真实库存非零、核心竞赛分类可见、guest/微信身份可开始计算训练。
