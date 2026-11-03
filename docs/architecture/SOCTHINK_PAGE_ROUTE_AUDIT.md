# SOC THINK 全站逐页路由归属审计（代码扫描台账）

审计基线：2026-11-03；源自当前 GitHub Next.js `src/app/**/page.tsx` 路由树，**75 个页面模板，非实际商品/试卷/动态 URL 实例数**。

> **地位**：本表是 [《全站信息架构总纲》](SOCTHINK_SITE_ARCHITECTURE_MASTER.md) 的逐页实施台账，不是另一套页面注册表、CMS、路由或授权来源。内容归属仍以 `src/lib/site-architecture.ts` 和现有业务权威目录为准。

## 1. 审计方法与边界

每个页面记录一条路由模板、唯一所属业务、所依附的父页面/授权流、访问类型和应当从哪里进入。检查范围覆盖公开业务、资料/考试详情、测评/技能/商城、登录/学生/管理后台、历史跳转和动态参数。公开可发现不等于可付费、可索引；动态详情并非一条模板就代表所有实例真实可用。

**访问类型说明**：一级业务与公开内容/目录可从导航或目录发现；动态详情需依赖真实已发布条目与权限；受控考试/报告/后台不得为减少“孤儿页”而公开索引；历史重定向仅用于保存旧收藏，不能作为新导航。

本台账是**逐页归属与源代码入口核对**，不是宣称完成了对所有登录后用户态、每一个动态参数、每个历史外链的真实浏览器点击。运行态未能全面验证的情况需独立跟踪。

## 2. 每一页的唯一归属与上级

