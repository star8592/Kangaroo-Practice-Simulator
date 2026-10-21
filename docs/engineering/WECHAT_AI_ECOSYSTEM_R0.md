# 微信 AI 生态接入 R0 — SOC THINK 数学（2026-10-21）

## 决策

在 `star8592/Kangaroo-Practice-Simulator` 的 `apps/miniapp` 实现可审计、可回滚的 **微信 AI 发现层**，Web 与小程序共享现有 API、题库、用户和权限系统；本层不得另建第二套业务事实。

核心目标是家长一句话发现计算训练、国际赛事与备赛入口。小程序打开后直接使用，AI 不代替做题、判题、报名、支付或学生学习过程。

**用户最新产品决策**：不在赛事展示/AI 推荐里推广中国国内竞赛，当前中国市场仍可服务国际赛事备赛与日常计算训练。

## 接口 R0

| 意图 | 输入 | 数据/行为 | 页面 | 身份边界 |
| --- | --- | --- | --- | --- |
| 计算训练入口 | 明确的 1-12 年级，可省略 | 仅校验并推荐，不建立会话 | `/pages/ai-entry/index` → 计算 Tab | 年级一次性预选，仍须学生点击开始 |
| 国际赛事发现 | 用户提供的关键词、地区，可省略 | 公开目录过滤，排除 `CN`（含大小写变体） | `/pages/ai-entry/index` → 赛事 Tab | 唯一匹配时携带真实赛事 ID，不输出关注/进度 |

`/api/miniapp/exams` 需要学生身份：R0 **禁止**借游客 Token、模拟身份或服务密钥代查，后续建立用户明确授权的身份衔接后再考虑。

## 代码隔离

- R0 Skill 原型：`apps/miniapp/ai-mode/skills/math-discovery`。
- 只读合同测试：`apps/miniapp/ai-mode/tests/contracts.test.cjs`。
- Draft PR 内新增不可见的 AI 接力路由和可选 `wx.onAgentHandoff` 监听；只读导航意图，绝不修改生产后端、支付与用户表。
- `pack-canary.cjs` 仅在独立的真实 Taro `dist` 中注入 Skill；正常构建不包含 `app.json.agent`。
- 未在正式构建中加入 `agent.skills`，也未申请/开启微信后台自动源码读取授权。
- 本地 Z890 工作树有其他进行中的更改，只作只读检查；GitHub 是唯一源码写入位置。

## 必须实测的问题

1. 微信开发模式是否已允许该 AppID 代码提审，不可凭 2026-06 的公告推定已全面开放。
2. 官方原生示例的 `app.json.agent.skills`、独立 `skills` 分包如何保留到 Taro 4.3.0 的 `dist`。
3. 已提供非 TabBar 接力页 `/pages/ai-entry/index`，但其在微信真机的 `onLoad` / `onAgentHandoff` / `switchTab` 时序仍须验收。
4. 年级和唯一赛事 ID 使用白名单、2 分钟 TTL、一次性消费；已写合同测试，但仍须核验真机行为。
5. 免登录公开赛事 API 与真实目录在生产中的一致性、网络超时和返回字段稳定性。
6. 微信 AI 是否返回真实推荐流量，以及点击小程序卡片后的可观测数据。

## 质量门禁

- Node 合同测试与真实 Taro 构建后装配验证全通过；赛事来源始终来自 canonical API，无国内赛事及个人进度泄露。
- `npx tsx scripts/test_miniapp_ai_handoff.ts` 测试接力参数、TTL 和单次消费。
- AI 请求不能发起写入、购买、关注、考试开始、成绩读取。
- 微信开发者工具 + 真机视频：计算入口、赛事入口、无匹配、网络断开、微信登录失败、重复点击。
- Web 和普通小程序不回归：现有 `verify:miniapp`、Web CI、接口权限矩阵通过。
- 正式发布依旧 PR → CI → 指定 SHA → Z890 拉取构建 → 真机 → 微信审核；无审核权限不发布。
- 量化：AI 调用、有效卡片点击、首次训练完成、7 日留存、付费转化、额外服务成本。不把接入视为已经带来流量。

## 后续

R1 是当前 Draft PR 的接力页真机验收；R2 再研究账户授权和个性化报告。自动模式须另行进行源码授权和数据保护审核，不与开发模式混在一个开关中。


## 2026-10-21 本机追加验收

- Z890 使用独立 Git worktree 校验本 PR 的 `8370d132`，原项目主目录的未提交改动完全保留。
- Taro 微信小程序实际构建、测试版独立 Skill 装配和生成产物结构校验均 PASS。
- 腾讯官方 `wechat-miniprogram/ai-mode-skills` 的 `wxa-skills-validate`，固定版本 `9bd1f25a7051ff137206f15251f716536f8409e9`：初次 V009 误将三元表达式 `grade : null` 识别为结构字段；改为先赋值 `confirmedGrade` 后，静态规则 **31/31 PASS**、0 error / 0 warning。
- 本 PR 新增以上静态验收的 CI 固定版本步骤，但由于本机未找到支持 AI 模式的微信开发者工具 CLI，官方工具的 preview/execute 未运行；独立 Taro 构建 PASS 不代表微信 CLI 或真机 PASS。
- 微信公众平台截图证实总开关、自动模式和开发模式已开启；仍需要核实小微 Handoff 实际调用权限、平台评测和正式审核是否允许。
