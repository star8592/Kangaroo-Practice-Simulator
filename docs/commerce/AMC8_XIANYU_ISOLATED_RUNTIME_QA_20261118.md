# AMC 8 闲鱼单次考试：隔离接入和实际回归（2026-11-18）

状态：独立开发分支；NOT DEPLOYED / NOT LIVE。主站生产运行进程和数据库均未修改，正在开发的代码仅置于孤立的 Git worktree。

## 最小改造

- 原 SOC THINK Next.js 题库 / ExamClient / exam-sessions / grade / DiagnosticReportView / PDF 代码全部复用，不重建考试产品、评分引擎或付费账本。
- marketplace-entitlement.ts：仅在 SOCTHINK_MARKETPLACE_EXAM_MODE=1 的第二实例启用，验证 License HMAC-SHA256 短效任务票据；用独立数据目录的原子文件创建将一次权益绑定至首个浏览器的 HttpOnly Cookie；拒绝异浏览器重复领取。
- /marketplace/claim 手机页：受控领取、续考或报告入口。/api/marketplace/claim POST 必须验证源站，领取成功后 303 跳转至原考试页面，不要求新账号或再次支付。
- /api/exam-sessions 已交卷后拒绝为同一权益再次建立考试；已有 report/PDF 只给本人下载，重复下载不扣次数。
- 普通主站运行不设置上述模式，保留原导航、用户登录、微信结算与原报告访问逻辑。第二实例必须独立端口、运行账户、数据目录与 PDF 内部地址。

## 上线前必须配置的隔离环境

| 名称 | 说明 |
| --- | --- |
| SOCTHINK_MARKETPLACE_EXAM_MODE | 第二实例设置 1，主站不设置 |
| SOCTHINK_MARKETPLACE_PUBLIC_ORIGIN | 第二实例明确 HTTPS Origin |
| SOCTHINK_MARKETPLACE_HANDOFF_SECRET | 与 License 对端共享的独立高熵随机密钥（不入库） |
| SOCTHINK_MARKETPLACE_AMC8_EXAM_ID | 本次使用就绪的 maa-amc8-2024-user-owned |
| SOCTHINK_MARKETPLACE_DATA_DIR | 第二实例私有 grant 数据目录 |
| SOCTHINK_USER_DATA_DIR | 第二实例私有用户密钥目录，不能嵌套或指向主站目录 |
| PDF_INTERNAL_ORIGIN | 第二实例的内部访问地址，不能是主站 |
| PORT | 与主站不同的独立端口 |

现有 exam-bundle-store、exam-session 与 attempt-store 使用 process.cwd() 下的 private/exams 或 private/users，所以第二实例必须有隔离的 cwd/容器卷。AMC8 试卷副本需来源可审计、版本锁定、只读；主站已有用户作答和 PDF 文件不可共享。

## 真实测试记录

- 权益/安全测试 15/15 PASS：伪票据、过期、已兑二次抢占、同身份恢复、跨目录保护、主站不接受市场身份。
- Next 接口测试 5/5 PASS：Origin 校验、303 跳转、HttpOnly Cookie、跨浏览器拒绝和恢复。
- TypeScript 检查 PASS。
- 现有合法资料库中的 2024 AMC8 双语卷（25题，40分钟）复制为单独 QA 临时文件，现有训练就绪判定通过；未纳入公开 Git。
- 独立 Next.js 16.4.3 本地 QA（webpack 模式以绕开当前机器 Turbopack 的 build-manifest 缺失）：9/9 PASS，流程：合成签名的已付订单票据 → 真实 25 题领取页面 → 原考试组件 → 原考试会话 → 原评分 → 原诊断报告 → 实际 PDF 下载；再测已交卷不能二次开考、他人拒绝下载、另一个浏览器不能再次领取、本人可重新下载 PDF。
- 实际 PDF：1,107,695 字节，SHA256 前20位 5f4e611024ba7b214c1e。测试为模拟买家空白作答，证明真实引擎和 PDF 可运行，不代表报告内容质量验收。
- 对端 License 变更见 CommerceFlow PR #379。其许可任务与历史上传任务测试合计 7 项通过、Ruff PASS。对端已实现指定已付款证据格式的任务入口和签名票据，但证据仍由受权上游提交，不能替代真实 DevControl 闲鱼付款独立核验。

## 发版阻断

1. DevControl 实际卖家页面对订单/付款状态/买家/SKU 独立回读并留存证明，不能仅信调用方提供的 seller_paid_state。
2. 真实 License 与第二考试实例配置/部署联调，退款撤销及时同步给已兑权益，平台聊天实际发出和消息气泡回读；未做真实实单前不得发权。
3. 移动端真机 360/390/430px、微信浏览器、Android Chrome、iOS Safari，中文 A4 PDF 题图/分页/字体/数学内容专项核查。
4. 目前一次考试使用单服务进程的文件型作答记录；横向部署多进程前要加跨进程互斥/事务控制。
5. 一笔受控真实闲鱼支付全程验收以及主站原用户/报告/支付/后台回归。任何项缺失，保留 NOT_LIVE，不发布。
