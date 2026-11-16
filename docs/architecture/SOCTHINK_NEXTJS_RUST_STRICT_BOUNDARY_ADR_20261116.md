# ADR v4：SOC THINK Next.js 前端 / Rust 业务后端严格职责边界（2026-11-16）

**结论：已确定的目标架构，工程迁移尚未完成；不能将本文件理解为“已经全 Rust 上线”。**

> 用户最终决定：全站采用 **Next.js/React = 用户展示和交互层，Rust/Axum = 唯一的业务与数据执行层，PostgreSQL = 主要权威持久化层**。适用于数学、英语、校内学科、考试、成人职业技能、机构教学、企业培训等全部产品，而不是只适用于 AccentLab。测试阶段没有需迁就的正式用户；删除完成迁移后的多余 Next API、JSONL 权威数据写入、重复身份/计费实现，不长期保留双轨。保留有实际价值的原教学内容、算法、评分样例与界面。

## 1. 关键澄清：Next.js 技术上是全栈框架，但我们只允许它承担前端职责

Next.js 使用 Node.js 运行 SSR、React Server Components、路由与静态生成。因此**主机上存在 Next.js Node 进程，不等于我们选择 Node 作为业务后端**。Next 的 Server Components 可在服务端执行，只应承担读取 Rust 的只读视图、页面组合、SEO 元数据、缓存和展示。Next 的 Route Handler 能接 API 只是技术能力，并不代表必须使用；最终不在 Next 实现考试、账本、注册、教师/机构授权或数据写入。

| 环节 | 唯一责任主体 | 可以做 | 禁止做 |
|---|---|---|---|
| 浏览器 React 组件 | Next.js / TypeScript | 输入、录音采集、答题交互、即时本地检查、展示反馈 | 计算权威分数、决定教师权限、校验支付或扣费 |
| Next.js 页面 SSR / RSC | Next.js / TypeScript | SEO、模板、格式化、读取 Rust 已授权 ViewModel、页面渲染、静态缓存 | 直接 SQL/Redis/JSONL 用户读写、私自核验会话和签发业务 token、复制 Rust 业务规则 |
| 公网 HTTPS 入口 | 现有 Nginx/同源网关 | TLS、静态资产、限流、API 按路径转发、请求 ID、真实 IP 边界 | 决定用户有无权益、做业务事务 |
| 用户 API / 微信 OAuth / 教师授课 | **Rust Core** | 登录、会话签发与撤销、角色/组织授权、班级与作业、教师学情 | 另开按学科不同的账号/教师后台 |
| 课程/试卷/训练/评测 | **Rust Core** | ResourceRef、组卷、考试状态、评分、尝试记录、进度、报告/打印任务 | Next 各维护一份同名评分与题库权威 |
| 订单支付、订阅、额度 | **Rust Core** | 统一订单、微信支付回调验签、权益发放/撤销、AI 使用计量、退款对账、幂等 | Next API 接收支付成功参数并自行授权、每个模块自建付费库 |
| 音频评分、OCR、AI、视频与实训 | Rust Core 的业务适配层 + 必要的专项工作进程 | 调用现有 AccentLab Rust 专项评分引擎、第三方 AI 和可信沙箱，异步执行与结果入库 | 为每科再建公开入口或第 2 个支付/用户权威 |
| 核心数据库 | PostgreSQL 18（现有实例/服务优先） | 同一数据库集群下按 schema、数据属主和 DB 权限隔离，真实业务写入只有 Rust | Next 进程持有 PG 业务写入凭据；私有 JSONL 继续当最终账本 |
| 原始资产 | 已授权对象存储 / 私有文件 | 大录音、图片、PDF 及模型音频，Rust 生成有时效的访问授权 | 前端直接访问未经授权的原声与试卷答案 |

**一条数据事实只能有一个写入权威。** Next 的临时 HTTP 代理仅是传输，不拥有该请求的领域决定权；最终优先由同源网关将 `/api/*` 直接路由到 Rust，避免 Node→Rust→Node 多绕一层。微信小程序也直接消费相同 Rust API，不在 Next 发起小程序业务事务。

