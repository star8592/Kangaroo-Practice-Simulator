# Socthink Math 微信小程序

定位：计算训练 + 竞赛实战 + 赛事管理服务。小程序是高频入口，`socthink.cn` 继续作为完整 Web 工作台和共享 API 后端。

## 技术栈

- Taro 4.3.0
- React 18 + TypeScript
- 微信小程序原生构建目标 `weapp`
- API: `https://socthink.cn`
- 学生身份：Bearer session token，与 Web 共用用户/sessionVersion，不复制账号数据

## 页面

- 首页 `pages/home`
- 计算训练 `pages/arithmetic`
- 竞赛实战 `pages/competitions`
- 全真考试 `pages/exam`
- 逐题复盘 `pages/review`
- 赛事管理 `pages/events`
- 我的 `pages/profile`
- 登录 `pages/login`

## 本地验证

```bash
npm run verify:miniapp
```

该门禁执行独立 `npm ci`、TypeScript 校验、Taro 微信构建，并检查 8 个页面的编译产物。

## 微信开发者工具

当前 `project.config.json` 使用 `touristappid` 占位。读取微信公众平台真实 AppID 后，只修改 `appid`；AppSecret 不写入仓库。

开发者工具导入目录：`apps/miniapp`，`miniprogramRoot` 已设置为 `./dist`。
