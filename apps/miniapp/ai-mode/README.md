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

脚本只在已经生成的 `dist` 添加 `skills` 独立分包、`app.json.agent` 和 `page-meta.json`。2026-10-21 Windows Nightly 真机前置运行时验证发现：若 `index.js` 原样引用 `./apis/*.js`，微信独立 Skill 运行时会报 `module ... is not defined`。因此装配器用已有 miniapp 锁定依赖中的 **esbuild** 将 Skill 入口构建为自包含 IIFE，仅覆写 `dist/skills/math-discovery/index.js`，原始接口文件保留以便审计。还会生成仅供测试的 `dist/project.config.json`（`packOptions.include=skills`）并补齐 `lazyCodeLoading`。不改 `src/app.config.ts`、`src/app.tsx`、Web/API 或生产配置。重复装配会拒绝；须用全新构建。

> 注意：此脚本只解决静态装配问题，**未证明** Taro 4.3.0 + 当前微信客户端支持 `wx.modelContext`、`wx.onAgentHandoff` 或接力页向 TabBar 跳转。不得将其当作可审核上线的实现。

## 进入正式流程前的门禁

1. 微信公众平台核实当前 AppID 获得开发模式与代码提审权限。
2. 微信开发者工具验证构建产物的 Skill 声明、独立分包加载与 API 调用。
3. 验证独立非 TabBar 的 AI 接力页自动转到计算/赛事 TabBar，年级/赛事一次性意图在真机中可用。
4. 登录态、网络失败、无匹配、隐私授权、调用额度测试；AI 永不绕过考试/付费权限。
5. 独立 PR → CI → 真机视频验收 → 微信审核，流程未完成不得发布。

## 2026-10-21 Windows 微信运行时验收

- Windows Nightly `2.02.2610202`、微信已登录、IDE CLI 服务端口 `20118`、AI 自动化端口 `9421`。
- 必须先通过 `cli agent start` 启动持久服务，否则第一次执行可能返回 `timeout waiting for tools/result`。
- 最初未打包的 `index.js` 会触发 `Skill code loading failed: module .../apis/*.js is not defined`。在真实 Taro 构建产物上以 esbuild 打包 6.6 KB 的自包含入口后，调用 `prepareArithmeticTraining` 和 `findInternationalCompetitions` 均返回 `status: ok`, `invokeResult.isError: false`。
- 国际赛事接口通过现有公开目录真实返回 `total: 5`；这不等于验证过任何报名时间或当前库存。
- 这证明微信 IDE 原子接口执行通过；卡片交接、真机和微信提审仍须后续验收。**不发布或合并**。
