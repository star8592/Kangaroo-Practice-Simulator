# SOC THINK × 英文跃迁舱：入口、账号、代码边界与视觉系统

> 2026-11-15 现行正式架构审计。目标：简化用户入口、提高可读性，**不拆分重复身份系统，也不把四套英语产品合成一个巨型服务**。

## 1. 现行生产路径（独立应用，共同品牌）

| 用户看到的内容 | 责任代码 | 正式路径 | 说明 |
|---|---|---|---|
| SOC THINK 首页 | `Kangaroo-Practice-Simulator/src/app/page.tsx` | `/` | 总入口：数学、英语及其他学习产品 |
| 英语导航及发现 | 同仓库 `src/app/english/page.tsx`, `src/lib/english-products.ts` | `/english` | **纯产品导航**；产品登记不是授权或收费来源 |
| 发音产品介绍页 | 同仓库 `src/components/EnglishStudioPage.tsx` | `/english/pronunciation` | 指向 AccentLab 正式应用 |
| 发音练习与精选书架 | `AccentLab/frontend/src/main.ts`、`PracticeLibraryView.vue` | `/english/pronunciation/app/` → `/practice-library` | 默认学习页，不强制登录就不能浏览 |
| 已认可的跟读 V3 | AccentLab `FollowAlongV3BookDataView.vue` 等 | `/english/pronunciation/app/follow-along-overlay-v3` | 核心发音、录音、波形、评分交互保留 |
| 教师工作台 | AccentLab `HomeworkTeacherView.vue` | `/english/pronunciation/app/teacher/homework` | 无权限展示申请或等待批准；有权限进入班级 |
| 管理员审核教师 | AccentLab `HomeworkAdminView.vue`、主站 `ClassroomAdminClient.tsx` | `/english/pronunciation/app/teacher/admin` | 管理员可主动指定或审核、撤销/恢复教师资格 |
| 学生微信作业 | AccentLab `HomeworkStudentView.vue` | `/english/pronunciation/app/a/:tenant/:token` | 从老师发送的微信作业专属链接直接进入 |
| 课堂业务 API | 主站 `src/app/english/pronunciation/classroom-api/[...path]/route.ts`、`src/lib/classroom-web-*.ts` | `/english/pronunciation/classroom-api/` | 现行 Next 进程，课堂数据存储独立、权限核验在服务器端 |
| 单词 | 词语星球独立应用 | `/english/vocabulary/app/` | 独立业务代码及学习数据 |
| 阅读 | EnglishLeap / 小小阅读星球独立应用 | `/english/reading/app/`、`/english/reading/kids/` | 两种内容路径，不重复建登录 |
| 高阶阅读 | AelOS 独立应用 | `/english/aelos/app/` | 独立业务数据和服务 |

### 明确原则

- 不将 `ENGLISH_PRODUCTS` 当做权限或支付中心；它只决定导航展示。
- 不复制微信 OAuth/密码或存储第二套主站身份：主站 `/login?next=...` 与 `/api/auth/parent/me` 是发音正式课堂的可信身份核验链路。
- 主站身份映射至 AccentLab 内部稳定 UUID；班级教师、学生录音、评分应保持按租户、班级、账号隔离。
- 微信内单手机使用公众号网页授权，桌面浏览器使用网站微信扫码；手机非微信浏览器引导用微信打开，不让用户在同一手机上扫描自己的二维码。
- 独立业务数据库继续独立，PostgreSQL 实例可共用；后续跨产品计费权益须独立验收，不假定已经全面统一。
- 发布：SOC THINK 后端先验收上线，AccentLab 静态资源再在 `/english/pronunciation/app/` 原子切换。不要从 AccentLab 陈旧 `main` 打包覆盖现行 OCR/作业/V3 优化。

## 2. 四种用户旅程与第一屏

