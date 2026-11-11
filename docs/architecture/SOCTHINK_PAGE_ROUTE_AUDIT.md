# SOC THINK 全站逐页路由归属审计（代码扫描台账）

审计基线：2026-11-04；源自 GitHub Next.js `src/app/**/page.tsx` 路由树，**85 个 Next.js 页面模板 + 1 个静态兼容 HTML 入口（共 86 个），非实际商品、试卷或动态 URL 实例数**。

> **地位**：本表是 [《全站信息架构总纲》](SOCTHINK_SITE_ARCHITECTURE_MASTER.md) 的逐页实施台账，不是另一套页面注册表、CMS、路由或授权来源。内容归属仍以 `src/lib/site-architecture.ts` 和现有业务权威目录为准。

## 1. 审计方法与边界

每个页面记录一条路由模板、唯一所属业务、所依附的父页面/授权流、访问类型和应当从哪里进入。检查范围覆盖公开业务、资料/考试详情、测评/技能/商城、登录/学生/管理后台、历史跳转和动态参数。公开可发现不等于可付费、可索引；动态详情并非一条模板就代表所有实例真实可用。

**访问类型说明**：一级业务与公开内容/目录可从导航或目录发现；动态详情需依赖真实已发布条目与权限；受控考试/报告/后台不得为减少“孤儿页”而公开索引；历史重定向仅用于保存旧收藏，不能作为新导航。

本台账是**逐页归属与源代码入口核对**，不是宣称完成了对所有登录后用户态、每一个动态参数、每个历史外链的真实浏览器点击。运行态未能全面验证的情况需独立跟踪。

## 2. 每一页的唯一归属与上级

