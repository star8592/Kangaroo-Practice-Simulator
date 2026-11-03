# SOC THINK 逐页页面架构归属审计总账

> 唯一架构权威仍是 [全站信息架构总纲](SOCTHINK_SITE_ARCHITECTURE_MASTER.md)。本文是由当前代码生成的逐页审计附录，不能用来替代总纲。

代码快照：`65146101d5aaa3c5d7b1e008f42c2ea244a4a2d5`

本次枚举：**75 个网页模板、70 个 API handler、8 个小程序页面源文件**。动态路由仅按文件模板计数，不等于线上真实 URL 数。

**审计方法界限：**通过源码扫描寻找字面 URL 引用。JSX 运行时拼链、重定向、搜索结果、历史外链、登录后可见入口、微信小程序导航与数据库商品实例可能无法由静态搜索发现。无引用只列为候选，不能直接宣布为孤儿；线上可用性仍需浏览器与真实 HTTP 核实。

## 1. 网页逐页总表

| 路由模板 | 主归属 | 层级 | 权限/索引边界 | 源码中的入口线索（最多 2 条） |
| --- | --- | --- | --- | --- |
| `/` | 全站首页 | L0 | public | `src/app/login/page.tsx`、`src/components/UnifiedLoginClient.tsx` |
| `/account` | 账户和记录 | flow | private-or-conditional | `src/app/digital-purchase-policy/page.tsx`、`src/app/digital-purchase-policy/v1/page.tsx` |
| `/admin` | 运营后台 | private | restricted | `src/app/admin/families/page.tsx`、`src/app/admin/feedback/page.tsx` |
| `/admin/activate` | 运营后台 | private | restricted | 未检出字面路径，待核实 |
| `/admin/competition-source-watch` | 运营后台 | private | restricted | `src/components/AdminStudents.tsx` |
| `/admin/families` | 运营后台 | private | restricted | `src/app/admin/page.tsx`、`src/components/AdminOperationsNav.tsx` |
| `/admin/feedback` | 运营后台 | private | restricted | `src/app/admin/activate/AdminActivationClient.tsx`、`src/app/admin/page.tsx` |
| `/admin/login` | 运营后台 | private | restricted | `src/app/admin/families/page.tsx`、`src/app/admin/feedback/page.tsx` |
| `/admin/questions` | 运营后台 | private | restricted | `src/app/admin/seo/page.tsx`、`src/components/AdminOperationsNav.tsx` |
| `/admin/seo` | 运营后台 | private | restricted | `src/app/admin/page.tsx`、`src/components/AdminOperationsNav.tsx` |
| `/admin/students` | 运营后台 | private | restricted | `src/app/admin/seo/page.tsx`、`src/app/admin/students/[id]/page.tsx` |
| `/admin/students/[id]` | 运营后台 | private | restricted | `src/components/AdminStudents.tsx` |
| `/arithmetic` | 全部考试（兼容旧短路径） | L2 | conditional | `src/app/account/page.tsx`、`src/app/math-practice/page.tsx` |
| `/arithmetic/discovery/[grade]` | 全部考试（兼容旧短路径） | L2 | conditional | `src/components/ArithmeticDashboard.tsx`、`src/components/StructureDiscoveryClient.tsx` |
| `/arithmetic/print` | 全部考试（兼容旧短路径） | L2 | conditional | `src/components/ArithmeticDashboard.tsx`、`src/lib/assessment-platform.ts` |
| `/arithmetic/print/export` | 全部考试（兼容旧短路径） | L2 | conditional | 未检出字面路径，待核实 |
| `/arithmetic/session/[grade]` | 全部考试（兼容旧短路径） | L2 | conditional | `src/components/ArithmeticDashboard.tsx` |
| `/assessment-center` | 测评中心 | L1 | public | `src/app/account/page.tsx`、`src/app/assessment-center/[id]/page.tsx` |
| `/assessment-center/[id]` | 测评中心 | L3 | conditional | `src/app/assessment-center/about/page.tsx`、`src/app/assessment-center/advanced-reasoning-40/page.tsx` |
| `/assessment-center/about` | 测评中心 | L2 | conditional | `src/app/assessment-center/page.tsx`、`src/components/AssessmentTrustBrief.tsx` |
| `/assessment-center/advanced-reasoning-40` | 测评中心 | L2 | conditional | `src/lib/assessment-evidence.ts` |
| `/assessment-center/career-aptitude-40` | 测评中心 | L2 | conditional | `src/app/career/page.tsx`、`src/lib/assessment-evidence.ts` |
| `/assessment-center/methodology` | 测评中心 | L2 | conditional | `src/app/assessment-center/about/page.tsx`、`src/app/assessment-center/page.tsx` |
| `/assessment-center/reading-practice-16` | 测评中心 | L2 | conditional | `src/lib/assessment-evidence.ts`、`src/lib/measurement-center.ts` |
| `/assessment-center/reasoning-practice-20` | 测评中心 | L2 | conditional | `src/lib/assessment-evidence.ts`、`src/lib/measurement-center.ts` |
| `/assessment-center/report-preview` | 测评中心 | L2 | conditional | `src/app/assessment-center/page.tsx`、`src/components/ReportPremiumPanel.tsx` |
| `/assessment-center/sql-lab` | 测评中心 | L2 | conditional | 未检出字面路径，待核实 |
| `/assessment-center/work-style-24` | 测评中心 | L2 | conditional | `src/lib/assessment-evidence.ts` |
| `/assessment-center/work-values-30` | 测评中心 | L2 | conditional | `src/lib/assessment-evidence.ts` |
| `/assessment-center/workplace-sjt-24` | 测评中心 | L2 | conditional | `src/lib/assessment-evidence.ts` |
| `/assessments` | 全部考试 | L1 | public | `src/app/account/page.tsx`、`src/app/career/companies/page.tsx` |
| `/career` | 职业岗位 | L1 | public | `src/app/career/companies/page.tsx`、`src/app/career/exams/[id]/page.tsx` |
| `/career/companies` | 职业岗位 | L2 | conditional | `src/app/career/page.tsx` |
| `/career/exams/[id]` | 职业岗位 | L3 | conditional | `src/app/skill-labs/agent-foundations/page.tsx`、`src/components/CareerInterviewClient.tsx` |
| `/career/guides/[id]` | 职业岗位 | L3 | conditional | 未检出字面路径，待核实 |
| `/career/interviews` | 职业岗位 | L2 | conditional | `src/app/career/interviews/[id]/page.tsx`、`src/app/career/page.tsx` |
| `/career/interviews/[id]` | 职业岗位 | L3 | conditional | 未检出字面路径，待核实 |
| `/career/roles/[id]` | 职业岗位 | L3 | conditional | 未检出字面路径，待核实 |
| `/competitions` | 全部考试（兼容旧短路径） | L2 | conditional | `src/app/student/cards/page.tsx`、`src/components/AssessmentPortalClient.tsx` |
| `/digital-purchase-policy` | 政策和帮助 | support | public | `src/app/account/page.tsx`、`src/app/digital-purchase-policy/v1/page.tsx` |
| `/digital-purchase-policy/v1` | 政策和帮助 | support | public | `src/app/account/page.tsx`、`src/app/digital-purchase-policy/page.tsx` |
| `/events` | 全部考试（兼容旧短路径） | L2 | conditional | `src/app/student/calendar/page.tsx`、`src/components/CompetitionIntelligencePanel.tsx` |
| `/exam-planner` | 全部考试（兼容旧短路径） | L2 | conditional | `src/components/AssessmentPortalClient.tsx`、`src/components/ExamDirectory.tsx` |
| `/exam/[examId]` | 全部考试（兼容旧短路径） | L4 | conditional | `src/app/student/page.tsx`、`src/components/HomeClient.tsx` |
| `/login` | 账户和记录 | flow | private-or-conditional | `src/app/account/page.tsx`、`src/app/admin/competition-source-watch/page.tsx` |
| `/math-practice` | 全部考试（兼容旧短路径） | L2 | conditional | `src/lib/site-architecture.ts` |
| `/membership` | 账户和记录 | flow | private-or-conditional | `src/app/account/page.tsx`、`src/app/digital-purchase-policy/page.tsx` |
| `/parent` | 账户和记录 | flow | private-or-conditional | `src/components/ArithmeticDashboard.tsx` |
| `/parent/login` | 账户和记录 | flow | private-or-conditional | `src/app/parent/report/[studentId]/[attemptId]/page.tsx` |
| `/parent/register` | 账户和记录 | flow | private-or-conditional | 未检出字面路径，待核实 |
| `/parent/report/[studentId]/[attemptId]` | 账户和记录 | flow | private-or-conditional | 未检出字面路径，待核实 |
| `/privacy` | 政策和帮助 | support | public | `src/components/SiteFooter.tsx` |
| `/report/[attemptId]` | 全部考试（兼容旧短路径） | L4 | conditional | 未检出字面路径，待核实 |
| `/resources` | 真题资料 | L1 | public | `src/app/account/page.tsx`、`src/app/admin/page.tsx` |
| `/resources/competitions/[slug]` | 真题资料 | L3 | conditional | 未检出字面路径，待核实 |
| `/result` | 全部考试（兼容旧短路径） | L4 | conditional | `src/components/ExamClient.tsx`、`src/lib/site-architecture.ts` |
| `/review` | 全部考试（兼容旧短路径） | L4 | conditional | `src/components/AssessmentPortalClient.tsx`、`src/components/ResultClient.tsx` |
| `/search` | 全站搜索 | L0 | noindex | `src/components/ExamDirectory.tsx`、`src/components/PublicHome.tsx` |
| `/shop` | 数字商城 | L1 | public | `src/app/membership/MembershipClient.tsx`、`src/app/search/page.tsx` |
| `/shop/[productId]` | 数字商城 | L3 | conditional | `src/app/shop/page.tsx` |
| `/skill-labs` | 技能实训 | L1 | public | `src/app/search/page.tsx`、`src/app/skill-labs/agent-foundations/page.tsx` |
| `/skill-labs/agent-foundations` | 技能实训 | L2 | conditional | `src/app/career/page.tsx`、`src/app/skill-labs/page.tsx` |
| `/skill-labs/books` | 技能实训 | L2 | conditional | `src/app/search/page.tsx`、`src/app/skill-labs/books/[slug]/page.tsx` |
| `/skill-labs/books/[slug]` | 技能实训 | L3 | conditional | 未检出字面路径，待核实 |
| `/skill-labs/code-lab` | 技能实训 | L2 | conditional | `src/app/career/page.tsx`、`src/app/skill-labs/page.tsx` |
| `/skill-labs/engineering-mock` | 技能实训 | L2 | conditional | `src/app/career/page.tsx`、`src/app/skill-labs/page.tsx` |
| `/skill-labs/engineering/[track]` | 技能实训 | L3 | conditional | 未检出字面路径，待核实 |
| `/skill-labs/sql-lab` | 技能实训 | L2 | conditional | `src/app/assessment-center/sql-lab/page.tsx`、`src/app/career/page.tsx` |
| `/skill-labs/webgpu-basics` | 技能实训 | L2 | conditional | `src/app/skill-labs/page.tsx`、`src/components/PublicHome.tsx` |
| `/student` | 账户和记录 | flow | private-or-conditional | `src/app/account/page.tsx`、`src/app/admin/questions/page.tsx` |
| `/student/calendar` | 账户和记录 | flow | private-or-conditional | `src/app/student/page.tsx`、`src/components/WorldCompetitionHub.tsx` |
| `/student/cards` | 账户和记录 | flow | private-or-conditional | `src/app/student/page.tsx`、`src/components/MathCardReveal.tsx` |
| `/student/settings` | 账户和记录 | flow | private-or-conditional | `src/app/student/page.tsx` |
| `/terms` | 政策和帮助 | support | public | `src/components/SiteFooter.tsx` |
| `/verification` | 账户和记录 | flow | private-or-conditional | `src/components/MathVerificationBadge.tsx` |