## 2. 目标部署拓扑

```text
浏览器/手机网页 ──┐
                 ├── https://socthink.cn (同源 HTTPS / Nginx)
微信小程序 ───────┘                │
         ┌─────────────────────────┴──────────────────────────┐
         │                                                    │
 /, /math, /english, /learn, /teach, /workspace      /api/v1/* (以及逐步接管的原 API URI)
 /_next/* 与可公开静态资产                            │
         ▼                                                    ▼
 Next.js / React / TypeScript                          Rust Core / Axum
 **只负责页面与交互**                               **唯一业务后端，模块化单体**
         │                                                    │
         └─ SSR 通过只读内网 API 获取视图 ──────────────────────┤
                                                              │
                                          ┌───────────────────┼─────────────────┐
                                          ▼                   ▼                 ▼
                                    PostgreSQL 18        私有原始资产       外部业务适配
                                    身份、权益、          音频、试卷、      微信支付、
                                    考试、任务、          报告、图像        AI评分、沙箱
                                    学习证据
```

目标运行规模：**一个公开域名/同源入口、一个 Next Web 应用、一个 Rust 核心业务应用、现有 PostgreSQL 服务**；不按学科建 Rust 微服务集群，不默认增加 Kafka、Redis 或另一个 Gateway。必要的语音评分或沙箱进程可作为被 Rust Core 调用的私有适配器，并由业务权限和统一账本控制。

会话从 Web 的同源 `HttpOnly; Secure` Cookie 传入 Rust，由 Rust 签发/验证；Next SSR 只转发必要的 Cookie 与请求上下文，不另有“Node 权限”的真相。OAuth 原有微信回调 URL 应在网关精确切换，回调安全验证、state 和 Code 只能在 Rust 执行；Cookie 的 SameSite、回跳和手机微信内授权须真实验收。外部支付回调继续用正式原路径，只有 Rust 验签与事务成功才授予权益。

## 3. Rust Core 是一个模块化单体，不是“每个科目一套后端”

核心模块边界：

- `identity`：同一个 SOC THINK 账号、微信、角色、平台管理员与服务端会话；账号里不单独存“teacher=true”的产品开通状态。
- `organizations`：独立教师、学校/机构/企业、成员授权、班级与 training cohort；机构隔离、审计。
- `catalog`：统一课程/题目/资源索引与真实 `available` 状态，原业务引擎可继续独立维护题库。
- `assessment`：考试蓝图、时间窗、答题会话、提交、确定性评分、证据和复盘；口语/开放题通过适配器执行评分，不将“模型建议”假装权威确定分。
- `learning`：自主学习、作业、Attempt/Progress、报告读模型、教师汇总；同一练习活动既可独立使用又可被教师指派。
- `commerce`：唯一订单、微信支付、退款、套餐权益、使用量、机构席位；购买者和真正学员不同。
- `content`：原始资料、来源/许可、发布状态、音频与 PDF 访问许可。
- `jobs`：AI/音频/报告/沙箱调用及必要的后台异步任务；AI 失败不回滚已成功的客观考试提交。

每个模块只拥有自己的实体、事务和接口。模块间需要时由 Rust 内部明确调用或同一个数据库事务完成，不在 Next 组件里横跨两套数据存储自行拼接“真实答案”。

## 4. 当前真实问题审计（2026-11-16）

源自 `star8592/Kangaroo-Practice-Simulator` 主分支代码扫描：