| 页面模板 | 主归属 | 父页面／所属流程 | 类型 | 入口与依据 |
| --- | --- | --- | --- | --- |
| `/` | 全站入口 | `—` | 首页 | 主导航品牌链接 |
| `/english` | 英语学习 | `/` | 公开目录 | SOC THINK 首页英语分类与顶栏入口；四个独立产品集中展示 |
| `/english/pronunciation` | 英语学习 | `/english` | 公开内容 | AccentLab 独立发音应用说明与已核验原站训练入口 |
| `/english/vocabulary` | 英语学习 | `/english` | 公开内容 | 词语星球独立单词学习说明与已核验原站课堂入口 |
| `/english/reading` | 英语学习 | `/english` | 公开内容 | EnglishLeap 独立阅读项目；公网尚未验收，不冒用其他阅读站点 |
| `/english/aelos` | 英语学习 | `/english` | 公开内容 | AelOS 独立综合英语项目；已有公网界面，账户授权待接通 |
| `/account` | 账户与权益 | `/` | 私有流程 | 页脚、会话导航 → 我的订单 |
| `/admin` | 管理后台 | `/` | 管理员 | 管理员登录后的工作台（仅授权后可达） |
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
| `/assessment-center` | 测评中心 | `/` | 历史业务目录 | 旧路径暂时可用，不再显示在顶级导航 |
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
| `/assessments` | 全部考试 | `/` | 历史业务目录 | 旧路径暂时可用，不再显示在顶级导航 |
| `/learn` | 技能实训 | `/` | 一级业务 | 职业学习主入口；真实实训链接复用原技能模块 |
| `/practice` | 求职训练 | `/` | 一级业务 | 岗位模拟笔试/面试主入口；实际执行复用现有权威代码 |
| `/career` | 职业岗位 | `/` | 一级业务 | 全站公共导航唯一注册表 |
| `/career/companies` | 职业岗位 | `/career` | 公开内容 | 所属业务目录或内容推荐 |
| `/career/exams/[id]` | 职业岗位 | `/career` | 动态详情 | 岗位目录与教程按卷 ID 进入 |
| `/career/guides/[id]` | 职业岗位 | `/career` | 动态详情 | 岗位目录按原创资料 ID 进入 |
| `/career/interviews` | 职业岗位 | `/career` | 公开内容 | 所属业务目录或内容推荐 |
| `/career/interviews/[id]` | 职业岗位 | `/career/interviews` | 动态详情 | 模拟面试目录按情境 ID 进入 |
| `/career/paths` | 职业岗位 | `/career` | 公开目录 | 四条已核验岗位学习路线导航 |
| `/career/paths/[slug]` | 职业岗位 | `/career/paths` | 动态详情 | 仅已核验的路线由路径注册表生成 |
| `/career/roles/[id]` | 职业岗位 | `/career` | 动态详情 | 岗位分类目录按岗位 ID 进入 |
| `/competitions` | 全部考试 | `/assessments` | 公开目录 | 考试中心 → 竞赛模拟 |
| `/digital-purchase-policy` | 政策与权益 | `/shop` | 公开政策 | 商城/页脚购买规则 |
| `/digital-purchase-policy/v1` | 政策与权益 | `/digital-purchase-policy` | 历史政策 | 政策页的历史版本链接 |
| `/events` | 全部考试 | `/assessments` | 公开工具 | 考试中心 → 赛事信息 |
| `/exam-planner` | 全部考试 | `/assessments` | 公开工具 | 考试中心 → 考试日程 |
| `/exam/[examId]` | 全部考试 | `/competitions` | 受控考试 | 试卷目录按真实卷 ID 进入，服务端验权 |
| `/login` | 账户与权益 | `/account` | 身份入口 | 受控路由/购买流程登录 |
| `/math` | 全部考试 | `/` | 公开但不收录 | 课堂数学独立目录过渡入口；学生记录仍按既有鉴权 |
| `/math-practice` | 全部考试 | `/assessments` | 公开指南 | 考试目录底部的分年级计算指南 |
| `/membership` | 账户与权益 | `/account` | 权益流程 | 商城/账户/页脚购买与权益 |
| `/parent` | 账户与权益 | `/account` | 历史重定向 | 旧家长入口 → 单一账户 |
| `/parent/login` | 账户与权益 | `/login` | 历史重定向 | 旧家长登录 → 统一登录 |
| `/parent/register` | 账户与权益 | `/login` | 历史重定向 | 旧家长注册 → 统一登录 |
| `/parent/report/[studentId]/[attemptId]` | 账户与权益 | `/account` | 历史受控 | 旧家长报告仅既有授权主体可用 |
| `/privacy` | 政策与权益 | `/` | 公开政策 | 全站页脚隐私政策 |
| `/report/[attemptId]` | 全部考试 | `/student` | 受控报告 | 学习报告按本人成绩 ID 打开 |
| `/resources` | 真题资料 | `/` | 历史业务目录 | 旧路径暂时可用，不再显示在顶级导航 |
| `/resources/competitions/[slug]` | 真题资料 | `/resources` | 动态专题 | 试卷目录按竞赛类型生成专题 |
| `/result` | 全部考试 | `/exam/[examId]` | 受控结果 | 考试交卷后查看结果 |
| `/review` | 全部考试 | `/assessments` | 受控复盘 | 考试中心 → 错题复盘 |
| `/search` | 全站入口 | `/` | 搜索工具 | 首页搜索表单，全站结果 noindex |
| `/shop` | 数字商城 | `/` | 历史业务目录 | 旧路径暂时可用，不再显示在顶级导航 |
| `/shop/[productId]` | 数字商城 | `/shop` | 动态商品 | 仅已验证在架的商品链接 |
| `/skill-labs` | 技能实训 | `/` | 历史业务目录 | 旧路径暂时可用，不再显示在顶级导航 |
| `/skill-labs/agent-foundations` | 技能实训 | `/skill-labs` | 公开内容 | 所属业务目录或内容推荐 |
| `/skill-labs/books` | 技能实训 | `/skill-labs` | 公开内容 | 所属业务目录或内容推荐 |
| `/skill-labs/books/[slug]` | 技能实训 | `/skill-labs/books` | 动态详情 | 父目录按条目动态生成 |
| `/skill-labs/code-lab` | 技能实训 | `/skill-labs` | 公开内容 | 所属业务目录或内容推荐 |
| `/skill-labs/engineering-mock` | 技能实训 | `/skill-labs` | 公开内容 | 所属业务目录或内容推荐 |
| `/skill-labs/engineering/[track]` | 技能实训 | `/skill-labs` | 动态详情 | 父目录按条目动态生成 |
| `/skill-labs/sql-lab` | 技能实训 | `/skill-labs` | 公开内容 | 所属业务目录或内容推荐 |
| `/skill-labs/webgpu-basics` | 技能实训 | `/skill-labs` | 公开内容 | 所属业务目录或内容推荐 |
| `/skill-labs/webgpu-basics/index.html` | 技能实训 | `/skill-labs/webgpu-basics` | 历史静态跳转 | 原始 Vite HTML 旧址无索引跳转至实训课；源码只在 assets 与已发布 ZIP |
| `/student` | 账户与权益 | `/account` | 受控学习记录 | 统一账号 → 学习报告 |
| `/student/calendar` | 账户与权益 | `/student` | 受控学习记录 | 个人报告 → 关注赛事 |
| `/student/cards` | 账户与权益 | `/student` | 受控学习记录 | 个人报告 → 学习卡册 |
| `/student/settings` | 账户与权益 | `/student` | 受控设置 | 个人报告 → 资料设置 |
| `/terms` | 政策与权益 | `/` | 公开政策 | 全站页脚用户协议 |
| `/verification` | 全部考试 | `/math-practice` | 公开证据 | 数学指南 → Lean/Mathlib 验证档案 |

