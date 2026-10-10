# SOC THINK 并行研发、集成与发布实施基线

> 日期：2026-10-10 · 总任务 Issue #90 · 产品总方案 `docs/product/SOC_THINK_PRODUCT_MASTER_PLAN_V4_20261010.md`
>
> 适用范围：Web、微信小程序、全球赛事及共享 API。状态：并行研发已完成第一批可评审 PR，本文件不是生产发布回执。

## 1. 工作流和集成依赖

| 流 | PR | 基础分支 | 交付边界 | 本轮已验证 |
|---|---|---|---|---|
| 产品总基线 | #89 | main | 产品定位、四业务域、里程碑与验收 | 文档已提交、PR ready for review |
| Web 业务入口 | #91 | main | 品牌、导航、首页 CTA、公开赛事目录、Web 现有兼容 | Web canonical public quality gate PASS；桌面+移动 24/24 E2E PASS |
| 微信五入口 | #92 | #91 的工作分支 | TabBar 5 项、Tab 参数一次性消费、模考/赛事拆分 | canonical miniapp quality gate PASS；Taro 8 页制品/5 Tab PASS |
| 赛事可信数据 | #93 | main | 目录统一 ID、来源链接、未核验日期、国内国外平等和质量门禁 | WORLD_CATALOG_INTEGRITY_PASS；世界/国内赛事/审核测试通过 |
| 端到端及运营验收 | #90 的下一阶段 | 集成后的 release candidate | Web staging、微信真机、灰度、回滚和监控 | **尚未完成** |

三个代码 PR 在各自路径上独立开发、无共享工作树写入；#92 对 #91 有**显式依赖**，不得直接独立合并 main。每条支线先在隔离工作树通过质量门，随后按顺序形成一个唯一 release candidate。

## 2. 受控集成顺序

1. Review #89（仅文档）；其变更不代表上线。
2. Review #93 的数据质量门；验证新增测试在合并目标的既有质量流程中可执行。
3. Review #91 的 Web 改版与旧链接迁移，确认 `QUALITY_GATE=PASS`、Playwright 全套 24/24 和不弱化任何 exam/auth gate。
4. 在 #91 已安全集成之后，更新 #92 base 到 main（或在隔离集成分支作对应 rebase），消除共享文件冲突并再跑质量门；不要直接 force push 覆盖旧工作树。
5. 集成 Web 与小程序的 release-candidate SHA 后，**分别**执行 Web staging 和微信开发者工具/真机验收。
6. 最后经过灰度、真实权限/支付回调（若本次涉及）、回滚演练和审查证据再对 Web 与小程序独立发布。

“Review-ready” ≠ “Merge-approved” ≠ “Deployed” ≠ “Production accepted”。如果 main 上存在自动发布机制，合并可能触发部署；必须在 review/release gates 符合后才放行，不以聊天授权绕过受控检查。

## 3. 现阶段可并行事项与不能并行事项

**可并行**：
- Web 样式、首页和导航可用性及真实浏览器 E2E；
- 小程序 TabBar 跳转兼容、构建制品与微信开发者工具验收；
- 全球赛事来源/核验时间/资格状态与数据契约；
- 用户路径与身份权限矩阵、报告正确率核查；
- 可观测性、staging 自动检测与回滚演练准备。

**必须有序**：
- #92 的最终集成必须基于 #91；
- 一次只有一个 release candidate 写入正式部署目标；
- DB schema 变动先 additive migration、再部署、再 backfill，禁止并行 schema destructive change；
- 用户正式考试结果、订单和会员权限必须在服务端校验，与首页 UI 发布可隔离；
- 微信正式上传后的小程序发布与 Web 发布各自独立确认，不可凭某端通过宣称另一端上线。

## 4. 双端交付矩阵（签收前全为待验）

| 路径 | 桌面/移动 Web | 微信小程序 | 共同后端校验 |
|---|---|---|---|
| 游客首次进入 | 三个 CTA 点击到正确任务 | 五 Tab 全可进入；无效会话可恢复 | 匿名允许访问的边界统一 |
| G1–G12 计算 | 数学符号输入、评分/复盘、草稿 | 触屏、断网恢复、计算入口 | 会话属主、exactly-once 计分 |
| 竞赛模考 | 赛事选择、计时、答题、交卷 | 模考 Tab→试卷；微信身份处理 | 同题目快照、赛制计分和已提交恢复 |
| 全球赛事 | 搜索、地区/学段、官方来源 | 赛事 Tab、带赛事 ID 跳转、赛事→模考 | 相同赛事 ID/权限/来源/状态 |
| 成长和关注 | 赛历、记录、荣誉区分 | 关注刷新、不同孩子切换不会串数据 | 家长/孩子隔离、付费权益 |
| 国际化 | 中文/英文与高亮、链接 | 已支持的语种、完整朗读题干与选项 | 同一试卷语言/配套素材 |
| 发布回滚 | 灰度、健康探针、部署日志 | 版本号/审核/灰度/正式入口 | 数据备份可恢复且业务不中断 |

关键路径必须能完成真实操作。静态源码测试、HTTP 200、成功编译都不能代替真实交互验收。

## 5. 不可绕开的工程质量门

Web：`bash ops/automation/quality_gate.sh public`、`E2E_ALLOW_SYNTHETIC_FIXTURE=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome npx playwright test`（仅隔离 workspace）；正式线上端到端 smoke 另测。

Miniapp：`bash ops/automation/miniapp_quality_gate.sh` 包含导航契约、登录与提交恢复、微信 Taro typecheck/build 和 **构建产物五 Tab 精确顺序** 检查；再做微信开发者工具与真机点击、授权、模拟考试返回。

赛事：`npx tsx scripts/test_world_catalog_integrity.ts`；不得构造无来源的当届日期、官方合作、非法招生效力。来源变更须进审核队列，不能自动升级为“报名开放”。

**失败分类**：产品缺陷、测试环境缺失、外部平台授权/发布限制分别记录，禁止把环境失败伪装为产品 PASS，也不要将可恢复环境错误当作直接终止全部开发的理由。

## 6. 发布证据、反馈与恢复

每次发布须记录：Commit/PR SHA、CI run、实际部署内容 SHA、测试矩阵、官方微信小程序提交版本、灰度人群、错误率、事件错误日志、恢复点与 rollback 验证。

恢复点一律采用当前已验证线上版本；失败后回滚应用，不删除学生考试数据、订单或赛事关注记录。用户数据的重放、合并和积分只依赖幂等后端操作。

## 7. 截至本轮的已验证结果与剩余门槛

- #91：`QUALITY_GATE=PASS mode=public sha=f15ca4bb0dca5c10302f9fda1848e90288cea37c`；Playwright 24/24 PASS。
- #92：`MINIAPP_FIVE_TAB_NAVIGATION_PASS`、`MINIAPP_FIVE_TAB_ARTIFACT_PASS pages=8 tabs=5`、`MINIAPP_QUALITY_GATE=PASS taro=4.3.0 pages=8`。
- #93：`WORLD_CATALOG_INTEGRITY_PASS events=10 china=5`、`WORLD_COMPANION_PASS`、`COMPETITION_SOURCE_WATCH_PASS`。
- **未完成**：代码审查/安全集成、双端实机及 staging smoke、灰度、自动部署/回滚验收、微信提交/审核/正式发布。

下一阶段始终遵循：**先通过代码评审与隔离质量门 → 唯一集成候选 → staging/真机 E2E → 灰度 → 生产验收**。严禁同时发布两个未经对齐的业务版本。
