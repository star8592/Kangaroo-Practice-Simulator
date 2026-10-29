# SOCTHINK 客户反馈闭环 MVP

日期 2026-10-29。状态：隔离分支本地实现，未部署生产。

目标：用户在考试后直接反馈题目、解答和测评报告；运营端分类汇总并优先修复；重复考试和客户回访验证改善效果。

## 实际能力
- /result 考后评分、意见分类、选填1-5星、最多400字反馈；成功保存才显示成功。
- /review 单题解析后提供该题纠错入口，指向本人真实已完成的考试及题目。
- POST /api/student/feedback 限制登录、本人完成考试、题目归属、内容长度、跨站来源；支持请求幂等与按用户每日10条限流。
- 反馈存放在现有 SOCTHINK_USER_DATA_DIR 下的 customer-feedback 子目录。按用户不可逆哈希、日期和请求ID分别存储，文件无实名信息。不写Git或公开网页。
- 运营统计：运行 npx tsx scripts/customer_feedback_summary.ts 14，汇总过去14天问题类型、评分和卷子数量，不显示儿童姓名或联系方式。
- 本地回归：npx tsx scripts/test_customer_feedback.ts

## 客户驱动改进顺序
1. 严重题目和答案错误（复核后修订或撤下）。
2. 解析不清楚、图文/视频解释缺失。
3. 诊断报告与实际水平不符。
4. 手机交互、登录和交卷体验。
5. 其他建议。
禁止未核对证据就自动修改答案；投诉数、原因、修复时间、用户再次反馈需进入运营工作流。

## 正式发布前
- 必须校验生产用户数据持久卷、访问权限、备份、用户删除申请和日志脱敏。
- 用真实客户端完成登录、考试、交卷、反馈、服务器独立读回；并验证跨账号、错题号拒绝。
- 现有微信支付是否能真实收款、签名回调、权益、退款及对账仍待独立E3验收，不在本分支更改生产支付配置。
- 本分支不发布公开内容，不修改原主线未提交的朗读、竞赛和题库工作。
- 第三方试题与OCR候选不自动获得商业分发许可。

证据等级：E1 本地实现测试；E2 实际主机可用性；E3 外部客户提交并处理反馈的闭环；E4 连续运营指标改善。


## 浏览器回归
在独立 worktree 的合成用户数据环境中启动 Next 服务器（不允许指向生产站）。
使用本地地址显式开启测试：
- SOCTHINK_E2E_SYNTHETIC=1
- E2E_EXTERNAL_SERVER=1
- E2E_BASE_URL=http://127.0.0.1:4379
- PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome

运行：npx playwright test tests/e2e/customer-feedback.spec.ts --project=desktop-chromium --project=mobile-chromium
此测试会在当前 worktree 非公开 private/users 下创建合成用户与考试快照；未显式启用或非本机地址时跳过。
真实浏览器测试发现 Next.js req.nextUrl.host 与实际 Host 不一定一致，已改为按请求 Host 校验同源，避免正常反馈被误报为跨站。