## 3. 逐层汇总与不变约束

**总计：81 个入口模板（80 Next.js + 1 静态兼容 HTML），无未知主归属、无无效父路径；旧 owner 在迁移完成之前仅代表历史路由分类。** 按 owner 分布：全站入口 2；账户与权益 11；管理后台 10；全部考试 15；测评中心 12；技能实训 11；职业岗位 7；政策与权益 4；真题资料 2；数字商城 2。此数字只反映网站公开页面入口模板及受限路由的归属整理，不是全部网页、动态商品实例、SEO 收录量或客户实际访问量。

1. **全站首页与历史六大业务（向职业优先的三个任务入口迁移）**：首页 `/`；新顶级导航依次是 `/career`、`/learn`、`/practice`；原六大业务 URL 暂不立即删除，以确保用户路径和授权业务安全迁移。全站搜索 `/search` 是发现工具，不升成第七业务。
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

## 6. 公开静态 HTML 的独立审计补充

实查 `public/` 目录另有一个并非 Next.js `page.tsx` 的 HTML：`/skill-labs/webgpu-basics/index.html`。原来它本质是 Vite 源码模板，使用 `/src/main.js` 绝对路径和 `three/webgpu` 裸模块导入，在生产静态 URL 直接打开并不是可执行的网页，这是一个真实的非 Next 孤立/失效入口，**不能被 75 条 Next 路由的完备性掩盖**。

治理方式：Vite 工程原始 `index.html`、`src/main.js`、锁定依赖和示例说明归集到非公开 `assets/skill-labs/webgpu-basics/` 供开发维护；已验证的原工程 `/skill-labs/webgpu-basics/orbit-lab.zip` 下载 URL 保持不变。静态旧 HTML 仅保留 `noindex`、canonical 和自动导向正式 `/skill-labs/webgpu-basics` 的兼容入口，并提供直接可点链接，不再在公开网址加载不能解析的裸导入。

现有逐页检查将同时枚举 `src/app/**/page.tsx` 和 `public/**/*.html`，以后新增静态 HTML 也必须审核归属和访问路径。静态 81 项/80 路由模板不是网站的真实商品/试卷/生成动态页面实例数。


## 7. v2.1 逐页迁移与新旧归属（2026-11-03）

本节只提供**决策/迁移归属**，不建立第二份运行时路由表。上方第 2 节的五列表是静态自动核验的当前路由台账。下方每条单独记录下一步，尤其保护共享的 /exam、/result 和 /report。

共 81 条路由/静态入口（包含新增的 2 条岗位学习路线入口）。- `/`：**主站**；首页保留，R1 完成职业优先改版。

状态「已建入口」仅证明源码已添加，**不代表生产发布**；「未来迁移」不是已经迁移。