| 页面模板 | 主归属 | 父页面／所属流程 | 类型 | 入口与依据 |
| --- | --- | --- | --- | --- |
| `/` | 全站入口 | `—` | 首页 | 主导航品牌链接 |
| `/account` | 账户与权益 | `/` | 私有流程 | 页脚、会话导航 → 我的订单 |
| `/admin` | 管理后台 | `/admin/login` | 管理员 | 管理员登录后的工作台 |
| `/admin/activate` | 管理后台 | `/admin/login` | 邀请流程 | 仅一次性管理员邀请，不公开导航 |
| `/admin/competition-source-watch` | 管理后台 | `/admin` | 管理员 | AdminOperationsNav → 赛事来源审核 |
| `/admin/families` | 管理后台 | `/admin` | 管理员 | 管理后台内的专用页面 |
| `/admin/feedback` | 管理后台 | `/admin` | 管理员 | 管理后台内的专用页面 |
| `/admin/login` | 管理后台 | `/admin` | 身份入口 | /admin 受限重定向 |
| `/admin/questions` | 管理后台 | `/admin` | 管理员 | 管理后台内的专用页面 |
| `/admin/seo` | 管理后台 | `/admin` | 管理员 | 管理后台内的专用页面 |
| `/admin/students` | 管理后台 | `/admin` | 管理员 | 管理后台内的专用页面 |
| `/admin/students/[id]` | 管理后台 | `/admin/students` | 管理员 | 学生列表的单人画像（动态 ID） |
| `/arithmetic` | 全部考试 | `/assessments` | 访客训练 | 考试中心计算训练入口 |
| `/arithmetic/discovery/[grade]` | 全部考试 | `/arithmetic` | 受控训练 | 计算训练客户端按年级导航 |
| `/arithmetic/print` | 全部考试 | `/arithmetic` | 受控训练 | 计算训练客户端 → 打印 |
| `/arithmetic/print/export` | 全部考试 | `/arithmetic/print` | 受控打印 | 打印客户端导出动作 |
| `/arithmetic/session/[grade]` | 全部考试 | `/arithmetic` | 受控训练 | 计算训练客户端选择年级与模式 |
| `/assessment-center` | 测评中心 | `/` | 一级业务 | 全站公共导航唯一注册表 |
| `/assessment-center/[id]` | 测评中心 | `/assessment-center` | 动态详情 | 测评目录按量表 ID 打开 |
| `/assessment-center/about` | 测评中心 | `/assessment-center` | 公开内容 | 所属业务目录或内容推荐 |
| `/assessment-center/advanced-reasoning-40` | 测评中心 | `/assessment-center` | 公开内容 | 所属业务目录或内容推荐 |
| `/assessment-center/career-aptitude-40` | 测评中心 | `/assessment-center` | 公开内容 | 所属业务目录或内容推荐 |
| `/assessment-center/methodology` | 测评中心 | `/assessment-center` | 公开内容 | 所属业务目录或内容推荐 |
| `/assessment-center/reading-practice-16` | 测评中心 | `/assessment-center` | 公开内容 | 所属业务目录或内容推荐 |
| `/assessment-center/reasoning-practice-20` | 测评中心 | `/assessment-center` | 公开内容 | 所属业务目录或内容推荐 |
| `/assessment-center/report-preview` | 测评中心 | `/assessment-center` | 公开内容 | 所属业务目录或内容推荐 |
| `/assessment-center/sql-lab` | 技能实训 | `/skill-labs/sql-lab` | 历史重定向 | 旧测评 URL 308 → 技能实训 |
| `/assessment-center/work-style-24` | 测评中心 | `/assessment-center` | 公开内容 | 所属业务目录或内容推荐 |
| `/assessment-center/work-values-30` | 测评中心 | `/assessment-center` | 公开内容 | 所属业务目录或内容推荐 |
| `/assessment-center/workplace-sjt-24` | 测评中心 | `/assessment-center` | 公开内容 | 所属业务目录或内容推荐 |
| `/assessments` | 全部考试 | `/` | 一级业务 | 全站公共导航唯一注册表 |
| `/career` | 职业岗位 | `/` | 一级业务 | 全站公共导航唯一注册表 |
| `/career/companies` | 职业岗位 | `/career` | 公开内容 | 所属业务目录或内容推荐 |
| `/career/exams/[id]` | 职业岗位 | `/career` | 动态详情 | 岗位目录与教程按卷 ID 进入 |
| `/career/guides/[id]` | 职业岗位 | `/career` | 动态详情 | 岗位目录按原创资料 ID 进入 |
| `/career/interviews` | 职业岗位 | `/career` | 公开内容 | 所属业务目录或内容推荐 |
| `/career/interviews/[id]` | 职业岗位 | `/career/interviews` | 动态详情 | 模拟面试目录按情境 ID 进入 |
| `/career/roles/[id]` | 职业岗位 | `/career` | 动态详情 | 岗位分类目录按岗位 ID 进入 |
| `/competitions` | 全部考试 | `/assessments` | 公开目录 | 考试中心 → 竞赛模拟 |
| `/digital-purchase-policy` | 政策与权益 | `/shop` | 公开政策 | 商城/页脚购买规则 |
| `/digital-purchase-policy/v1` | 政策与权益 | `/digital-purchase-policy` | 历史政策 | 政策页的历史版本链接 |
| `/events` | 全部考试 | `/assessments` | 公开工具 | 考试中心 → 赛事信息 |
| `/exam-planner` | 全部考试 | `/assessments` | 公开工具 | 考试中心 → 考试日程 |
| `/exam/[examId]` | 全部考试 | `/competitions` | 受控考试 | 试卷目录按真实卷 ID 进入，服务端验权 |
| `/login` | 账户与权益 | `/account` | 身份入口 | 受控路由/购买流程登录 |
| `/math-practice` | 全部考试 | `/assessments` | 公开指南 | 考试目录底部的分年级计算指南 |
| `/membership` | 账户与权益 | `/account` | 权益流程 | 商城/账户/页脚购买与权益 |
| `/parent` | 账户与权益 | `/account` | 历史重定向 | 旧家长入口 → 单一账户 |
| `/parent/login` | 账户与权益 | `/login` | 历史重定向 | 旧家长登录 → 统一登录 |
| `/parent/register` | 账户与权益 | `/login` | 历史重定向 | 旧家长注册 → 统一登录 |
| `/parent/report/[studentId]/[attemptId]` | 账户与权益 | `/account` | 历史受控 | 旧家长报告仅既有授权主体可用 |
| `/privacy` | 政策与权益 | `/` | 公开政策 | 全站页脚隐私政策 |
| `/report/[attemptId]` | 全部考试 | `/student` | 受控报告 | 学习报告按本人成绩 ID 打开 |
| `/resources` | 真题资料 | `/` | 一级业务 | 全站公共导航唯一注册表 |
| `/resources/competitions/[slug]` | 真题资料 | `/resources` | 动态专题 | 试卷目录按竞赛类型生成专题 |
| `/result` | 全部考试 | `/exam/[examId]` | 受控结果 | 考试交卷后查看结果 |
| `/review` | 全部考试 | `/assessments` | 受控复盘 | 考试中心 → 错题复盘 |
| `/search` | 全站入口 | `/` | 搜索工具 | 首页搜索表单，全站结果 noindex |
| `/shop` | 数字商城 | `/` | 一级业务 | 全站公共导航唯一注册表 |
| `/shop/[productId]` | 数字商城 | `/shop` | 动态商品 | 仅已验证在架的商品链接 |
| `/skill-labs` | 技能实训 | `/` | 一级业务 | 全站公共导航唯一注册表 |
| `/skill-labs/agent-foundations` | 技能实训 | `/skill-labs` | 公开内容 | 所属业务目录或内容推荐 |
| `/skill-labs/books` | 技能实训 | `/skill-labs` | 公开内容 | 所属业务目录或内容推荐 |
| `/skill-labs/books/[slug]` | 技能实训 | `/skill-labs/books` | 动态详情 | 父目录按条目动态生成 |
| `/skill-labs/code-lab` | 技能实训 | `/skill-labs` | 公开内容 | 所属业务目录或内容推荐 |
| `/skill-labs/engineering-mock` | 技能实训 | `/skill-labs` | 公开内容 | 所属业务目录或内容推荐 |
| `/skill-labs/engineering/[track]` | 技能实训 | `/skill-labs` | 动态详情 | 父目录按条目动态生成 |
| `/skill-labs/sql-lab` | 技能实训 | `/skill-labs` | 公开内容 | 所属业务目录或内容推荐 |
| `/skill-labs/webgpu-basics` | 技能实训 | `/skill-labs` | 公开内容 | 所属业务目录或内容推荐 |
| `/student` | 账户与权益 | `/account` | 受控学习记录 | 统一账号 → 学习报告 |
| `/student/calendar` | 账户与权益 | `/student` | 受控学习记录 | 个人报告 → 关注赛事 |
| `/student/cards` | 账户与权益 | `/student` | 受控学习记录 | 个人报告 → 学习卡册 |
| `/student/settings` | 账户与权益 | `/student` | 受控设置 | 个人报告 → 资料设置 |
| `/terms` | 政策与权益 | `/` | 公开政策 | 全站页脚用户协议 |
| `/verification` | 全部考试 | `/math-practice` | 公开证据 | 数学指南 → Lean/Mathlib 验证档案 |

