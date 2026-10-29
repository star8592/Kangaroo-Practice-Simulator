# SOCTHINK 正式管理员邮箱邀请激活流程

日期：2026-10-30。使用现有数学 GitHub 仓库 star8592/Kangaroo-Practice-Simulator（不是独立项目）。

## 用户问题与验证
生产截图中的邮箱未登记为管理员；生产系统此前只有1个启用的旧测试管理员 admin_test。旧版管理员登录校验把合法网站来源误判为 403，已单独修复于 PR #141，公网 SHA daf1b2f 验证同源请求进入账号判定、外域仍被拒绝。

## 目标
由所有者授权的目标邮箱完成邮箱占有权证明后，用户在 SOCTHINK HTTPS 官网页面自行设置新管理员密码，自动获得现有8小时严格 SameSite 的管理员会话并进入 /admin/feedback。不让聊天、邮件或代码仓库接触真实密码。

## 操作顺序
1. PR 经过 GitHub CI 和真实浏览器 E2E 后合并，通过原生产自动部署程序确认公网 SHA。
2. 在**生产服务器**通过SSH执行服务端 CLI（仅管理员可执行），输入已经得到所有者授权的邮箱：./node_modules/.bin/tsx scripts/issue_admin_invitation.ts --email <目标邮箱>。仅有本地调用返回的一次性随机高熵链接，文件仅保留 SHA-256 摘要和已批准的目标邮箱；邀请24小时有效。
3. 只将邀请链接发送到**对应目标邮箱**，不放在聊天、Issue、PR、公共日志或网站 SEO；链接的密钥位于 URL fragment，浏览器载入后立即清掉。
4. 邮箱所有者亲自访问链接，用本人选择的12～128字符强密码激活。后端收到完整令牌、同站请求和双重确认后创建原有 auth 系统中的正式 admin 账号；令牌消费后立即删除，重复使用失败。
5. 真实管理员确认可以登录 /admin/feedback，原有学生/家长账号、订单和考试记录不变。只有正式账号成功登录并核实后，才可再考虑撤销旧测试管理员；不得自动降权、重置或泄漏旧账号。
6. 若24小时过期，不可在未再次核实授权的情况下将同一个令牌续期，重新签发时依然需要同一已确认邮箱。

## 本地验证
- npx tsx scripts/test_admin_invitation.ts ：token 哈希、过期、单次使用、账号权限、Cookie、跨站拒绝。
- npm run verify:public。
- Playwright Chrome 桌面和手机，显式合成数据 + 独立测试端口：SOCTHINK_E2E_SYNTHETIC=1 E2E_BASE_URL=http://127.0.0.1:4381 E2E_EXTERNAL_SERVER=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome npx playwright test tests/e2e/admin-invitation.spec.ts --workers=1 --project=desktop-chromium --project=mobile-chromium。

## 安全声明
任何人都不能直接通过网页申请管理员邀请；/admin/activate 只接收经服务端受控签发的一次性令牌。管理员密码绝不通过邮件、聊天或脚本传送。既有 admin_test 保留至新管理员确实验证成功，保证回退。生产邀请令牌的明文只存在一次性的发信执行内存中，不在最终回执、公开网页或工单内展示。
