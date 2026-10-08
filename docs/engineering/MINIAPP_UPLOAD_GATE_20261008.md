# 微信小程序上传门禁 G3/G4（2026-10-08）

## 背景

此前 `ops/release/miniapp_ci.sh upload` 只运行独立 TypeScript、Taro 编译与 API 合约，没有要求微信工具按钮点击、真机复盘的证据。用户已实际遇到“界面存在而按钮不可用”。这不是代码上传平台能自行发现的问题。

## 工作流程与约束

- `preview` 始终可以在通过编译后生成测试二维码，用于执行 G3/G4。**生成预览并不证明按钮有效。**
- `upload`（开发代码上传）必须来自**干净工作区**，HEAD 与 GitHub `main` 精确一致，随后必须有与该 SHA 绑定、72 小时内完成的 G3/G4 验收。
- 如果没有验收文件、缺少微信开发工具模拟器执行记录、缺少 Android 微信真机作答/复盘证据、证据过期或 SHA 不一致，直接以 `MINIAPP_RELEASE_QA=BLOCKED` / exit 3 终止，不调用微信上传 API。
- 正式公众发布仍需微信后台审核和发布流程，这一上传门禁**不能替代**微信后台审核确认。
- 真实测试必须使用隔离测试账号，不准污染真实学生的考试成绩。

## 验收证据路径与内容

默认读取 `.release-tmp/miniapp-qa/release-receipt.json`（不进入 Git）；也可以将绝对路径赋给 `MINIAPP_QA_RECEIPT`。

示例结构如下（仅表示结构要求，不是已完成的验收证据）：

```json
{
  "result": "PASS",
  "commitSha": "<exact-40-character-git-sha>",
  "testedAt": "2026-10-08T12:00:00Z",
  "devtools": {
    "receiptFile": "devtools-receipt.json"
  },
  "android": {
    "result": "PASS",
    "deviceType": "physical-android",
    "model": "Test Android device",
    "wechatVersion": "8.0.78",
    "steps": [
      {"name":"wechat-cold-start","status":"PASS"},
      {"name":"arithmetic-first-question","status":"PASS"},
      {"name":"competition-login-gate","status":"PASS"},
      {"name":"exam-answer-submit-review","status":"PASS"},
      {"name":"network-failure-retry","status":"PASS"}
    ],
    "screenshots": ["phone-home.png","phone-exam.png","phone-review.png"]
  }
}
```

`devtools-receipt.json` 由实际微信开发者工具测试脚本生成，并保存同目录截图，包含：主页渲染、点击计算、第一道计算题、赛事目录、点击考试入口等 PASS 步骤。所有截图必须为真实 PNG/JPEG 文件；报告不得含 JS 异常。Android 记录由实际真机测试人员在测试后填写并保存截图，必须核对设备与微信版本。

自动验证命令：`node scripts/verify_miniapp_qa_receipt.mjs <receipt> <expected_sha>`。其结构/失败分支由 `node scripts/test_miniapp_release_gate.mjs` 在每次小程序构建时复测。

**局限：**本地 QA receipt 校验器负责文件、版本、时间、步骤、截图格式与存在性检查，并不能通过软件本身证明截图一定来自声称的设备；真正的真实性依赖可追溯的设备测试与审阅。不得用单元测试构造的样例报告冒充真实验收。

## 当前状态

- 独立构建和正式站点 API 契约：PASS。
- 官方 miniprogram-ci 候选体验码：已成功生成。
- DevTools 原生自动点击：BLOCKED（当前只有 Linux 主机，尚无官方 IDE 自动化设备）。
- Android 实机微信全路径：BLOCKED（已连接的 S8 正使用其他应用，尚未进行授权测试）。
- 当前还不能宣称小程序正式版本已经完成真实设备验收，正式上传必须继续阻断。