## 3. 逐层汇总与不变约束

**总计：75 个模板，无未知主归属、无无效父路径。** 按 owner 分布：全站入口 2；账户与权益 11；管理后台 10；全部考试 15；测评中心 12；技能实训 10；职业岗位 7；政策与权益 4；真题资料 2；数字商城 2。此数字只反映工程路由模板的归属整理，不是全部网页、动态商品实例、SEO 收录量或客户实际访问量。

1. **全站首页与六大业务**：首页 `/`；一级导航依次是 `/assessments`、`/resources`、`/career`、`/skill-labs`、`/assessment-center`、`/shop`。全站搜索 `/search` 是发现工具，不升成第七业务。
2. **一级以下的公开内容**：L2 目录 → L3 详情 → L4 使用/复盘与交付。考试日程、数学计算、验证说明、技术书库、岗位面试各有明确父级。`/assessment-center/sql-lab` 是技术迁移遗留重定向，今后只推广 `/skill-labs/sql-lab`。
3. **个人与后台**：`/account` 为统一账户，`/student*` 是授权后的学习历史，`/admin*` 为管理员工具，`/parent*` 是历史兼容；这些不是公开业务。无管理员权限或用户本人授权，不允许读取其数据。
4. **Sitemap ≠ 路由树**：不将搜索、后台、历史跳转、成绩、授权下载、个人卡册或匿名不可见详情机械加入 Sitemap。规范 URL、可索引和结构化数据由真实发布状态决定；公开源记录不意味着付费商品上架。
5. **已修复的静态缺陷**：企业研究面包屑不再回到考试；根布局已提供单一 `<main>`，管理/技能/学生页面不再重复；数学验证档案有数学学习入口；赛事来源审核位于管理员内部导航。页面及组件源代码与本表配套接受既有架构回归。

## 4. 自动化防遗漏（没有第二套导航）

现有 `test:site-architecture` 会枚举 `src/app/**/page.tsx`，核对本表每个模板是否唯一出现、父级是否真实存在、主归属是否合理，并检查真实入口的静态证据和单主内容容器；**新增页面必须在本表中选择归属**，不得临时加入新一级菜单。历史/动态/受控入口允许流程化到达，但必须有明确父级、跳转或授权来源。

## 5. 未完成的运行态核验与后续优先级

- P0：登录后考试 → 评分 → 复盘/报告、后台管理员入口、会员与付款后的交付，从有权限的实际账号进行端到端点击；不得用 HTTP 200 冒充成交或完成评分。
- P0：在 sitemap 之外遍历站内实际渲染的全部公开 `<a>`；列出真实孤儿页、错误 3xx、软 404、错误 canonical、只在 JavaScript 动态加载的链接，以及未审核内容被意外收录。
- P1：逐一展开动态目录实例（每个已开放测评、技术书、岗位模拟、资源专题、商品），而不是只把 `[id]` 当成一页；尤其核对零结果、停售、无权下载。
- P1：校内真卷按武汉/湖北等目标地区核对来源、考试日期、发布状态、版本与权利；跨业务书→课→练习→岗位和试卷→考试→复盘的双向链接需检验实际相关性。
- P2：根据真实访问/搜索/转化数据迭代，而不是为了整齐继续扩大一级导航。所有未完成内容归到既有 Issue #268 统一追踪。

**不变量**：页面归属不是页面存在性；页面可访问不是商品可购买；静态链接存在不代表用户有权限。必须分别记录检查的证据类型。