- `src/app/api/**/route.ts` 共 **34 个**处理文件，其中 **20 个含 POST / PATCH 等修改接口**。这些是实际存在的 Next 服务端业务，不是纯前端项目。
- `src/lib` 存在 `parent-auth.ts`、`auth.ts`、`user-data-store.ts`、`attempt-store.ts`、`exam-session.ts`、`grading.ts`、`student-analytics.ts`、`math-engine/signal-store.ts` 等业务权威。
- 示例：`/api/grade` 直接判分和写作答；`/api/exam-sessions` 直接创建/锁定考试计时；`/api/arithmetic/next-session` 直接读取本地 `private/arithmetic/sessions.jsonl` 计算下一训练计划；`/api/math-engine/signals` 直接写学习信号；`/api/auth/parent/me` 在 Next 续签主站微信会话并判断 siteAdmin。
- 用户与考试状态存在 `private/users/*.json` 及 `private/arithmetic/sessions.jsonl` 等本地持久化。这些迁到 Rust + PostgreSQL 后，不能再作为新的权威业务库。
- 主站本仓库默认分支尚未发现已接管核心业务的 Rust Cargo 服务。Z890 的独立候选工作树 `.socthink-architecture-simplify-20261031/backend/socthink-core` 存在 Rust Axum **只读 Catalog 原型**；README 明确“R2 候选，未路由生产”，有局部数据等价测试与热更新样例。这是值得复用的早期资产，不能宣称生产 Rust 全面接管。
- 既有 `docs/architecture/SOCTHINK_MODULAR_MONOLITH_20261031.md` 与 `SOCTHINK_PORTAL_DESIGN_RUST_MIGRATION_ADR_20261031.md` 早已确定“Next 前端 + Rust 业务核心 + PostgreSQL”；但未将其变成编码和部署的强制边界，故 Next 业务代码持续增长。
- 统一计费、英语发音服务可能已有独立 Rust 能力；必须分别读取真实仓库、进程/端口与网关配置后记录。**不能因 Next 仓库无 Cargo，就断言整个主站没有 Rust 服务。**

## 5. 迁移路由与权限切换顺序（每轮新实现替代旧实现，不长期双轨）

| 阶段 | 优先模块 | Next 里当前需移出的职责 | Rust 端应提交的可验收结果 |
|---|---|---|---|
| B0 | 当前基线 | 审查全部 34 个 Next API、读写文件和部署 URI | 逐文件 Owner 清单、合同 fixture、启动拓扑、实际 API 流量与错误 |
| B1 | 无状态资源 | `/api/exams/[examId]`、资料查询、只读数学资源 | 复用已做的 Rust Catalog 候选，过滤/分页/版权可用状态对账；同源网关一次接管 |
| B2 | 考试/数学 | `/api/exam-sessions`、`/api/grade`、算术 Session 与学习信号 | 同一历史答卷重放、评分完全一致、幂等提交、区间计时与失败恢复、PG 权威写入 |
| B3 | 唯一登录/组织 | `/api/auth/*`、`/api/family/*`、`/api/admin/*`、`/api/internal/commerce/students` | 微信 PC/手机、授权/撤权、教师/组织管理、Cookie/会话切换与跨班越权测试 |
| B4 | 账本与收费 | 统一支付/权益/机构席位真实接口的业务权威统一 Rust 处理 | 回调验签、幂等订单、退款对账、失败不授予权益、一次交易不跨两套账本 |
| B5 | 语音/AI与跨学科 | AccentLab 既有评分 Rust 服务、AelOS 阅读、词汇及职业实训能力适配 | 同一 Rust Core ResourceRef/Assignment/Attempt/UsageMeter 对接，原训练界面不破坏 |
| B6 | 删除旧实现 | 迁完立即删同名 TS 权威服务代码、冗余 JSONL 写入、旧 OAuth/计费实现 | `src/app/api` 中不再有领域处理，Next 只剩页面/SSR/展示；原小程序 API 合同不变 |

**次序可依据已存在的支付与认证生产事实调整**：高风险的正式资金路径与微信登录不能因为“测试期”就盲切。采用“离线回放对比→隔离验证→原 URI 单次切换→生产验收→删旧代码”而非长期双写。可以保留短期**只读诊断对照**，但不要建立双主数据。需要跨域或机构授权的功能，服务端 401/403 在 Rust 判定；Next 菜单隐藏不能作为权限。