- `/account`：**主站基础设施**；保留权威数据；R3 无二套账号/支付/权益系统。
- `/admin`：**管理后台**；按业务拆分；R2/R3 主站业务与数学教学分离。
- `/admin/activate`：**管理后台**；按业务拆分；R2/R3 主站业务与数学教学分离。
- `/admin/competition-source-watch`：**管理后台**；按业务拆分；R2/R3 主站业务与数学教学分离。
- `/admin/families`：**管理后台**；按业务拆分；R2/R3 主站业务与数学教学分离。
- `/admin/feedback`：**管理后台**；按业务拆分；R2/R3 主站业务与数学教学分离。
- `/admin/login`：**管理后台**；按业务拆分；R2/R3 主站业务与数学教学分离。
- `/admin/questions`：**管理后台**；按业务拆分；R2/R3 主站业务与数学教学分离。
- `/admin/seo`：**管理后台**；按业务拆分；R2/R3 主站业务与数学教学分离。
- `/admin/students`：**管理后台**；按业务拆分；R2/R3 主站业务与数学教学分离。
- `/admin/students/[id]`：**管理后台**；按业务拆分；R2/R3 主站业务与数学教学分离。
- `/arithmetic`：**数学独立应用**；未来迁移；R2 保留原教学通路和数据后切换。
- `/arithmetic/discovery/[grade]`：**数学独立应用**；未来迁移；R2 保留原教学通路和数据后切换。
- `/arithmetic/print`：**数学独立应用**；未来迁移；R2 保留原教学通路和数据后切换。
- `/arithmetic/print/export`：**数学独立应用**；未来迁移；R2 保留原教学通路和数据后切换。
- `/arithmetic/session/[grade]`：**数学独立应用**；未来迁移；R2 保留原教学通路和数据后切换。
- `/assessment-center`：**主站候选**；按求职相关性分流；R3 测评方法/适用边界单独验收。
- `/assessment-center/[id]`：**主站候选**；按求职相关性分流；R3 测评方法/适用边界单独验收。
- `/assessment-center/about`：**主站候选**；按求职相关性分流；R3 测评方法/适用边界单独验收。
- `/assessment-center/advanced-reasoning-40`：**主站候选**；按求职相关性分流；R3 测评方法/适用边界单独验收。
- `/assessment-center/career-aptitude-40`：**主站候选**；按求职相关性分流；R3 测评方法/适用边界单独验收。
- `/assessment-center/methodology`：**主站候选**；按求职相关性分流；R3 测评方法/适用边界单独验收。
- `/assessment-center/reading-practice-16`：**主站候选**；按求职相关性分流；R3 测评方法/适用边界单独验收。
- `/assessment-center/reasoning-practice-20`：**主站候选**；按求职相关性分流；R3 测评方法/适用边界单独验收。
- `/assessment-center/report-preview`：**主站候选**；按求职相关性分流；R3 测评方法/适用边界单独验收。
- `/assessment-center/sql-lab`：**主站候选**；按求职相关性分流；R3 测评方法/适用边界单独验收。
- `/assessment-center/work-style-24`：**主站候选**；按求职相关性分流；R3 测评方法/适用边界单独验收。
- `/assessment-center/work-values-30`：**主站候选**；按求职相关性分流；R3 测评方法/适用边界单独验收。
- `/assessment-center/workplace-sjt-24`：**主站候选**；按求职相关性分流；R3 测评方法/适用边界单独验收。
- `/assessments`：**待归属**；拆分考试与资料；R2 逐个实际内容实例判断数学或职业归属。
- `/learn`：**主站**；已建入口；R1 用户任务页与导航联通。
- `/practice`：**主站**；已建入口；R1 用户任务页与导航联通。
- `/career`：**主站**；已建入口；R1 用户任务页与导航联通。
- `/career/companies`：**主站**；保留升级；R3 岗位内容/完整笔面试闭环。
- `/career/exams/[id]`：**主站**；保留升级；R3 岗位内容/完整笔面试闭环。
- `/career/guides/[id]`：**主站**；保留升级；R3 岗位内容/完整笔面试闭环。
- `/career/interviews`：**主站**；保留升级；R3 岗位内容/完整笔面试闭环。
- `/career/interviews/[id]`：**主站**；保留升级；R3 岗位内容/完整笔面试闭环。
- `/career/paths`：**主站**；R3 已建四条正式岗位学习路线总入口，提供可用服务与缺口。
- `/career/paths/[slug]`：**主站**；R3 由唯一 career-paths 注册表生成，禁止虚构未上线内容。
- `/career/roles/[id]`：**主站**；保留升级；R3 岗位内容/完整笔面试闭环。
- `/competitions`：**数学独立应用**；未来迁移；R2 保留原教学通路和数据后切换。
- `/digital-purchase-policy`：**法务与政策**；保留；R3 按实际交易内容核验说明。
- `/digital-purchase-policy/v1`：**法务与政策**；保留；R3 按实际交易内容核验说明。
- `/events`：**数学独立应用**；未来迁移；R2 保留原教学通路和数据后切换。
- `/exam-planner`：**数学独立应用**；未来迁移；R2 保留原教学通路和数据后切换。
- `/exam/[examId]`：**动态受控**；按考试类型区分；R2/R3 不得对私有答卷统一重定向。
- `/login`：**主站基础设施**；保留权威数据；R3 无二套账号/支付/权益系统。
- `/math`：**数学独立目录过渡入口**；源码已建，尚需独立运行与课堂数据核验。
- `/math-practice`：**数学独立应用**；未来迁移；R2 保留原教学通路和数据后切换。
- `/membership`：**主站基础设施**；保留权威数据；R3 无二套账号/支付/权益系统。
- `/parent`：**数学/历史账户**；保留授权与历史；R2 数据所属确认后独立迁移，防止泄露。
- `/parent/login`：**数学/历史账户**；保留授权与历史；R2 数据所属确认后独立迁移，防止泄露。
- `/parent/register`：**数学/历史账户**；保留授权与历史；R2 数据所属确认后独立迁移，防止泄露。
- `/parent/report/[studentId]/[attemptId]`：**数学/历史账户**；保留授权与历史；R2 数据所属确认后独立迁移，防止泄露。
- `/privacy`：**法务与政策**；保留；R3 按实际交易内容核验说明。
- `/report/[attemptId]`：**动态受控**；按考试类型区分；R2/R3 不得对私有答卷统一重定向。
- `/resources`：**待归属**；拆分考试与资料；R2 逐个实际内容实例判断数学或职业归属。
- `/resources/competitions/[slug]`：**待归属**；拆分考试与资料；R2 逐个实际内容实例判断数学或职业归属。
- `/result`：**动态受控**；按考试类型区分；R2/R3 不得对私有答卷统一重定向。
- `/review`：**待定**；逐项核查；R0 不误删现有页面。
- `/search`：**主站**；保留并改职业发现；R1/R4 隔离数学内容与 SEO 投影。
- `/shop`：**主站基础设施**；保留权威数据；R3 无二套账号/支付/权益系统。
- `/shop/[productId]`：**主站基础设施**；保留权威数据；R3 无二套账号/支付/权益系统。
- `/skill-labs`：**主站**；保留、转归学习；R1/R3 由 /learn 汇聚，不复制实验数据。
- `/skill-labs/agent-foundations`：**主站**；保留、转归学习；R1/R3 由 /learn 汇聚，不复制实验数据。
- `/skill-labs/books`：**主站**；保留、转归学习；R1/R3 由 /learn 汇聚，不复制实验数据。
- `/skill-labs/books/[slug]`：**主站**；保留、转归学习；R1/R3 由 /learn 汇聚，不复制实验数据。
- `/skill-labs/code-lab`：**主站**；保留、转归学习；R1/R3 由 /learn 汇聚，不复制实验数据。
- `/skill-labs/engineering-mock`：**主站**；保留、转归学习；R1/R3 由 /learn 汇聚，不复制实验数据。
- `/skill-labs/engineering/[track]`：**主站**；保留、转归学习；R1/R3 由 /learn 汇聚，不复制实验数据。
- `/skill-labs/sql-lab`：**主站**；保留、转归学习；R1/R3 由 /learn 汇聚，不复制实验数据。
- `/skill-labs/webgpu-basics`：**主站**；保留、转归学习；R1/R3 由 /learn 汇聚，不复制实验数据。
- `/skill-labs/webgpu-basics/index.html`：**主站**；保留、转归学习；R1/R3 由 /learn 汇聚，不复制实验数据。
- `/student`：**数学/历史账户**；保留授权与历史；R2 数据所属确认后独立迁移，防止泄露。
- `/student/calendar`：**数学/历史账户**；保留授权与历史；R2 数据所属确认后独立迁移，防止泄露。
- `/student/cards`：**数学/历史账户**；保留授权与历史；R2 数据所属确认后独立迁移，防止泄露。
- `/student/settings`：**数学/历史账户**；保留授权与历史；R2 数据所属确认后独立迁移，防止泄露。
- `/terms`：**法务与政策**；保留；R3 按实际交易内容核验说明。
- `/verification`：**数学独立应用**；未来迁移；R2 保留原教学通路和数据后切换。

### 迁移后再删除的东西
- 原六业务主导航与过度重复的业务卡（本轮第一批代码已置换）。
- 数学独立服务实测可用后，从职业主站导航、首页、搜索/索引移除 K12、竞赛和课堂内容；只为确有外链流量的旧 URL 留有限重定向。
- 课程/岗位/模拟关系必须引用唯一 ID 和版本；不复制旧题库、订单或学习记录。
- 受控路径只可依据登录主体与实体 owner 分配，绝不能因 SEO 美观而公开跳转成绩/登录令牌。

### 真正验收标准
1. 当前已提交路由清单与真实文件树完全一致。
2. 首页、移动菜单、三任务入口、可运行技能实验、正式模拟笔试和面试全部能通过真实浏览器。
3. 数学课堂可从独立入口完成一次考试与一次复盘；原始学生数据逐条对账，再迁移域名。
4. 付款关闭时不显示可成功付款承诺，付款启用时须真实订单/授权下载回执。
5. Sitemap、canonical、robots、旧 URL 兼容经过公网验证；只有 CI 与部署 SHA 一致才能声明发布完成。
