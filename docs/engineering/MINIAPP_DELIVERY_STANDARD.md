# 微信小程序工程交付标准（Release Gates）

适用仓库：`star8592/Kangaroo-Practice-Simulator`（微信小程序 + Web + 统一后端）。

## 依据（不重新发明开发流程）

- [DORA — Continuous delivery](https://dora.dev/capabilities/continuous-delivery/)
- [GitHub — protected branches and required checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Google SRE — Canarying releases](https://sre.google/workbook/canarying-releases/)
- [DORA — delivery metrics](https://dora.dev/guides/dora-metrics/)
- [微信小程序组件模拟测试工具](https://github.com/wechat-miniprogram/miniprogram-simulate)（仅组件模拟，**不能替代真机**）

对外严禁混淆 **构建/接口通过**、**模拟器自动交互通过**、**真机体验通过**、**审核通过**、**正式发布已验收**。

## 质量门禁及证据

| 门禁 | 运行位置 | 必需证据 | 失败处理 |
| --- | --- | --- | --- |
| G0 可验收需求 | PR | 验收场景、失败分支、影响范围 | 不进入开发 |
| G1 静态检查、单元与接口契约 | GitHub Actions | 对应 SHA 的日志和断言 | 禁止合并 |
| G2 小程序独立构建 | GitHub Actions | 8 个 Taro 页面 dist + typecheck | 禁止合并 |
| G3 **点击级端到端** | 微信开发者工具，专用测试机 | 实际点击 + 网络响应 + 断言截图/日志 | 禁止上传正式代码 |
| G4 真机体验/权限/异常 | 微信预览 + 测试微信号（Android/iOS） | 视频或截图、环境、版本 SHA、测试结果 | 禁止提交审核 |
| G5 微信审核及发布 | 微信后台 | 审核 ID、状态、正式版本及时间 | 未通过不宣称上线 |
| G6 正式环境复测与监测 | 已发布正式版 | 主路径复测、API 错误率、回退预案 | 发现问题终止推广，回滚/修复 |

GitHub `miniapp-build-and-contract` 检查 G1/G2 **不等于** G3/G4。即使它绿色，也不能用“已测试小程序按钮”作结论。

**仓库设置要求**：保护 `main`，强制 `quality` 和 `miniapp-build-and-contract` 成功，要求 PR 审查，禁止直接推送/绕过必需检查；建立发布环境审批。`main` 保护需通过 GitHub 实际配置确认，不能因为文档提到了就宣称完成。

**微信自动化**：在支持微信开发者工具的专用 Windows/macOS 机使用 `miniprogram-automator`（或微信官方提供的兼容自动化能力）点击真实页面与断言。`miniprogram-simulate` 只能辅助组件级检查。没有工具/机具时状态为 **BLOCKED**，不准把 Taro 编译成功充当端到端 PASS。

## G3/G4 强制验收路径

测试环境：至少一台 Android 微信真机；正式推广前增加一台 iOS 真机。微信号需具有对应体验权限；使用与正式后端隔离的可清理测试数据。记录微信版本、手机型号、源码 SHA、预览批次与服务器版本。

1. **首次冷启动**：无需 PIN/手工注册，启动后主动发起微信身份建立。检查后端返回身份/登录类型（不能只从界面文字推断）。
2. **重开程序**：保持同一身份；测试 token 失效后自动恢复。微信登录失败时必须明确显示游客降级状态，不得声称微信已登录。
3. **首页计算按钮**：真实点击可进入计算页；点击选择年级；POST `/api/miniapp/arithmetic/session` 返回有效题目与 ticket。若失败，界面显示可操作的错误和重试。
4. **答题闭环**：输入答案→提交→正确/错误反馈→下一题→交卷/结算→结果和训练记录。重复提交与掉线需幂等或有可恢复策略。
5. **竞赛目录**：加载后显示至少一套可用试卷及赛事筛选；测试 API 失败时显示错误与重试按钮，不能误显示“暂无试卷”。
6. **竞赛闭环**：选择赛事→试卷→作答→确认交卷→成绩→逐题复盘；测试不同赛制不可在小程序做的情况，给清晰 Web 出口。
7. **我的/身份**：区分已微信绑定、临时游客、独立站内学生账号；不能把账户切换误报成合并数据。
8. **跨端一致**：同一身份的 API 与 Web 数据一致；尚未实现绑定的账号必须明确告知限制。
9. **异常分支**：微信 SDK 拒绝、域名白名单阻断、401、403、5xx、弱网/断网、API 超时、页面返回、快速连续点击。
10. **版本真实性**：微信预览码、正式审核包、发布结果、GitHub commit 和生产 API SHA 关联可审计。

每个必需案例保存 `PASS/FAIL/BLOCKED`、日志或截图、复现步骤以及实际微信环境。**BLOCKED 不等于 PASS**。不得以“接口测试有 431 套题”证明手机上真的显示 431 套题。

## 发布执行与回滚

- 只通过 PR 合并审核过的代码；为 **特定 SHA** 构建。
- 上传前完成 G1~G4，并生成测试清单；未经核验不得自动上传正式版。
- 先在微信体验版验证，得到审核结果后才发布，发布后再按相同脚本复测。
- 服务端采用金丝雀/分批部署及回滚；微信客户端受微信平台审核发布机制约束，不能假设可任意分流或瞬间回退全部客户端。
- 出现 P0/P1 阻断（登录、计算、竞赛主要路径不可用）立即停止发布，记录故障、影响、修复与回归用例。

## 待办及目前不足（2026-10-08）

- 当前体验版在用户实测中出现“点击无法继续”，**G3/G4 未通过**。
- 现有 GitHub CI 对 Web 的门禁包含部分小程序 API 契约，却未独立编译小程序；本 PR 添加独立构建与契约 job。
- `main` 分支经 GitHub REST 检查报告 **Branch not protected**，需要配置必需检查。
- 没有可核实的微信开发者工具点击自动化日志、真机 E2E 证据；**必须补齐**，不能宣称已修复。
- 生产微信 OpenAPI 因出口 IP 不在白名单而被拦截，审核发布状态须完成配置后核实。

## 现有测试的证据边界（必须如实汇报）

`scripts/audit_miniapp_web_parity.ts` 检查的是 API 返回和 canonical 数据一致性；本地私有题库缺失时可能出现 `catalogueFixtureAvailable:false, exams:0` 同时 PASS。此 PASS 只能说明两侧**相同**，不能说明题库**非空**。

因此独立的 `.github/workflows/miniapp-production-smoke.yml` 会在 main 中小程序代码发生变更后、每天及手工触发时检查线上访客、分类试卷数量、分析和计算启动。它是生产 API 哨兵；**仍不等于**微信 GUI 点击测试。

小程序用户报告“按钮没反应”时，必须先拿到真机 `wx.request` 的网络事件、`wx.login` 返回、(request 合法域名)配置和页面异常日志，再决定修复；任何单一 API 通断结果不能替代根因定位。
