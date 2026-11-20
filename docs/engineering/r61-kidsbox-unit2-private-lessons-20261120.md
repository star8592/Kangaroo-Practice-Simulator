# R61 Kid's Box 1 · Unit 2 (My school) 逐页核对与复用

## 原始证据
- 基础文件：`/home/master/下载/KIDS BOX 学生用书1(1).pdf`，SHA256 `67e8ae9405469552379e29e18a1b2058865f12beb99907b3a2d88c5da50ac31d`。
- 本轮直接核对 PDF 第 15–20 页（原书印刷页 P8–P13）的逐页扫描，而不是依据 OCR 或外部同名教材补全。
- 94 页原书、12 单元/18 分段的私有教师教材库继续沿用 R58/R59；这轮没有搬迁或公开原书，没有新增数据库。

| PDF页 | 课本页 | 可确认内容 | 备课建议 | 不可冒充 |
| --- | --- | --- | --- | --- |
| 15 | P8 | Unit 2 开头图片；Listen and point / Listen point and repeat | 指图和教师讲解 | 具体原声或人物对白 |
| 16 | P9 | `book chair eraser pen pencil table`；`Four purple chairs.` / `No. Six orange chairs.` | 六词独立跟读、两句朗读候选 | chant 原声和听辨评分 |
| 17 | P10 | `Who's that?`、`He's ...`、`She's ...` | 课堂口语框架 | 把未补全句型作为固定答案 |
| 18 | P11 | `How are you?` / `I'm fine, thank you.` | 例句朗读，问候情景 | 原声歌曲 |
| 19 | P12 | `M` / `Michael monkey`；`What colour is the bag?` / `Pink.` | 语音线索、已印例句 | 问答语义评分混同朗读分 |
| 20 | P13 | 六格漫画；Listen to the story / Act out the story | 看图复述待专用任务 | 编造官方故事对白、原版录音 |

## 工程
- 后端原来仅支持 Unit1 的 source_note 读取，现改为以现有 book_manifest.json 的 unit_number 和页范围确定元数据路径，支持 Unit 1–12 以后仅增加经过逐页核对的数据文件。不存在文件的单元仍返回 source_note:null。
- Unit2 源页证据保存在 `ops/content/kids-box-student-1/unit2_source_notes.json`，生产只安装到 `/var/lib/socthink/teacher-books/kids-box-student-1/metadata/unit2_source_notes.json`，严格匹配 PDF SHA、章节页码、schema、teacher_review_required，权限600。
- 前端单元号随源页回执动态显示，保留 R59 核对保存与 R60 词汇预勾选，所有内容必须教师核对、保存后才导入作业；未完成的句型与漫画故事均不自动出分。
- 浏览器测试：390px移动 Chrome：Unit1 P5七词仍能发布模拟作业、Unit2 P9六词经老师核对→保存→导入→确认→模拟生成六词作业，Word/PDF及R56/R57回归。
- 后端隔离PostgreSQL18真实E2E：Unit1/2源页、学生访问拒绝、R59持久化保存与409冲突、R57五模拟学生十次评分与原作业成绩回归。
- 不使用或虚称真实老师微信手机与真实学生成绩。正式上架顺序为：私有元数据→主站 PR 全绿及原子发布→前端合并并原子发布→公网资源与认证检查。
