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


## 2026-11-17 真实数据库 + 实际评分器第二阶段回执

在 Z890 上，OpenPronounce 原服务监听本机 127.0.0.1:8099（/health HTTP 200）；主站生产机通过既有隧道，在它自己的回环 127.0.0.1:18099 上 /health 返回 HTTP 200。两机回环端口用途不同，不能依据 Z890 的 18099 空监听误判生产评分服务不可用。

执行仓库既有隔离集成测试（非模拟成绩 API）：
`ACCENTLAB_MIGRATIONS_DIR=/home/master/projects/accentlab-classroom-remove-20261115/migrations ACCENTLAB_E2E_CANARY=/home/master/projects/zoryvia-classroom/.local/wss-smoke/synthetic.webm npx tsx scripts/test_classroom_direct_teacher_grant_e2e.ts`

实际回执：
- `SOCTHINK_NATIVE_DIRECT_TEACHER_GRANT_E2E_PASS ... real_scorer=true isolated_pg18=true`
- `NATIVE_CLASSROOM_FIVE_STUDENT_REPORT_PASS total=5 completed=5`
- `STUDENT_OWN_TEACHER_FEEDBACK_PG18_RLS_PASS`，确认学生甲可以读到老师写给自己的反馈，同班学生乙读不到该反馈。
- `STUDENT_APPLY_AND_TEACHER_DIRECT_ASSIGN_BIDIRECTIONAL_PASS`
- `STUDENT_REMOVE_REAPPLY_HISTORY_PRESERVED_E2E_PASS`
- `ISOLATED_PG_POOL_CLOSED_PASS` / `ISOLATED_TEST_STORAGE_CLEANED true`

真实 PostgreSQL 18 由测试临时创建，采用最小特权用户与 FORCE RLS，使用合成微信会话签名、合成学生数据和合成音频；测试完成后销毁。没有往正式 accent_lab 或真实学生账户写入数据。

公开站在该阶段的只读验证：`GET /english/pronunciation/classroom-api/health` = HTTP 200（`postgres-select-1-v1`）；匿名 `GET .../me` = HTTP 401，符合微信身份保护。主站 `/api/release` 当时仍报告 R2 旧 SHA，故本轮不宣称 R3 或 R4 生产已经部署，也不宣称真人学生实机评分通过。

注意：上方“生产 E3”列表中 **隔离真实评分器及数据库联调已通过**，但 **生产真人微信与实体手机联动、生产音频留存清理、正式发布 SHA** 仍是独立未完成项。
