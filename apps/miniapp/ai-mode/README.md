# 微信 AI 接入隔离区（R0）

这里是小程序 AI **开发模式的候选代码**，不是已上线功能。

- 来源：微信官方 `wechat-miniprogram/ai-mode-demo` 的 Skill / MCP / Handoff 接口形式。
- 只读能力：`prepareArithmeticTraining` 与 `findInternationalCompetitions`。
- 公开赛事仍使用 `https://socthink.cn/api/miniapp/world-competitions`；计算训练仅提供入口。
- 中国国内赛事不在 AI 检索范围内。
- 不会修改小程序现有 `src/app.config.ts`，也不会让正式构建读取本目录。
- 无任何 AppSecret、私钥、用户资料或模拟成绩。

## 合同测试

从仓库根运行：

```bash
node --test apps/miniapp/ai-mode/tests/contracts.test.cjs
```

## 上线门禁

1. 微信公众平台确认当前 AppID 已开通开发模式及**代码提审**资格。
2. 以 Taro 构建产物为对象进行隔离验证：`agent.skills` 声明、独立分包路径、MCP 接口签名和真实 `wx.modelContext` 支持。
3. 真机验证 handoff 是否能打开现有 TabBar 路径；若不能，新增专用承接页，不能假定 query 自动传给 TabBar。
4. 异常与鉴权测试：未登录、弱网络、过期会话、无赛事、无试卷，严禁越权操作。
5. 提交独立 PR，通过合同测试与人工真机视频验收后再考虑合并、上传、审核与正式启用。

`mcp.json` 的 `pagePath` 已指向现有页面，但 **Taro 内部声明尚未接通**，因此目前不能作为微信 AI 可用能力对外宣称。