## 2. 未检出源码入口的候选页面

下面每项仍可能由动态 URL、考试状态跳转、个人中心或搜索发现。逐项找实证，不能直接删除。

| 页面 | 优先检查 |
| --- | --- |
| `/arithmetic/print/export` | 上级页面入口、实际业务流、旧 URL 兼容、breadcrumb、canonical |
| `/assessment-center/sql-lab` | 上级页面入口、实际业务流、旧 URL 兼容、breadcrumb、canonical |
| `/career/guides/[id]` | 上级页面入口、实际业务流、旧 URL 兼容、breadcrumb、canonical |
| `/career/interviews/[id]` | 上级页面入口、实际业务流、旧 URL 兼容、breadcrumb、canonical |
| `/career/roles/[id]` | 上级页面入口、实际业务流、旧 URL 兼容、breadcrumb、canonical |
| `/report/[attemptId]` | 上级页面入口、实际业务流、旧 URL 兼容、breadcrumb、canonical |
| `/resources/competitions/[slug]` | 上级页面入口、实际业务流、旧 URL 兼容、breadcrumb、canonical |
| `/skill-labs/books/[slug]` | 上级页面入口、实际业务流、旧 URL 兼容、breadcrumb、canonical |
| `/skill-labs/engineering/[track]` | 上级页面入口、实际业务流、旧 URL 兼容、breadcrumb、canonical |

