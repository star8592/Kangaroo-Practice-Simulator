# SOC THINK｜唯一 Next.js Web 与 Rust 业务核心规范（2026-11-17）

> 状态：**已确立标准，正在逐模块迁移；不能把现有 Vue/Vite 旧应用写成已退役**。证据基线：生产 Nginx 配置、运行服务、四个源码仓库的 package.json、主站 App Router。

## 一、技术红线

**Web 只用 Next.js App Router + React + TypeScript。** 统一视觉设计、导航、微信登录入口、SEO、手机布局、业务权限展示与一套部署机制。已上线的 Vue/Vite SPA 和 React Router/Vite 只能作为迁移期遗留对象；禁止创建新的独立 Vue/Vite 前端。

**业务权威归 Rust Axum**：微信认证/会话、角色与学校机构、计费与权益、考试会话/锁卷/评分、学习进度、内容审批及写入。Next SSR/RSC 可渲染、取数、保护显示，不应新建权威业务写 API。原有 91 条 Next API 继续以既有边界保护脚本冻结，逐条等价迁移，不得扩张。

**PG18 一套实例、分域 schema、一个身份与计费来源**；模块代码和物理部署可以渐进整合，保留正常运行的 AccentLab/词语星球/阅读 Rust 服务。严禁为迁移再复制一套用户库、支付中心、个人账号和商业授权。

**不增加复杂门禁**：构建、类型检查、最小功能验收、自动回退是发布必要检查；其他审计自动执行，不人为阻止正常迭代。旧版保留到新旧能力、数据和线上回执核验通过；确定无用代码随迁移立即清理。

## 二、线上与源码实测矩阵

| 模块 | 实际框架 | 现正式 Web 路径 | 处理 |
|---|---|---|---|
| 主门户/数学/考试 | Next.js | /、/math、/assessments | 作为唯一 Next Web 宿主 |
| AccentLab | Vue 3 + Vite（源码 16 个 Vue 组件） | /english/pronunciation/app/ | React + Next 迁移，保留 Rust 评分/录音与 AI 声学服务 |
| 词语星球 | Vue 3 + Vite/Pinia（15 个 Vue 组件） | /english/vocabulary/app/ | 按学生/老师/家长角色迁入 Next，Rust 作业/权限/PG 保留 |
| EnglishLeap 旧阅读 | Vue 3 + Vite（8 个 Vue 组件） | /english/reading/app/ | 只保存历史记录导出与迁移；**不重建第二套阅读产品** |
| AelOS 正式阅读 | React + Vite + React Router（83 个 TSX 组件） | /english/aelos/app/ | 优先复用 React 组件，逐步迁入 Next App Router |
| 小小阅读星球 | 静态页面，框架未核证 | /english/reading/kids/ | 先核实源代码、故事/音频资产和版权，再迁移 |

机器可读证据：SOCTHINK_UNIFIED_WEB_INVENTORY_20261117.json。现有四套英语 SPA 静态资源由 Nginx 优先于 Next 拦截；API 代理另指向 Rust。迁移 **只先替换 Web，不先关闭健康运行的 Rust 接口**。

## 三、规范目录及边界

主站 src/app 只放路由、layout、loading、error；新 React 业务组件集中 src/features/english/{pronunciation,vocabulary,aelos}、src/features/math、src/features/assessments、src/features/platform；src/lib 只放类型、展示工具和读 API 适配器；后端代码 backend/socthink-core；数据库变更 ops/db；真实回执和 ADR 放 docs/architecture。正式业务 API 统一走同站 Nginx/Rust，不增加 Next 中转写接口。

## 四、一次一模块、真实替换与清理顺序

1. R0：建立实际运行框架清单和 CI 反回归检查；规范新增代码只允许 Next/React；各遗留路径记录路由/身份/数据/评分归属。
2. R1 AccentLab：先将公开句子书架和示范音接到主站原生 Next 试验页，调用真实 Rust；再逐项对齐旧 V3 的示范→提示音→自动录音→静音停止→真实评分→优先纠音词、波形和移动版；完整验收后替换旧 app 路由。
3. R2 词语星球：用户/班级/老师工作台由统一认证与 Rust 授权决定，学生听写/复习及报告迁 React。生产 demo/state 返回 404，不允许把演示流程冒充正式可用。
4. R3 AelOS：保留文章资产与库、分级阅读、理解训练、表达/写作、成长报告，沿用可重用 React 组件，移除 React Router/Vite 的另一个 Web 运行时。
5. R4 EnglishLeap：从原浏览器导出与迁入 AelOS 的数据核对完成后退役，不先删除 localStorage/IndexedDB/历史草稿。
6. R5 小小阅读星球：核对源项目、72 篇故事和实际音频/题目后迁 Next，不能丢已上线的儿童阅读功能。
7. R6 清理：对已经 Next 等价通过的旧 URL 做 308；移除对应 Nginx 静态入口、旧 Vue/Vite 构建、重复菜单和无用数据副本，更新唯一 registry；老 Rust 服务按业务治理整合，不因前端迁移直接删除。

## 五、不可破坏的验收条件

教师：一个主班老师管理多个课程和学生，自动批改减少劳动。学生：单设备微信登录，服务端真实权限和计费判断。考试：计时、章节锁定、提交幂等及成绩记录只能一处权威写入。AccentLab：延续现有用户认可的单步跟读体验，手机优先。历史数据：导出或可核验迁移前不清除。

每个迭代都应附：旧新路径、真实 Rust API、保留和删除的功能清单、桌面/手机真实点击、身份和收费检查、Git SHA、上线回执、回退说明。HTTP 200 和假数据都不能替代功能通过。

## 六、在线调试规则

使用已有 CI 绿色后自动发布与原子回退流程，生产服务器的版本 SHA 必须和 GitHub/main 一致；当主干被其他并行项目更新，应先合并最新 main 再上线。调试接口不得打开真实生产评分、支付或儿童身份的试验写入权限；无法完整证明的功能作为有标识的 Next 候选，不提前替换旧服务。
