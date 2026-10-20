# 微信 AI 接入隔离区（R0）

本目录是微信 AI **开发模式的候选代码**，不是已上线功能。正式 Taro 构建没有引用本目录。

- 技术参考：微信官方 `wechat-miniprogram/ai-mode-demo` 的 Skill / MCP / Handoff 接口。
- 只读能力：`prepareArithmeticTraining` 和 `findInternationalCompetitions`。
- 公开赛事来自 `https://socthink.cn/api/miniapp/world-competitions`，排除中国国内赛事。
- 不触发考试、支付、关注或学生成绩读取；不含任何 AppSecret、私钥或个人资料。

## 合同测试

仓库根目录运行：

```bash
node --test apps/miniapp/ai-mode/tests/*.test.cjs
```

## 手动装配到独立测试构建（绝不自动上传）

先执行已有小程序 Taro 构建/验证，再单独运行：

```bash
npm run verify:miniapp
node apps/miniapp/ai-mode/pack-canary.cjs apps/miniapp/dist
```

脚本只在已经生成的 `dist` 添加 `skills` 独立分包、`app.json.agent` 和 `page-meta.json`。不改 `src/app.config.ts`、`src/app.tsx`、Web/API 或生产配置。重复装配会拒绝；须用全新构建。

> 注意：此脚本只解决静态装配问题，**未证明** Taro 4.3.0 + 当前微信客户端支持 `wx.modelContext`、`wx.onAgentHandoff` 或 TabBar 目标页接力。不得将其当作可审核上线的实现。

## 进入正式流程前的门禁

1. 微信公众平台核实当前 AppID 获得开发模式与代码提审权限。
2. 微信开发者工具验证构建产物的 Skill 声明、独立分包加载与 API 调用。
3. 真机验证卡片 Handoff 到 TabBar 页面；失败则先实现独立非 TabBar 承接页，不得直接发布。
4. 登录态、网络失败、无匹配、隐私授权、调用额度测试；AI 永不绕过考试/付费权限。
5. 独立 PR → CI → 真机视频验收 → 微信审核，流程未完成不得发布。
