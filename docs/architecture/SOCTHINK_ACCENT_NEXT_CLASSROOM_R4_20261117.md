# AccentLab · Next.js 原生课堂工作流 R4（2026-11-17）

状态：隔离候选；桌面/手机模拟测试通过；尚未替换旧 Vue V3。

## 唯一权威架构

- Next.js 16 App Router / React / TypeScript 是唯一正式 Web 方向；新增原生课堂候选 /english/pronunciation/next-lab/assignments 和私人邀请路由 /english/pronunciation/next-lab/assignments/[tenant]/[token]。两路由均 noindex；动态路由校验租户 UUID、64 位令牌并设置 no-referrer。
- 教师与学生统一使用 SOC THINK 微信登录和已有课堂 API /english/pronunciation/classroom-api。数据库继续使用 PostgreSQL 18 中既有 accent schema、教师/学生授权及 RLS；不另起第二套用户、作业、计费、API 进程。
- 教师可在自己的班级选择审核通过的句子集、发布作业、复制原生深链接到微信群、审核入班、读报告并给本人班级的学生写反馈；主动重发链接才撤销旧邀请。
- 学生通过老师分享的原生 URL 到达作业界面，链接自动填好；验证链接和微信身份、申请入班与获批、领取作业，然后按句录音、回听、提交现有课堂评分器。只接受服务端返回的有效 0–100 分和 attempt_id，不虚构录音或评分。
- 原始录音以 WebM/MP4 提交，最大 2 MiB；前端 30 秒自动停止。上传失败会保留同一 Blob 和同一个 x-request-id 以供幂等重试。录音服务端按现有课堂保留策略 30 天。
- 老师写入的反馈通过已有 my-attempts 端点，只按当前已验证 student_id、tenant_id、assignment_id 查询并返回给本人，不展示其他学生的数据。

## 本地验收证据

Z890 隔离工作区，本轮代码已验证：
- TypeScript、ESLint、Next.js 16.4.3 生产构建：PASS。
- 全站路由审计：98 模板，97 Next + 1 兼容 HTML；统一单前端治理 PASS。
- 英语平台与独立课堂契约：PASS。
- Playwright Chromium 24/24 PASS，桌面 12/12，Pixel 7 手机 12/12。覆盖 R1 跟读与 Rust 不可用、R2 双轨波形及单词局部评分、R3 班级与本人历史、R4 教师发布/审核/反馈、学生上传、HTTP 503 同一请求 ID 重试、未登录和异站邀请拒绝、原生深链接。
- 浏览器测试的 HTTP 评分响应使用受控夹具，浏览器麦克风是模拟设备；不是学生真人发音精度或生产微信身份的充分证明。

## 不能省略的生产 E3

Z890 对本机 127.0.0.1:18099 的只读健康探测返回拒绝连接，故不能宣称本轮已完成真实 OpenPronounce 端到端评分。生产真实 PostgreSQL 课堂权限、真实教师和学生微信会话、真实手机麦克风与评分准确性、录音留存/删除、跨学生拒绝访问、正式部署 SHA 和支付均另需核验。

先完成 R3 PR #359，再审 R4 PR #360；两者目前为 Draft。旧 Vue 正式 /english/pronunciation/app/practice-library 及既有 /english/pronunciation/app/a/... 分享链接、学生历史和录音数据继续保留。只有现有 CI-green 自动发布、精准版本核对、真实业务 E3、自动回退均满足时才允许变更正式入口。
