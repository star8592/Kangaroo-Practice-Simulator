# R59 教材逐页校对持久化

## 原始教材与现有系统
- 原始文件：Z890 `/home/master/下载/KIDS BOX 学生用书1(1).pdf`。源 SHA256：`67e8ae9405469552379e29e18a1b2058865f12beb99907b3a2d88c5da50ac31d`。
- R58 已将整本 94 页、18 份章节 PDF 和 84 页旧版 OCR 草稿放入教师私有目录。12 单元、3 复习、词汇表、前后附录；PDF 页码需比印刷页码加7。
- 正式私有数据：`/var/lib/socthink/teacher-books/kids-box-student-1/`，源副本存 Z890 `/mnt/disk2/socthink-content-private/books/kids-box-student-1/`。不进入公开 Next/Vite 文件资源。
- 第二套本地 Tesseract5 88 页 OCR 候选另保留在 canonical `ocr_tess5_candidates/`，不能自动进入发布或得分。原书无音轨，练习指令与官方听力脚本不可混淆。

## R59 新增
- `accent.teacher_book_page_reviews`：按 tenant + class + book + pdf_page 唯一保存教师对照原页修正过的英文和修订版本。
- 教师带有有效微信身份及本班 lead teacher 权限后，访问相同的 R58 私有教材接口。阅读 `/pages/:page/ocr` 优先返回已保存文本，review_status=teacher_verified；未审仍返回旧 OCR 草稿、绝不生成学生评分内容。
- `POST /tenants/:tenant/classes/:classId/books/kids-box-student-1/pages/:page/review` 显式 confirmed_original=true，text 非空且 <=12000 字符，并传 expected_version；并发编辑冲突返回 409，不静默覆盖。
- 前端 R58 `TeacherBookPicker.vue` 加“保存本页审核结果”；未保存时无法将该页输送到 R55/R56/R57 现有的句子、对话和词汇作业发布编辑器；重新打开或换设备能够继续使用审核过的原文。
- 已校对页面不等于自动布置作业：教师仍需在原作业编辑器逐条选择、确认材料并发布学生可访问的练习。

## 验证及上线路径
- `bash scripts/test_classroom_book_review_schema.sh`：隔离 PostgreSQL18、两次运行迁移、FORCE RLS、租户策略与非特权运行角色授权。
- `ACCENTLAB_MIGRATIONS_DIR=... ACCENTLAB_E2E_CANARY=... npx tsx scripts/test_classroom_kidsbox_review_owner_e2e.ts`：模拟老师/学生班级，原书页图/OCR/18章节，未授权不可读取和修改，保存与重开、修订、409 冲突；真实5学生×2词及既有句子评分回归。
- 前端 `npm run build` + `node scripts/test_teacher_smart_material_ui.cjs`：390px手机浏览器，单元切换、审核保存、重开回读、原 Word/PDF/R56/R57 不退化。
- **严格部署顺序**：生产库备份 → `ops/db/20261120_accent_teacher_book_page_reviews.sql` → 只读 `ops/release/check_r59_book_review_db_ready.sh` → 合并主站 PR → CI + 原子发布/public SHA核验 → 合并前端 PR → 前端原子发布和公网保护回归。自动部署未满足 DB 检查时跳过而非抢先切换。
- 真正老师用微信手机校对并发布一课作业还需真实设备使用验收。