1. **游客/普通学习者**：`/` → `/english` → 选择发音/单词/阅读 → 应用首屏是学习书架（发音默认 `practice-library`）→ 选择内容 → 发音与跟读。仅需保存进度或进入限制功能时要求微信身份。
2. **持教师作业链接的学生**：从微信群点专属 `/a/:tenant/:token` → 如需身份，则在原页面发起统一微信登录 → 仍回到这张作业 → 申请加入班级 → 教师批准 → 完成听、读、自动录音与评分 → 看到自己的反馈。不可跳转到其他孩子的作业或成绩。
3. **教师**：从英语页“我是老师”直接进入 `/teacher/homework` → 未登录显示统一微信登录 → 已登录未获批准显示申请/待审核状态 → 已批准显示班级和真实人数 → 录名单、审核入班、布置作业、查看完成与纠音结果。
4. **管理员**：从 `/teacher/admin` 进入 → 使用同一主站微信身份核验站点所有者 → 搜索已验证账号主动赋权、审核申请、撤销或恢复教师。管理员不应该需要另造一套账号。

> **永远不按用户“是不是老师”强行跳转默认发音书架。** 老师也可能自己练习；用户点击何种任务入口，就在完成登录后回到那个任务入口。没有作业链接的普通学生，不能通过填写相同姓名自动访问他人作业。

## 3. 共同视觉系统（学习页与教师页）

- 字体层次：H1 30–40px；卡片 H2 20–24px；正文 15–17px；辅助说明至少 14px；只允许极少量装饰性编号更小。移动端输入框字体至少 16px，避免 iOS 意外放大。
- 色彩层次：主字为深墨绿 `#203c2a` 或同档明度；辅助文字 `#526856`；状态绿色 `#17664d`；轮廓 `#c9dccc`；浅底 `#eff6ea`。浅灰绿只用于装饰，不能承担核心操作说明。
- 宽屏：英语目录最大 1400px，教师管理最大 1380px，使用自适应左右留白；尽量两栏但允许大字换行。
- 手机：380px 宽度不横向滚动，正文不低于 14px，按钮点击高度不低于 44px。顶部只保留当前任务、简短导航和一眼可见的主要操作；不增加冗长欢迎卡。
- 教师首页的第一优先级：当前班级、已入班/待审核/预登记人数、待审批学生，再到添加学生、作业、成绩。学生练习首页的第一优先级：示范音、朗读、得分、纠错，不改 V3 已验证布局。
- 采用 SOC THINK 英语导航的排版尺度和 AccentLab V3 已有圆角卡片、墨绿主色、分层反馈作为**共同视觉语言**；不要把录音训练的特殊小字号扩散到教师管理页面。

## 4. 下一阶段代码整理原则

- 主站 `src/lib/english-products.ts` 是唯一导航入口清单，禁止其他代码维护另一份容易分叉的产品名称和正式 URL。
- AccentLab `frontend/src/main.ts` 是唯一 Vue Router 路由表，作业、教师、管理员、书架都从这里管理。
- AccentLab CSS 已有多个历史版本叠加。先为 `teacher-workspace` 与英语目录使用局部设计 tokens；待视觉回归覆盖手机和桌面后，再逐模块收敛历史 CSS。**严禁借整理 CSS 全局覆盖获认可的 V3 跟读页面。**
- 微信账号、教师授权、学生入班由主站课堂 API 验证；页面只显示授权结果，不在前端凭昵称/角色推断权限。
- 任一发布必须检查：微信登录返回路径、教师授权状态、班级人数、V3 跟读录音/评分、移动宽度、四英语入口 HTTP、数据库隔离、旧版回退点。

## 5. 本轮实现边界

- 只对主站英语入口与 AccentLab **教师工作台**实行宽度、字号、对比度和任务入口改良。
- 不调整 V3 练习句子队列、波形、口型、评分流程；不修改业务数据库、微信 AppID/OAuth、计费接口。
- 新 CSS 与入口分别按后端/静态资源的现行发布流程验收，保留回退机制。
