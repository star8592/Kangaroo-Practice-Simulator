# SOC THINK 统一网站与主要业务服务器集中化方案

决策日期：2026-11-11；唯一公共品牌和网站入口：**https://socthink.cn/**。

## 一、要达成的业务体验

用户只看到一个网站、一个统一微信账户、一个支付与权益中心，以及数学、英语、K12、职业能力、测评、考试升学等清楚分级的业务。英语学习维持四套**独立产品**：AccentLab 发音、词语星球单词、EnglishLeap 精读、AelOS 综合学习。集中并不意味着把四个代码库、四组学习数据和数个模型硬合为一套程序。

服务器端目标是以 SOC THINK 作为**主要网站与业务运行主机**，只保留独立 AI 算力工作节点和站外灾备；旧的 toktik.tech 应用先保持在线，完成迁移和回退演练后才下线旧业务，不能先停机或切断已有学生学习链接。

## 二、真实生产基础设施调查（2026-11-11 12:37 UTC+8）

| 项目 | SOC THINK 主站服务器 | 现有英语 toktik.tech 服务器 |
|---|---|---|
| CPU | 2 vCPU | 2 vCPU |
| 内存 | 3.4 GiB；命令回报 available 约 2.7 GiB | 1.6 GiB；available 约 910 MiB |
| Swap | 2.0 GiB | 2.0 GiB |
| 磁盘 | 79 GB，已用 40 GB，可用约 36 GB | 20 GB，已用 11 GB，可用约 7.7 GB |
| 主站 | Nginx → 127.0.0.1:3000 Next.js，现用自动发布与回滚 | Nginx + PM2 aelos-api/worker + Vue/Rust 等 |
| 数据库 | PostgreSQL 16 | PostgreSQL 16 + **独立 PostgreSQL 18**（词语星球） |
| 生产发布 SHA | `40822b2782157cbfc13a35cf369ba8a230ceb0db` | AelOS /var/www/aelos 部署**无 Git 元数据，不能证明与 GitHub main 一致** |

已有英语服务器：AelOS `dist` 约 221 MB（其中 AccentLab 约 162 MB、词语星球 11 MB、`/english` 和 `/reading` 各约 1.8 MB）；AelOS `data/voice` 约 1.1 GB，PostgreSQL16 文件目录约 475 MB（**包含该服务器其他 PG16 数据，不可当作 AelOS 专用库大小**）。词语星球 PG18 数据目录 `/var/lib/vocab/pg18/main` 已核查约 79 MB；远端 Nginx 的前端资源及 API 路由已经证实相互独立。

**容量决策**：本机适合整合静态前端、轻量 Node/Rust API 和相互隔离的产品数据库；不让 Whisper/TTS/GOP 大模型作业常驻主站 2 核 CPU。建议先测压再决定是否升级到约 4 vCPU / 8 GiB 或更多。这是容量规划目标，**不是已采购或已完成扩容**。无论是否升级，模型重算默认由后端异步工作队列调度 Z890/GPU 工作节点；浏览器端轻量音频预处理继续本地执行。

## 三、必须避免路径冲突

现有 `/english` 是英语总馆，`/english/{产品}` 是独立介绍/购买入口。因此每款真正的训练应用安装在更深一层的固定路径：

| 项目 | 介绍/购买入口（现已上线） | 目标正式应用（尚未上线） | 目标专属 API |
|---|---|---|---|
| AccentLab | `/english/pronunciation` | `/english/pronunciation/app/` | `/english/pronunciation/api/` |
| 词语星球 | `/english/vocabulary` | `/english/vocabulary/app/` | `/english/vocabulary/api/` |
| EnglishLeap | `/english/reading` | `/english/reading/app/` | `/english/reading/api/` |
| AelOS | `/english/aelos` | `/english/aelos/app/` | `/english/aelos/api/` |

对外以后不再让付费用户跳到 toktik.tech，但在验收完成前保留现有跳转，**不得发布空白假应用来替换可用旧入口**。新前端必须按路径构建并处理 JS/CSS、上传、WebSocket、SPA history、Service Worker scope；AelOS/词语星球已有部分代码和现有 bundle 固定了 `/english/`、`/vocab/` 或全局 `/api/`，直接复制文件会造成 404 或覆盖主站 `/api`。Vite 需要配置 build-time `base`，运行时代码的根绝对路径也要逐个校正；不要用通配 Nginx 重写吞掉 SOC THINK 的登录、支付和课程 API。Next.js 子应用则在构建时使用 `basePath`。参考官方 Vite 与 Next.js 配置说明。

单一域名同源意味着浏览器不以 URL 路径区分安全来源；因此每款产品仍需独立服务账号、DB 角色、CSRF 防护、CSP、上传审计与受控鉴权，**绝不允许产品通过本地存储共享登录 token，或信任客户端传来的付费标记**。

## 四、数据与账户（两条并行工作流）

