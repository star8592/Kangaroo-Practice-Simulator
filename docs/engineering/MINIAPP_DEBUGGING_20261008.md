# 2026-10-08 小程序点击无效：修复与发布阻断

## 已有证据

- 用户微信预览版可切换计算 Tab，但点击开始训练后无业务反馈；竞赛列表空白。
- 线上公开 API 的游客访问得到 431 套试卷，六年级计算启动分别返回 12 / 20 题。
- 生产微信登录后端 AppID/Secret 已注入进程，无效模拟 code 返回 401；不证明真实微信登录成功。
- 用户 18:30 左右手机操作在服务端没有相应请求日志，而开发机随后执行的相同 API 有记录。优先检查小程序 request 合法域名配置。
- 微信 OpenAPI 的 IP 白名单与小程序客户端 request 合法域名是两套独立配置。

## 本次补丁

- 网络请求错误分类：域名拦截、超时、其他连接错误。
- 计算训练启动和答案保存失败时持久显示错误，不再只有短暂 toast；阻止重复启动。
- 竞赛列表新增明确的加载中 / 加载失败 / 重试、赛事筛选和分页，切回 Tab 自动刷新。
- 首页与我的页面从异步登录结果刷新实际身份；明确区分微信、临时游客和已有学生账号。
- 新增 scripts/e2e/miniapp-click-smoke.cjs 官方微信开发者工具点击级脚本；缺少 DevTools 时只可返回 BLOCKED。
- 小程序上传动作检查本次 Git SHA 关联的点击级 PASS 和真机 PASS 报告，24h 时效；预览可继续生成以供验收。

## 当前阻碍

1. 微信公众平台 mp.weixin.qq.com → 开发管理 → 开发设置 → 服务器域名，确认 request 合法域名精确包含 https://socthink.cn。未配置则添加并保存。只允许 HTTPS、合法域名和合规证书。
2. 需要在微信开发者工具 Console / Network 读取真实 wx.login、wx.request 的请求及报错。当前只有服务端日志，无法最终定因。
3. 微信 OpenAPI 查询额外被生产机器出口 IP 白名单阻止。生产出口为 8.166.137.232，设置属于后端管理，与小程序 request 域名无关。
4. Z890 为 Linux，尚无受支持的官方微信开发者工具，G3 点击测试必须在 Windows/macOS 上运行，缺失时只能 BLOCKED。

## 官方自动化测试实施

- Windows/macOS 安装微信开发者工具，使用本小程序 AppID 导入 apps/miniapp，登录且允许 CLI/HTTP 调用。
- 本地安装 miniprogram-automator；设置 WECHAT_DEVTOOLS_CLI 指向官方 CLI 绝对路径，通常 Windows 为 cli.bat。
- 运行 npm run test:miniapp-click-e2e。脚本检查首页计算按钮、开始训练显示题目、赛事列表显示试卷、打开试卷、我的身份状态。
- 默认在系统临时目录保存 kps-miniapp-e2e-report.json，可通过 MINIAPP_E2E_REPORT 改位置；没有真实自动化不可产生 PASS。
- 另在真实微信手机测试计算完整闭环、竞赛完整闭环及账号状态。人工证据通过后生成 MINIAPP_REAL_DEVICE_REPORT，包含 status、sha、runAt、deviceModel、wechatVersion、evidence 至少两个可审查截图或日志路径。
- npm run miniapp:upload 在上传前执行校验，两份报告必须是相同 Git SHA、PASS 且 24h 内有效；不允许伪造自动验收。

## 仍不合格

目前的本地编译和公网接口测试不能证明微信端点击可用。缺少真实微信 DevTools E2E、合法域名后台确认与 Android/iOS 真机闭环，因此此版本**不得宣布正式交付或发布成功**。
