# Socthink Math 微信小程序

定位：计算训练 + 竞赛实战 + 赛事管理服务。小程序是高频入口，`socthink.cn` 继续作为完整 Web 工作台和共享 API 后端。

## 技术栈

- Taro 4.3.0
- React 18 + TypeScript
- 微信小程序原生构建目标 `weapp`
- API: `https://socthink.cn`
- 学生身份：Bearer session token，与 Web 共用用户/sessionVersion，不复制账号数据
- 已注册 AppID：`wxbedb9b3142d93f95`

AppID 可提交到仓库；AppSecret、代码上传私钥、登录 Cookie 等任何凭据都不得写入 Git。

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

## 微信后台配置

微信公众平台的 `开发管理 → 开发设置 → 服务器域名` 中，至少把下面域名加入 `request` 合法域名：

```text
https://socthink.cn
```

`project.config.json` 已使用正式 AppID，不再使用 `touristappid`。开发者工具导入目录为 `apps/miniapp`，`miniprogramRoot` 已设置为 `./dist`。

## CI 预览与上传

在微信公众平台 `开发管理 → 开发设置` 中生成/下载“小程序代码上传”私钥。私钥只能保存在本机受控目录，默认路径：

```text
~/.config/socthink/miniprogram-ci/private.wxbedb9b3142d93f95.key
```

权限必须为 `600`。该路径及仓库内 `.secrets/`、`private.*.key` 已明确禁止进入 Git。

生成体验版二维码：

```bash
npm run miniapp:preview
```

上传开发版本：

```bash
MINIAPP_VERSION=0.1.0 npm run miniapp:upload
```

两个命令在调用微信 `miniprogram-ci` 前都会强制重新执行小程序质量门禁并重建 `dist`，不会上传旧构建产物。发布工具固定使用 `miniprogram-ci@2.1.31`，安装在用户缓存目录而非小程序运行依赖中。
