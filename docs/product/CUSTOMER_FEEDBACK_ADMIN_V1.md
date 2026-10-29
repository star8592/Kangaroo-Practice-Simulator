# SOCTHINK 客户反馈管理台 v1（2026-10-30）

本迭代仍在 GitHub 原仓库 star8592/Kangaroo-Practice-Simulator 进行，直接基于 origin/main SHA 30ce67c；不新增 GitHub 仓库、不改生产支付、不重写数学竞赛前端。

## 客户闭环
原考试成绩页和逐题复盘已支持本人提交反馈；本迭代在已有管理员导航增加“客户反馈”入口 /admin/feedback，并在 /admin 运营首页展示最近30天真实反馈数量与优先核查数。

后台按真实问题类型排队：题目/答案 > 报告争议 > 解析难懂 > 操作体验 > 其他。支持按日期、考试 ID、题目 ID 定位问题。后台数据仅管理员可见，并且 robots noindex、不公开下载。字段里不包含用户ID和身份，常见手机号、证件号、邮箱在显示前遮蔽。

当前是**只读分类与发现问题**，不是自动替考生改卷，也不是已经闭环处理完毕。实际运营下一步需补：核查证据、处理状态、发布修订及回访验证。谨慎对待用户自由文本，敏感身份可能不能完全靠规则遮蔽；授权管理员应人工保护。

## 可复现检查
- npx tsx scripts/test_customer_feedback_admin.ts
- npm run verify:public
- 在独立本地测试服务器且显式启用合成数据时：
  SOCTHINK_E2E_SYNTHETIC=1 E2E_BASE_URL=http://127.0.0.1:4380 E2E_EXTERNAL_SERVER=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome npx playwright test tests/e2e/customer-feedback-admin.spec.ts --project=desktop-chromium --project=mobile-chromium

本轮检查：匿名访问后台跳转登录，管理员能看到实际写入的合成反馈，手机及桌面两套浏览器测试2/2通过。任何正式上线都仍需 GitHub CI、SHA 精确一致、自动回滚和公网访问验收。

## 经营口径
没有真实客户反馈绝不虚构好评、满意度或收入。用户自己复测率、反馈改正时间、真实付费与退款须基于独立证据。免费/低价试卷与会员运营先看用户真实感受和复购，再决定扩类及自动产量。
