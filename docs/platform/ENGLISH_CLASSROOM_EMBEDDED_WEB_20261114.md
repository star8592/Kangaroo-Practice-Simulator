# 英语教师作业合并进入 SOC THINK Web（2026-11-14）

## 唯一运行架构
- 正式网站仍为 https://socthink.cn ，用户只用 SOC THINK 已验证的微信会话。
- 教师授权、建班、录入名单、分享群链接、学生申请入班、录音成绩和教师报告由现有 Next.js Web 进程处理，路由为 /english/pronunciation/classroom-api/*。
- 无独立 accent-secure-classroom.service，无新增教师 OAuth、第二套运营后台或 PostgreSQL 实例。
- 复用现有 PostgreSQL 18.7 实例内 accent_lab 数据库、25 张原有强制 RLS 表和已有非超级用户 accentclass 角色。每次业务操作在单一事务设置 app.account_id/app.tenant_id；站点管理员由主站校验过的 isSiteOwner 决定。
- 学生跟读复用原有 OpenPronounce http://127.0.0.1:18099/pronunciation。评分音频由现有 Node 进程写入不公开的录音目录，API 验证班级及师生权限后才允许读取。
- 原生接口保留 AccentLab 前端 E17 的路径和 JSON 字段约定，避免再做另一套教师界面。

## 生产依赖
1. 将 Web 运行进程的 SOCTHINK_CLASSROOM_DATABASE_URL 设置为 accent_lab 数据库的非特权 accentclass 连接；仅应用服务器能读取此机密，不在代码和浏览器中存储密码。
2. 现有 Node 进程必须对 SOCTHINK_CLASSROOM_RECORDINGS_DIR 有私有写入权限，建议使用 /var/lib/socthink/accent-classroom/recordings，目录 0700，录音 0600。
3. HTTPS /english/pronunciation/classroom-api/* 由主站 Next.js 接管，不增加独立服务端口，不再指向旧 Rust 18821 端口。Nginx 不得覆盖到独立课堂代理。
4. 老版老师网页启用 VITE_HOMEWORK_REAL=1 之前，必须验证 GET /health 为 HTTP 200 且 readiness=postgres-select-1-v1，GET /me 在无 Cookie 时为 HTTP 401。
5. 真微信老师申请 → 站点所有者批准 → 建班/花名册 → 群链接 → 学生微信入班 → 老师确认 → 浏览器录音、OpenPronounce 真评分 → 交齐 → 老师报告回收，全部真实通过才宣布可用。
6. 到期录音物理清理尚需接入主站现有维护流程并核查，不可将过期检查/数据库字段冒充物理删除已完成。
7. 新版生产发布使用主站既有的绿色验收、原子切换及自动回滚，不操作 PostgreSQL 版本和原有发音评分服务。

## 实施状态（不得混淆）
本分支已经加入原生 Next.js 教师作业代码。隔离代码审查及 CI 在推进；**真实数据库连接、生产主站部署、真微信及真实音频全链尚未验收，现阶段不得称已上线**。原 Rust E17 测试保留为对照实现，不作为生产必须运行的第二个服务。

## 需要的真实接口
- GET /health、GET /me、GET /teacher/access、POST /teacher/apply
- GET /admin/teachers、POST /admin/teachers/:id/decision
- POST /teacher/onboard、GET /teacher/classes、POST /teacher/classes/create
- GET/POST /tenants/:tenant/classes/:class/catalog、assignments、expected-roster、join-requests
- GET/POST /tenants/:tenant/a/:token (join、join-status、claim、wall、activity、items/:id/attempts)
- GET /tenants/:tenant/assignments/:assignment/report、my-attempts
- POST /tenants/:tenant/assignments/:assignment/feedback
- GET /tenants/:tenant/recordings/:attempt