## 3. API handler 归属（不是公众页面）

| API 模板 | 业务或基础设施 |
| --- | --- |
| `/api/academic-events/enrollment` | 全部考试 |
| `/api/access/catalog` | 统一账户/授权 |
| `/api/access/me` | 统一账户/授权 |
| `/api/admin/activate` | 运营后台 |
| `/api/admin/competition-source-watch` | 运营后台 |
| `/api/admin/feedback-cases` | 运营后台 |
| `/api/admin/login` | 运营后台 |
| `/api/admin/questions` | 运营后台 |
| `/api/admin/students` | 运营后台 |
| `/api/arithmetic/next-session` | 全部考试 |
| `/api/arithmetic/print/pdf` | 全部考试 |
| `/api/arithmetic/sessions` | 全部考试 |
| `/api/arithmetic/students` | 全部考试 |
| `/api/assessment-reports/full` | 测评中心 |
| `/api/assessment-reports/offer` | 测评中心 |
| `/api/assessments/catalog` | 测评中心 |
| `/api/auth/guest/start` | 统一账户/授权 |
| `/api/auth/login` | 统一账户/授权 |
| `/api/auth/logout` | 统一账户/授权 |
| `/api/auth/me` | 统一账户/授权 |
| `/api/auth/miniapp/guest` | 统一账户/授权 |
| `/api/auth/miniapp/login` | 统一账户/授权 |
| `/api/auth/miniapp/wechat` | 统一账户/授权 |
| `/api/auth/parent/login` | 统一账户/授权 |
| `/api/auth/parent/logout` | 统一账户/授权 |
| `/api/auth/parent/me` | 统一账户/授权 |
| `/api/auth/parent/password/forgot` | 统一账户/授权 |
| `/api/auth/parent/password/reset` | 统一账户/授权 |
| `/api/auth/parent/register/start` | 统一账户/授权 |
| `/api/auth/parent/register/verify` | 统一账户/授权 |
| `/api/auth/parent/status` | 统一账户/授权 |
| `/api/auth/parent/wechat/callback` | 统一账户/授权 |
| `/api/auth/parent/wechat/qr` | 统一账户/授权 |
| `/api/auth/parent/wechat/qr/status` | 统一账户/授权 |
| `/api/auth/parent/wechat/start` | 统一账户/授权 |
| `/api/auth/pin` | 统一账户/授权 |
| `/api/career/exam/[id]/grade` | 职业岗位 |
| `/api/career/exam/[id]/session` | 职业岗位 |
| `/api/career/exam/history` | 职业岗位 |
| `/api/career/interviews/followup` | 职业岗位 |
| `/api/competition-companion/progress` | 全部考试 |
| `/api/competition-follow` | 全部考试 |
| `/api/competition-intelligence` | 全部考试 |
| `/api/exam-sessions` | 全部考试 |
| `/api/exam-sessions/recovery` | 全部考试 |
| `/api/exams/[examId]` | 全部考试 |
| `/api/family/active-student` | 历史账户/家庭接口 |
| `/api/family/students` | 历史账户/家庭接口 |
| `/api/grade` | 全部考试 |
| `/api/internal/commerce/students` | 内部服务 |
| `/api/math-engine/cognition` | 全部考试 |
| `/api/math-engine/signals` | 全部考试 |
| `/api/miniapp/arithmetic/session` | 小程序契约 |
| `/api/miniapp/china-competitions` | 小程序契约 |
| `/api/miniapp/companions` | 小程序契约 |
| `/api/miniapp/exams` | 小程序契约 |
| `/api/miniapp/review` | 小程序契约 |
| `/api/miniapp/world-competitions` | 小程序契约 |
| `/api/parent/reports/[studentId]/[attemptId]/pdf` | 历史账户/家庭接口 |
| `/api/payments/wechat/checkout` | 支付/统一账本 |
| `/api/payments/wechat/notify` | 支付/统一账本 |
| `/api/payments/wechat/orders/[orderId]` | 支付/统一账本 |
| `/api/release` | 未分配 |
| `/api/reports/[attemptId]/pdf` | 全部考试（兼容旧短路径） |
| `/api/resources/download/[resourceId]` | 真题资料 |
| `/api/solutions/[questionId]` | 全部考试 |
| `/api/student/analytics` | 成绩及账户 |
| `/api/student/cards/result-state` | 成绩及账户 |
| `/api/student/feedback` | 成绩及账户 |
| `/career/guides/[id]/download` | 职业岗位 |

