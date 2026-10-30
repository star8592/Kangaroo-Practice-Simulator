# SOCTHINK · AI 考官式口语模拟考试中心（平台级 V1 设计）

**来源**：Owner 2026-10-30 新增需求；[平台主线 #144](https://github.com/star8592/Kangaroo-Practice-Simulator/issues/144)；[口语专项 #149](https://github.com/star8592/Kangaroo-Practice-Simulator/issues/149)。

## 核心产品

SOCTHINK 下的 **Language / Oral Exam Simulation**，服务 KET/A2 Key、PET/B1 Preliminary、IELTS、2026新版TOEFL iBT、PTE Academic。不是新域名、新登录、第二支付系统，也不是简单朗读分数小组件。语言域目录仍为 `planned`，**除非出现实际音频考试全流程、评分及安全/权益测试回执，不允许显示可考或可购买**。

目标客户：小学生（尤其 KET/PET）、留学备考青年、雅思与托福/PTE 考生、英语教师和培训机构。英文跃迁舱的音频训练能力可通过独立适配器互用，但不得混合个人学习数据、支付身份或把通用英语训练说成符合具体考试规则的全真模拟。

## 真实用户体验（移动优先）

入口：选择考试 / 查看格式与适用人群 / 免费体验短试 / 麦克风检测 / 知悉录音用途和授权 / 选择全真或训练 → AI 考官开场 → 一问一答（KET/PET AI 搭档参与）→ 结束存档 → 证据化诊断 → 点击问题音段局部复练 → 全卷或同类题复测 → 选择购买专项包/套餐。

**全真模拟**：遵守考试时长、任务、角色、倒计时、准备时间、问答策略；考试中不得自动纠错、反复播放受限题音、显示评分、提供提词或越权提前跳题。AI 不自由发挥违反考试标准；动态追问只在考试允许范围内，并有可复核的 prompt/角色/时间限制。

**专项训练**：同一道题可慢速播放标准音、看音素/词/意群、断句连读和弱读标记、A/B 波形对齐、听自己与标准音、局部录音重试；这些功能不得渗入全真考试流程。支持英/美及其他考试允许口音，**清晰易懂而非某一种口音才算正确**。

**KET/PET**：考官 A 负责开场/提问；考官 B 为观察/评分角色；用户为真实考生 A，第二考生可由 AI 充当或通过配对真人考生参加。AI 搭档在讨论时回应、同意/不同意、提出问题，避免只做机械填充。若只支持单人互动，需要标示为“单人练习”，不能标记完整双人仿真。

**雅思**：Part 1 日常问答（4–5分钟）；Part 2 话题卡、1分钟准备、个人长篇表达，Part 2整体3–4分钟；Part 3 抽象话题深入讨论（4–5分钟）。口音灵活，评分须按四项官方描述做证据化**练习估计**，不能称官方 band。

**2026 托福**：2026-01-21 以后口语以 Listen and Repeat / Take an Interview 两类任务为准，约8分钟。旧版题型只能在明确标记“历史题型练习”情况下存在，不能用于新版正式模拟或估计成绩。ETS 的 1–6 评分尺度和具体任务要求按官方当期版本引用，未经校准不输出确定官方成绩。

**PTE**：机考体验、每题准备/录音时间，2025-08-07 更新包括 Respond to a Situation 和 Summarize Group Discussion。PTE Speaking 与 Writing 在一部分内，不能擅自宣称“官方独立口语总时长”。

### 官方依据（截至 2026-10-30 校验）

- Cambridge A2 Key format: https://www.cambridgeenglish.org/exams-and-tests/qualifications/key/format/
- Cambridge B1 Preliminary format: https://www.cambridgeenglish.org/exams-and-tests/qualifications/preliminary/format/
- IELTS Speaking: https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-speaking
- IELTS scoring: https://www.ielts.org/take-a-test/your-results/ielts-scoring-in-detail
- TOEFL 2026: https://www.ets.org/toefl/test-takers/ibt/about/content.html
- TOEFL Speaking: https://www.ets.org/toefl/test-takers/ibt/about/content/speaking.html..html
- Pearson PTE 2025 revisions: https://www.pearsonpte.com/pte-updates-2025/
- PTE task formats: https://www.pearsonpte.com/pte-academic/test-format/speaking-writing/

第三方商标用来准确描述考试兼容性，不暗示与考试官方合作、授权、成绩认证。

## 共用执行内核：Rust 模块化单体的边界

- `OralExamBlueprint`：`examId`、`version`、`effectiveFrom`（仅有可靠生效日期时）、`verifiedAt`、`officialSource`、`sections`、`taskTypes`、`roles`、`timing`、`rubric`、`readiness`。
- `ExaminerTurnController`：固定协议状态机 `mic-check → consent → intro → part(question → candidate audio → optional controlled follow-up/partner turn) → finish → report`；server clock 是唯一计时权威，正式考试和训练 mode 的能力不可混用。每个 turn 关联 `sectionId` / `questionRevision` / `role` / `audioRef` / `startedAt` / `endedAt` / `transcriptRevision`。
- `RealtimeAudioAdapter`：前端浏览器安全麦克风接入（真实手机 Safari / Chrome / 微信小程序三端实测），音频压缩与分段上传、双向语音流、静音检测、打断与重试。首选语音交互自然，而非有角色的文本聊天假装口试。可用 Rust 管理 API/会话，受控推理/语音模型作为专门的适配器，不复制权限/支付业务。
- `AudioEvidenceStore`：考官与学生音轨分开、每段哈希、时间戳、版本钉住、独立读取/权限、同意与删除/保留期；断网不重复创建考试/扣额度，模型/评分失败不得导致音频消失或伪造完成。
- `OralRubricAdapter`：语音声学（停顿、语速、节奏、可懂度）与 ASR 内容、语法/词汇/互动能力分证据评估；不拿错误转写“惩罚口音”；不为所有考试使用一张分数表。人评数据集/盲评用于验证模型的绝对误差、区间校准、不同音质/口音公平性。未完成标定之前提供“练习诊断”而非官方成绩承诺。
- `OralRetest`：原声定位、标准示范（标明合成声/授权真实声）、针对性训练、复测证据；报告不是一次性终点。
- `Entitlement`：继承平台已有支付/次数/用户/机构系统；每次模拟留存音频大小、ASR/TTS/LLM/模型推理费用和完成率，区分免费体验与付费真实能力。

## 交付顺序与验收

**第一竖切**：先完整跑通一次雅思 Part 1 全真模拟（无需第二考生，能够验证自然对话和音频管线），再扩展雅思完整三部分；KET/PET 的 AI 搭档和角色轮转是独立必须完成的验收，不能以雅思一对一冒充它们。与 SQL 实操并行共用 P1 执行核心。

0. 本分支：版本化考试蓝图及结构/角色/模式单测、统一目录 `language` 规划描述；**仅契约，无考官语音及用户可用入口**。
1. 音频竖切：真实麦克风→考官提问/回复→录音分轨、服务端会话与恢复→证据可独立读取；先做可工作的免费模拟，拒绝假演示。
2. 评分与学习：按 rubrics 分证据给不确定性，实际对照人工考官样本，音频片段定位及局部复测。
3. KET/PET：双考官角色、AI/真人搭档、真实轮次；托福 2026/ PTE 新题型单独官方格式回归。
4. 微信与移动：低延迟/中断/授权/噪声/弱网/切后台/上传重试/录音泄漏测试；学生与家长隔离。
5. 支付与经营：真实免费体验→按次购买/会员→扣次/退款复权/对账；记录每分钟音频/推理资源成本。

**统一验收定义**：一个真实客户可从搜索/入口进入，在实际设备上完成一场考试，音频、题目版本、评分证据和训练记录持久保存、权限正确、可回放、断网可恢复、成本可核算。只有到这一步才可把口语业务状态从 `planned` 改为 `live`；单纯有 Registry、UI、测试模拟录音、OCR 候选数不能算上线。
