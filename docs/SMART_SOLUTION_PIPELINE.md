# 智能解题动画流水线

## 核心原则
数学语义由高能力模型负责，渲染、语音、动画播放和资产处理交给本地程序。
本地渲染器不得自行补写数学推导；未通过验证门禁的内容只能降级为答案/原始解析证据。

## 数据流
1. 题源证据层：原题图、官方答案、原始解析页、竞赛/年份/题号元数据。
2. AI 核心拆解：独立求解，寻找可视化结构，输出 3–8 个语义 scene。
3. 验证门禁：derivedAnswer 必须等于 officialAnswer；关键推导与证据交叉核对；quality 必须为 verified。
4. 本地播放：MathDslScene 负责二维结构；ThreeSolidScene 负责立体几何；浏览器语音逐幕讲解。
5. 安全门禁：普通学生必须交卷后才可访问解析；当前重考包含该题时重新锁定；管理员可审查。

## Storyboard 合同
目录：private/solutions/<questionId>.json

必须包含：
- version = 1
- quality = verified
- verification.officialAnswerMatched = true
- verification.solverAgreement = true
- verification.officialAnswer
- verification.derivedAnswer
- verification.evidencePages
- scenes

## 当前覆盖
2024 AMC8 Q1–Q25：25/25 verified storyboard。
2024 原解析：22 页，Q1–Q25 已完成精确页码映射。

## 扩展策略
历史卷不批量套模板制造假精讲。
固定顺序：证据索引 → AI 独立求解 → 答案一致性 → 结构化剧本 → 本地渲染。
优先处理学生错题、高频错题和高区分度题，再向整库扩展。

## 需求驱动队列
命令：npm run solution:queue

输出：private/solutions/queue.json

本地排序信号：
- 学生答错：最高权重
- 空题：高权重
- 标记题
- 多次修改答案
- 长时间停留
- 在没有行为数据时，仅用竞赛/年份/题号作轻量 tie-break

队列只决定“下一题该让 AI 解哪一题”，绝不决定答案或推导。
高能力 AI 消费队列后仍必须经过 verified 门禁，才能被学生端加载。
