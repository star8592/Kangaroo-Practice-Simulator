# SOC THINK 英语产品边界重审（2026-11-16 · 修正版）

状态：产品决策、代码价值审计及迁移方案；**未执行生产迁移、删除或上线**。本修正版替换2026-11-16早先将EnglishLeap留为阅读Owner/AelOS归为单纯规划的错误归类。

## 根因与事实
- AelOS 的 README 第一段仍称 Mission 驱动，但 **docs/PRD-2.0.md** 及 **docs/IA-2.0.md** 已明确废弃强制单一 Mission：**Article=学习单元、Library=主入口、Reader=训练舞台**，Theme Package 可选，Skill Graph/Goal/LevelSet 是阅读驱动学习的辅助能力。AelOS 不是纯规划器，也不只是静态阅读器。
- AelOS 当前代码具备 ArticleReader、分级 Lexile、段落朗读、文内词汇、MindMapStep、口头复述、QuizStep、WritingRevision、阅读结果与教师相关业务。用户目标是保留和强化阅读为主线的综合学习体验。
- EnglishLeap README/PRODUCT-BLUEPRINT-V2-FOUR-STUDIOS 描述的统一四工作室已经与 SOC THINK 现有专业应用及 AelOS 阅读主线高度重合，不再为其保留一个平行阅读产品。其本机三篇原创双语文章、4本书目元数据、九步本机精读、五步纸书伴读、本机写作草稿/导图/证据和 AccentLab 演示，分别评估迁移价值；不能将所有功能照单全收。

## 单一业务 Owner（此决策替代前次提案）
| 客户任务 | Owner | 调整 |
|---|---|---|
| 围绕文章选读、分级精读、阅读理解、文本内词汇/语法/思维导图/复述/写作、长期阅读成长 | **AelOS** | 阅读主产品；连贯的多模态阅读任务留在AelOS，不拆成孤立工具 |
| 专项发音/纠音/口语听力训练、国内中高考英语听说机考、教师听说作业及评分 | **AccentLab** | 不复用EnglishLeap旧发音演示作为第二正式实现 |
| 独立系统背词/长期词汇记忆及复习 | **VocabLearningPlatform** | AelOS文章内词汇工具仍保留（上下文词汇），以授权接口互通而不是复制词库 |
| SOC THINK账户/微信/订单/支付/权益和机构角色 | **主站** | 保持唯一权威，不在英语仓库重建 |
| 专项英语写作产品 | **暂不新建** | AelOS已有文章内写作助手；只有独立产品客户/价值证据明确后再考虑 |
| 共享考试内核 | **轻量契约** | 各赛制的业务归属明确，避免新中控 |
| EnglishLeap | **迁出价值→关闭重复业务→逐步退役** | 不是永久性阅读产品；保留兼容路由、必要历史数据直至安全迁移完成 |

## EnglishLeap功能价值与处理矩阵（初步代码审计）
| 功能 | 代码/证据 | 初步决定 | 验证点 |
|---|---|---|---|
| 原创双语文章、段落双语排版 | EnglishLeap README, ReadingView.vue | **筛选有价值的内容和排版体验→AelOS** | 现有AelOS阅读器是否已有同等/更优功能；内容权利/质量 |
| 纸质原版书章节五步伴读 | BookCompanionView.vue, data/bookSessions.ts | **重点候选迁移AelOS** | 独特的“拥有纸书+不复制正文+证据读写”价值，保留旧本机记录 |
| 4本书目的目录/来源信息 | BooksView.vue，README | **保留书目元数据视需要导入AelOS** | 书目版权及真实来源；不误称可提供全文 |
| 原创文章九步精读 | StudyFlowView.vue, data/studyFlow.ts（localStorage） | **不平行保留**；可用独特教学步骤融入AelOS现有ArticleReader | 对AelOS实际多步骤价值差距逐项验证 |
| 独立导图工具 | MindMapView.vue | **拟淘汰独立实现** | AelOS已有MindMapStep及测试；只迁必要历史数据 |
| 旧AccentLab及口语演示 | AccentLabView.vue, PracticeView.vue | **拟淘汰重复UI**；经核实的素材/教学内容移交AccentLab | 现有正式AccentLab端到端真实评分正常 |
| 简单写作草稿 | PracticeView.vue | **拟淘汰平行写作工具**；必要时保留可导出草稿 | AelOS已有WritingRevision/文章内写作练习 |
| “AI Coach”本机计数工作室 | StudioView.vue, data/learningEvidence.ts | **拟淘汰平行产品** | 本机计数不等于AI技能画像；AelOS已有技能和成长领域 |
| 国际考试中心本机演示 | docs/ENGLISH_EXAM_CENTER_MASTER_20261111.md | **逐项评估口语训练素材是否移交AccentLab** | 完整题量/版权/录音/评分/正式考试差距巨大；未验证前不保留为销售产品 |
| 账号/持久化试验与UI壳 | README, db/README.md | **不复制到新业务** | 主站唯一身份/交易；只有经过审查的通用安全技术可参考 |

## 价值审查标准（不是必须全部保留）
每个旧功能判定 KEEP_MIGRATE / KEEP_ARCHIVE / RETIRE / NEED_EVIDENCE：
1. 是否解决当前用户明确且独特的学习任务？
2. AelOS、AccentLab或Vocab现成实现是否更强、更可靠？
3. 是否有真实使用、可测质量、学习/成交价值及维护成本证据？
4. 内容素材/用户私人数据的来源、授权和迁移能否证明？
5. 能否用现有专业模块小规模吸收？如果要长期维护两份代码，一律优先淘汰后者。

## 删除执行规则
- 先冻结 EnglishLeap 新增功能性研发（仅允许安全/数据迁移/兼容必要维护）；在 AelOS/AccentLab 上实现经过确认的独特能力。
- 备份 EnglishLeap 账户和浏览器localStorage中的私有书库笔记/草稿/导图/学习记录；旧数据导出/导入、账户归属和用户二次进入的可恢复验证通过后再删。
- 删除重复页面和路由时设明确兼容/重定向映射；不做整站粗暴跳转。
- 只有主站各入口与真实手机/桌面考试、录音、学习流程可用且有精确SHA/自动回退回执后，才撤下旧线上服务。旧GitHub仓库先归档不物理删除，备份安全可回退。
- **本轮只更新设计/审计材料，没有执行数据删除或生产切换**。

## 关联
- AelOS PRD 2.0: https://github.com/star8592/aelos/blob/main/docs/PRD-2.0.md
- EnglishLeap旧产品蓝图: https://github.com/star8592/EnglishLeap/blob/main/docs/PRODUCT-BLUEPRINT-V2-FOUR-STUDIOS.md
- AccentLab公开采购资料: https://github.com/star8592/AccentLab/blob/main/docs/CN_LISTEN_SPEAK_PROCUREMENT_RESEARCH_20261116.md
- EnglishLeap拆解: https://github.com/star8592/EnglishLeap/issues/46
- AccentLab听说考试: https://github.com/star8592/AccentLab/issues/58
