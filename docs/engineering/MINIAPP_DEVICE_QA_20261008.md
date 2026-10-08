# 微信小程序真实操作交付追踪（2026-10-08）

## 当前状态，不混淆证据

| 项目 | 状态 | 可复核证据 |
| --- | --- | --- |
| 微信小程序 8 页编译 + TypeScript | PASS | `npm run verify:miniapp` |
| Web / 小程序后端 API 契约 | PASS | `npm run test:miniapp-contract` |
| 正式站点接口：赛事目录 + 20 题诊断 | PASS | `npm run test:miniapp-live`，431 套试卷 |
| 游客完整考试服务端拒绝 | PASS | `npm run test:exam-access-live` |
| 小程序游客点击的登录跳转、原题继续、载入失败重试、非分段赛制过滤 | CODE+CONTRACT PASS | `npm run test:miniapp-exam-entry`，仍需真机验证 |
| 官方小程序体验预览码 | PREVIEW GENERATED | miniprogram-ci `preview`，AppID 与私钥未写入仓库，正式发布尚未执行 |
| 微信开发者工具实际按钮测试 | BLOCKED | Z890 / XPS15 为 Linux；没有可用的 Windows/macOS 微信开发者工具 CLI |
| 三星 S8 微信真机完整回归 | BLOCKED | Android 9 / 微信 8.0.78 已安装，但当前设备上运行闲鱼；未擅自切换用户会话 |
| iOS 微信真机测试 | BLOCKED | 当前没有连接到可测试的 iOS 设备 |
| 正式上传/审核/发布 | NOT DONE | 预览成功不等于正式上架 |

**禁止把 Taro 编译通过、线上 API 返回正常、扫码预览码已生成，解释为微信按钮真机验收通过。**

## 本次修复的可验收路径

1. 进入“竞赛实战”浏览赛事、试卷，游客看到“登录后实战”。
2. 游客点击完整试卷 → 登录页，保留其所选的试卷 ID。
3. 使用微信身份或正式学生账号登录 → 自动回到该试卷。
4. 试卷不支持小程序分段计时 → 在建立考试会话之前拦截；竞赛目录对应按钮不再禁用，点击可复制 Web 入口。
5. 断网、接口失败 → 明确显示加载失败和“重新加载试卷”，不再误称“暂无试卷”。
6. 正常学生：竞赛登录 → 试题 → 开考 → 交卷 → 成绩 → 逐题复盘；真机未测。
7. 游客仍可进入计算训练，但不能调用完整考试与评分权限接口。

服务端授权仍为最终判断；客户端身份识别只负责正确的交互引导，不得作为安全边界。

## 在具备官方开发者工具的测试机上执行

需要 Windows/macOS 微信开发者工具，开启官方“CLI/HTTP 调用”；Node.js 与锁定的微信小程序编译产物可用。根据官方 `miniprogram-automator` SDK：

- 为测试环境**单独**安装 `miniprogram-automator@0.12.1`，避免将其旧依赖放入小程序正式依赖。
- 环境变量：`WECHAT_DEVTOOLS_CLI` = 开发者工具 CLI 的绝对路径；`MINIAPP_AUTOMATOR_MODULE` = 隔离安装的 `miniprogram-automator` 模块路径；`MINIAPP_EXPECTED_SHA` = 要验收的 40 位 Git SHA。
- 可选：`WECHAT_DEVTOOLS_PROJECT` = 小程序项目根目录，必须含 `project.config.json` 与 `dist/app.json`。
- 执行 `npm run test:miniapp-ui-devtools`，证据保存至 `.release-tmp/miniapp-ui/`，包含截图和 `devtools-receipt.json`。

脚本检查真实模拟器：打开首页、实际点击计算入口、开始能力训练并拿到第 1 题、加载赛事试卷列表、点击试卷并确认进入登录或考试页面。不存在官方 DevTools CLI 或 SDK 时返回 **BLOCKED + 非零退出码**，不会伪造通过记录。

开发工具的 E2E 是模拟器级别。真机 Android/iOS 需要另行检查首次登录、真实 `wx.request` 和合法域名、服务端访问权限、考题、图片、分段卷处理、复盘、失败重试及性能；记录微信版本、真实设备型号、预览版/正式版编号、Git SHA 和截图/日志。

## 纪律

测试版可以预览；未经真实操作验收不可宣称小程序已稳定可用，也不进入正式审核发布。任何新增按钮必须至少验证点击响应、网络请求、状态更新、异常分支与返回路径。小程序完整考试测试使用隔离测试学生身份，避免污染真实学生成绩。日后如果补齐单独的官方开发工具测试机，再把模拟器报告作为 CI 的专门门禁。