**产品重发布流**：独立源码仓库 → Z890/CI 构建 → 带版本号的不可变应用产物 → SOC THINK 服务器对应产品的独立 releases 目录 → 仅内网监听的独立 Node/Rust 服务 → Nginx 精确匹配产品路径 → 实测健康 → 原子切换，失败自动回滚到上一版本。原 SOC THINK Next 生产服务和微信支付不参与子应用替换。

**数据迁移流**：源数据库/学生音频/学习报告做加密备份和校验 → 只往目标专用数据库和独立受限目录导入 → 小批量比对条数、录音字节、引用完整性、权限和学员隔离 → 双跑/冻结写入的短切换窗口 → 校验新增学习记录写向目标 → 保留原站为可回退只读数据源。不得将 AelOS/词汇课数据直接合入 SOC THINK 核心收费表，或跨库直接拿昵称、邮箱、微信 openid 推断身份。

特别提醒：**词语星球使用 PostgreSQL18，而 SOC THINK 目前是 PostgreSQL16。不能原样复制数据目录，也不能假定 PG18 的逻辑导出能无损恢复到 PG16。** 优先在目标独立运行 PG18 实例，再验证符合对应版本的 pg_dump/pg_restore、扩展及角色；或在测试库验证兼容性之后再决定改版。不能为了“只用一个 DB”去覆盖已有主站 PG16。

SOC THINK 作为账户与付款唯一权威来源：用户统一账户、唯一订单账本、四个权益键，各独立 App 由后端验签/查权。真实订单回调、权益期限、过期撤销、登录退出、多设备一致性必须分别测通；**不以统一网页导航代表已经实现统一 SSO 或统一付费**。

## 五、最小化、可执行的迁移顺序

1. **已完成：** 四个英语介绍入口已经位于 SOC THINK，目标路由表在 `config/english-consolidation.json`，执行 `node scripts/check_english_consolidation.mjs` 验证保留路由、业务归属与未切换状态；可加 `--live` 做公开路径只读核查。
2. **已完成基础准备：** 主站已创建不暴露公网的 `/srv/socthink/english-staging/{pronunciation,vocabulary,reading,aelos}/releases`（750 权限、无应用发布、无用户数据）。备份并盘点每套前端、数据库、音频和服务配置；保持旧端在线。
3. **先前端后后端：** 逐项目在目标机器部署不使用真实密钥的候选前端，修复 basePath/asset/API scope；再启动专用后端，不共享运行进程。第一批优先低负载单词前端或已确认资源依赖的发音前端；AelOS 需先识别线上旧构建与当前仓库之间的真实版本差异。EnglishLeap MVP 未独立公网验收不得冒充已上线。
4. **用户与支付接入：** 一次建立 SOC THINK 的 OIDC/服务端令牌兑换和权益查验，而非四个独立购买系统。订单和付款不迁移到子应用。登录、支付、上课、数据保存全流程均通过后才能开放付费。
5. **分批切换与回滚：** 每个产品独立设置启用状态，候选版健康/订单/用户隔离通过后切换；失败自动回到上一个可用版本并恢复旧站入口。旧服务器在对应业务迁移且外部备份核对后才安排其他用途；保留异地备份，避免所有资料和恢复能力集中成为单点故障。

**公开状态说明**：目前只是统一目录已上线、迁移目录及前置规范开始实施；**四个 App 尚未完成完整迁移，也没有验证跨 App 付费和学生记录同步。** 独立 AelOS 端侧语音 P1 已合入 GitHub，但未发布至旧站与新站，迁移时应以当前主线最新稳定版本为基础，而不是把旧生产产物覆盖新源码。

## 六、不得省略的三个运行结论

- 目标机器内存、CPU、磁盘、并发负载需要在真实 AelOS/AccentLab/Vocab 运行包上量测；在 2vCPU、3.4GiB 主机上同时执行大模型生成容易影响支付。先限制进程资源与队列，再决定扩容。
- 因为站点合一，所有支付、账号、数据的责任比以前更集中，离站备份、密钥隔离与自动回退必须先具备；其余繁复发布门禁不额外叠加。
- 整个网站的搜索入口与课程分层仍归 SOC THINK 独立维护；产品训练页面作为子路由，不再引入孤立一级导航或第二套网站首页。

## 七、本轮可复核回执

- 主站现有发布 SHA `40822b2782157cbfc13a35cf369ba8a230ceb0db`；未修改 Nginx 路由或任何生产业务服务。
- 已在 `/srv/socthink/english-staging/` 建立 4 个应用的独立暂存/不可变发布目录；`nginx -t` 成功。
- 本仓执行 `node scripts/check_english_consolidation.mjs`：`ROUTE_ISOLATION_CONTRACT=PASS`；`--live` 验证 SOC THINK 英语总馆+4 个产品介绍页以及 3 个原英语应用公开入口（共 8 个 HTTP 200）。
- 远端语音数据目录约 1.1 GB，PG18 词汇数据目录约 79 MB；**未复制学生音频、数据库、商户密钥或任何生产用户记录**。
- 本阶段提交的是可审计部署方案、保留路径与迁移前置验证脚本；四个产品仍未完成正式同域托管，不应改写其真实开放状态。
