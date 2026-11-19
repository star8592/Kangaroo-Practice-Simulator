# AccentLab R8｜10 条初级短句：保留原课程、统一三模式、真实声学评分

日期：2026-11-20。承接学生端 R7A～R7D，保留原 9 条 B1 跟读语料及基础跟读/单词专项/情景问答三个模式。新增加「入门短句 · 10句」课程难度开关，默认不替换老课程，且学生可自由切回原课程。

## 真实资产和版权来源

- 10 条是现有 `star8592/AccentLab` 的 **foundation-v36** 原创教学样本，不是未经授权抓取教材，不是另行生成的大模型回答。来源 manifest：`frontend/src/data/foundationAudioManifest.json`；真实文件位于已经部署的 `/english/pronunciation/app/audio/foundation-v36/`。以 `BeginnerShortData.ts` 内固定音频路径和 SHA-256 验证。
- 标准音来自先前已审查的 **Kokoro af_heart AI 合成音**，不是母语者或真人录音；不虚称与浏览器逐词 TTS 同一发音人。
- 10 条标准音通过 `scripts/build_accent_beginner_slow_03.py` 根据原 MP3 逐一校验 SHA-256，用 FFmpeg `rubberband=tempo=0.3` 生成保音高 0.3 倍慢速，SHA、时长、原音轨指纹登记于 `public/english/pronunciation/next-lab/audio/beginner-slow-03/manifest.json`。自动播放器在预渲染音轨不可用时回退浏览器慢速，音质不能以合成器基准代替实体试听。
- 学生界面按原来方式显示大字号整句，每个词可点读、0.3～1.15×，一键跟读和真实百分制；单词专项复用现有 A/B 录音，情景问答使用 10 个配套人工编写短问题和中文提示。

## 不新增不可信评分

- 后端 Rust 已有 `POST /english/pronunciation/api/follow-along/items/private-session/score` 约定：请求头 `x-english-leap-expected-sentence` 必须为严格百分号编码的短句，评分音频为**真正麦克风录音**，Rust 以该句作为比较目标转送已有评分服务。
- 单词专项采用 `.../private-session/score-word/{word}`，沿用相同头并验证请求单词属于选中短句。
- 录音、错误处理、无录音/无权限不造分、录音生命周期、口音容忍边界和百分制都复用现有逻辑，没有换评分模型，也没有额外保存儿童录音。
- 在生产环境中，以 AccentLab 已提供的 **The cat is sleeping.** 示例标准音调用现有私有句评分接口，得到 HTTP 200、识别文本 `THE CAT IS SLEEPING`、分数 100；这是**自合成参考音验通评分链路**，不代表儿童真人口音准确率或语义评分水平。
- 初级情景问答只比较**绑定参考答句的发音**；不同语义正确回答可能因与该句不同而得分低。此功能仍不可宣传为有可靠语义理解的自由 AI 老师。

## 质量和发布边界

- 原有课程仍默认；课程切换清空当前句子的分数/临时录音/提示/错误与高亮，不强制课程晋级；录音时禁用切换。
- 10 段 0.3× MP3 必须均为实际可播放文件，存在校验清单；原始 SHA 与源 manifest 一致；所有线上 URL HTTP 200。
- Playwright 的手机与桌面回归覆盖：两课程双向切换、3 种模式、文本与语音映射、慢速 URL、Rust 私有短句和词的**精确 expected_text 头**、评分 503 不造分、没有横向溢出。模拟麦克风不等于实体手机验证。
- PR 完整 CI + 主线 CI 全通过后使用已有自动回退部署器；必须核对服务器和公网 SHA 才可称已上线。
- 后续进一步扩大由教师审核的儿童词汇/短句/对话题库，并建立独立的正确性判断与真人口音校准数据，不用固定参考句评分替代语义评价。