## 4. 小程序独立页面
- `apps/miniapp/src/pages/arithmetic/index.tsx`
- `apps/miniapp/src/pages/competitions/index.tsx`
- `apps/miniapp/src/pages/events/index.tsx`
- `apps/miniapp/src/pages/exam/index.tsx`
- `apps/miniapp/src/pages/home/index.tsx`
- `apps/miniapp/src/pages/login/index.tsx`
- `apps/miniapp/src/pages/profile/index.tsx`
- `apps/miniapp/src/pages/review/index.tsx`

## 5. 根布局与页面重复 main 地标

根布局 src/app/layout.tsx 已声明一个 main。以下页面代码中仍直接含有 main 标签，必须审查为重复主地标的风险，不应简单断言 CSS 不受影响。
- `/admin` — `src/app/admin/page.tsx`
- `/admin/activate` — `src/app/admin/activate/page.tsx`
- `/admin/feedback` — `src/app/admin/feedback/page.tsx`
- `/admin/seo` — `src/app/admin/seo/page.tsx`
- `/career/companies` — `src/app/career/companies/page.tsx`
- `/skill-labs/agent-foundations` — `src/app/skill-labs/agent-foundations/page.tsx`
- `/skill-labs/engineering-mock` — `src/app/skill-labs/engineering-mock/page.tsx`
- `/skill-labs/engineering/[track]` — `src/app/skill-labs/engineering/[track]/page.tsx`
- `/skill-labs/webgpu-basics` — `src/app/skill-labs/webgpu-basics/page.tsx`
- `/student/calendar` — `src/app/student/calendar/page.tsx`
- `/student/cards` — `src/app/student/cards/page.tsx`

## 6. 每一行真正完成所需的验收

1. **归属**：唯一主 owner，L1/L2/L3/L4 层级，允许跨业务推荐但不能多重面包屑。
2. **可达**：首页/六大业务父页/业务详情/真实数据库目录能到达；有一条合理返回路；明确静态与动态 URL；历史书签不断链。
3. **事实**：官网来源/真实年份/权利/可练和可售状态/正确内容和标题；免费、待验证和付费的 CTA 不混淆。
4. **索引**：公开内容 canonical 唯一；订单/结果/账户/后台 noindex 与服务端权限隔离；Sitemap、robots、真实 200/3xx/404 一致。
5. **交互**：手机、平板、桌面实际点击；顶部菜单、面包屑、开始考试、完成、回退、登录、授权下载路径；不能以 HTTP 200 充当支付或交付成功。

将这一总账作为 Issue #268 的明细附件；修复只写入已有 owner 及数据源，不新增一级『在线练习』『考试管理』『书库』或第二支付账本，也不设置新发布门禁。**只有实际全路径验证完才能把候选孤儿页改标为已确认。**