## 6. 编码与仓库规则：以后不能再混

建议继续一个主站业务仓库，不因重构再拆成一堆新仓库：

```text
SOC THINK repository
├── src/app/**          Next 页面、layout、Metadata、RSC（只读 ViewModel）
├── src/components/**   React 组件、交互和展示
├── src/styles/**       样式与设计 token（若未来需要）
├── backend/socthink-core/
│   ├── Cargo.toml      Axum/Tokio/Tower 模块化单体
│   ├── src/{identity,catalog,assessment,learning,organizations,commerce,...}/
│   └── migrations/     SQL schema/迁移，由 Rust 后端维护
├── contracts/          OpenAPI 3.1 / JSON Schema / fixtures，Web+小程序共用
├── scripts/            发布与验收工具，不作为在线业务服务器
└── ops/                同源 Nginx、systemd、自动回退与观测
```

现有 Next 根目录不必为了形式主义立即搬进 `apps/web`；先落实唯一职责边界和接口，之后再按实际收益决定目录重排。所有业务写操作在 Rust；Next 未来新增 `src/app/api/**/route.ts` 业务处理文件视为架构回归，必须先说明极少数纯前端 transport 例外及到期删除计划。新首页 /teach、/my/learning、/subjects 的 Next 页面只负责体验，不能继续加入教师、考试或计费写入。

## 7. 一条真实用户链路怎样走

个人考试：`Next 页面→Rust 获取试卷权限→Rust 组卷/开会话→浏览器作答→Rust 验权/交卷/评分/持久化→Next 展示已确认成绩`。

教师作业：`Next 教师工作台→Rust 验证 role+organization→选共享资源并建 Assignment→学生从微信链接打开原学习组件→Rust 验学生身份/任务范围→Rust 写结果→教师读本班汇总`。

机构购买：`Next 展示套餐→Rust 建订单→微信支付→Rust 验签和事务写入→Rust 授予组织权益→Next 读取权益展示`。前端不能凭付款回跳页写 entitlement。

## 8. 一轮施工必须拿到的证据

- 新增 Next Route Handler 数量为零或明确受控的展示层例外。旧的 34 个 API 每完成一项 Rust 接管，库存必须下降而不是新增旧逻辑。详见独立边界审计清单。
- Rust API 返回标准状态码与机器可识别的错误；接口需要输入验证、会话撤销、租户权限、幂等和 requestId。对 Next SSR 提供最少只读 ViewModel，不让 React 读取业务表结构。
- 单套 `Account / RoleGrant / Organization / Assignment / Attempt / Entitlement` 权威数据；Rust 专项评分进程也不另建学生或计费账本。
- API 合同测试包含浏览器、微信小程序、跨端登录、跨班/跨机构拒绝、试卷重放和实付回调验签；另进行 390px 手机实际使用、真实评分性能。
- 生产监测对照代码 SHA、Nginx 路由指向、Rust 二进制版本、DB migration 编号、静态资源发布编号；失败自动回退至兼容的整套部署和 DB schema。
- **发布门槛保持少而硬**：代码可启动、身份/支付/成绩/数据安全、可回退。不要额外引入审批层、双重人工授权或漫长的门禁清单。

## 9. 三轮重新校正后的结论

- **迭代 1：定义责任**：Next 是页面与体验，Rust 是全部业务，PG 是权威数据；Next SSR 存在不改变这个结论。
- **迭代 2：清点现实差距**：34 个 Next API 与 JSON/JSONL 业务状态说明当前离目标仍有距离；Rust Catalog 原型仅仅是可复用的起点。
- **迭代 3：设工程防回潮规则**：新增 Next 业务 Route Handler 默认禁止，先迁旧，再删旧；每阶段业务只有一个权威实现和可重复的实际运行验收。

**终版标准不是“用了 Rust”或“Next 文件减少了几个”，而是任何一个用户、支付、成绩或教学记录都能被清楚归属到唯一的 Rust 模块与 PostgreSQL 数据所有者。**
