# SOC THINK iPadOS / iOS Safari 兼容性治理与验收

日期：2026-10-10。关联 Issue #98。产品：`socthink.cn`。状态：**WebKit iPad 模拟测试正在实施；iPad Safari 实机验收独立待完成。**

## 背景

用户在实际苹果 iPad 的 Safari 打开网站时体验不佳。早期 Playwright 仅包含 desktop-chromium 与 Pixel-7 mobile-chromium，Chrome 24/24 不能证明 Safari 可以使用。

iPad 的 Safari 需要关注（1）桌面版网站/移动端浏览器缩放和正确 `meta viewport`，（2）横竖屏/Stage Manager 与分屏窄窗口，(3) Safari 触控命中区域，(4) 小字号输入框点击后自动放大，(5) 中文数学符号、图片和滚动，(6) 考试计时/前后台切换/草稿保存。

## 确认的缺陷和修复

- **触控区域过小**：`SiteHeader.module.css` 中平板汉堡导航按钮 40×40、窄屏 38×38 CSS px，不满足 Apple HIG 44×44pt 的交互建议。修为 44×44，并适当扩大窄屏家长登录/账户按钮的可点击高度，保留当前布局和可访问名称。
- **iOS 自动输入聚焦放大**：`WorldEventsExplorer.module.css` 中搜索/下拉字号 14px，小于 iOS Safari 常见的 16px 自动放大阈值；在 `(pointer:coarse)` 下调整为至少 16px。另将题解语言选择与家长输入框的触控字号统一为 16px。**没有**使用 `user-scalable=no` 或 `maximum-scale=1` 禁止用户主动放大。
- **回归验收真实性**：`playwright.safari.config.ts` 与 `tests/e2e/safari_ipad.spec.ts` 使用 Playwright 1.64.0 WebKit，提供 iPad 竖屏、横屏、分屏和 iPhone 模拟，验证真实页面、点击、赛事过滤及关键页面视口尺寸和焦点字体。

## 测试证据与限制

2026-10-10 基线（旧版生产 CSS）：

- 4 类 WebKit 设备视口的基础流程 **12/12 PASS**，代表可正常显示基础导航、目录和表单，但不足以确认触控体验良好。
- 加强 Apple HIG/字号要求后 iPad 竖屏 3 项检查中 **2 项 FAIL**，原因分别为导航触控宽度 **40 < 44px**、搜索框字号 **14 < 16px**，另 1 项基础无横向溢出 PASS。修复后须全量复跑。
- 备用机运行 Ubuntu 26.04 + Playwright WebKit。WebKit 对外 HTTP(S) 在该主机环境下存在联网问题，渲染测试使用只读的 127.0.0.1 代理获取**实际生产站点 HTML/CSS/JS**。这些只读代理测试**不能**替代真实网络路径、原生 Safari 实机、登录支付或受控考试正式数据验收。

推荐复验命令：

```bash
npm ci --ignore-scripts
npx playwright install webkit
# 在已构建候选和可访问本地服务的受控环境：
E2E_EXTERNAL_SERVER=1 E2E_BASE_URL=http://127.0.0.1:4333 npm run test:e2e:safari
# 或在 macOS/macOS Safari 对应网络可用环境直接对 staging（非生产敏感用户数据）测试：
E2E_EXTERNAL_SERVER=1 E2E_BASE_URL=https://<verified-staging-host> npm run test:e2e:safari
```

注意：Playwright 的 WebKit 是独立打补丁的 WebKit 浏览器，不是苹果发行的 Safari；Linux 运行 WebKit 与 iPadOS WebKit 之间仍有渲染、软键盘、Web Speech、PDF、摄像头、音频、前后台行为差异（见官方 Playwright Browsers 文档）。不能用“WebKit 通过”替代“iPad Safari 实机通过”。

## 完整验收矩阵

| 设备/视口 | 首页/导航 | 赛事/筛选 | 计算答题/数学输入 | 模考/报告 | 家长登录/权益 | 横竖屏/缩放 |
|---|---|---|---|---|---|---|
| iPad 竖屏 768/834 px WebKit | 自动化 | 自动化 | 基础页面自动化，真实答题待验 | 页面自动化，完整真实交卷待验 | 页面自动化 | 视口自动化 |
| iPad 横屏 1024/1194 px WebKit | 自动化 | 自动化 | 同上 | 同上 | 同上 | 视口自动化 |
| iPad 分屏 375–600 px WebKit | 自动化 | 自动化 | 同上 | 同上 | 同上 | 视口自动化 |
| iPhone 390 px WebKit | 自动化 | 自动化 | 同上 | 同上 | 同上 | 视口自动化 |
| **实体 iPadOS Safari** | **待实际机型验收** | **待实际机型验收** | **待真实答题/键盘/数学符号** | **待真实交卷/恢复** | **待真实授权验证** | **待旋转和缩放验证** |

实机补齐设备型号、iPadOS 和 Safari 版本；保留出错页面/截图或录屏、重现步骤、修复前后对比。必要时使用 Safari Web Inspector 获取 JS 错误和无障碍布局信息。确保用户已有的付费/考试数据不被测试污染。

## 发布门禁

1. 新的 WebKit 契约、类型检查与原有 Chromium E2E 必须均通过；仓库 PR 合并受保护主分支前执行。
2. 生产候选遵循既有 `quality_gate`、题库保全、CI、生产验收和回滚流程，不直接修改线上用户数据。
3. **未获得实体 iPad Safari 证据前不得说“苹果所有设备完全验收通过”。** 用户可以直接在 Safari 中测试新版并上报具体机型/系统/故障画面。Issue #98 保持开放直到实机签收。

官方规范：
- Apple HIG Buttons https://developer.apple.com/design/human-interface-guidelines/buttons
- Apple Safari Web Content https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/
- Playwright WebKit vs Safari https://playwright.dev/docs/browsers
- Next.js 自动 viewport https://nextjs.org/docs/app/api-reference/functions/generate-viewport
