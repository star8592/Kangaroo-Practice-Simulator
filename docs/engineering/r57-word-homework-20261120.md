# R57 教师单词专项作业

## 功能
- 教师审核教材后，直接把1–40个单词或短语作为独立单词作业发布。中文释义不会进入发音目标。
- 统一 SOC THINK 微信登录和教师班级权限；未入班的学生必须经过原教师班级审核。
- 学生手机独立逐词录音、回听、真实 OpenPronounce 参考分；模型失败不记虚假分数。
- 独立数据库 accent.word_assignments、accent.word_assignment_items、accent.word_assignment_attempts、accent.word_assignment_receipts，不修改旧句子作业成绩。
- 教师可查看每人完成词数、录音次数、最高分和每词平均分，可重发/停止链接。
- 录音保留最多30天，使用定时清理脚本删除到期音频；统计结果继续保存。

## 验收
- PostgreSQL18 迁移幂等运行、四表 FORCE RLS、app role 授权。
- 隔离数据库中5名模拟学生×2个词，共10次真实评分；重复请求幂等，重发和关闭链接、学生录音隔离通过。
- AccentLab 手机浏览器检验 Word/PDF 解析、单词审核发布、学生逐词显示；无录音不出现成绩。
- 所有上线声称以服务器发布 SHA、数据库权限、前端资源和鉴权回执为准。

## 部署顺序
1. 备份正式 accent_lab 数据库，执行 ops/db/20261120_accent_word_homework.sql。
2. 确认 accentclass 对四张表具备 SELECT、INSERT、UPDATE，且 FORCE RLS 有效。
3. 主站 Next.js 更新，核对 /api/release 和课堂健康检查。
4. AccentLab 前端原子发布，核对公网资源、学生作业页与未登录防护。
5. 安装 ops/release/install_classroom_audio_expiry_timer.sh，并先用清理脚本的 --dry-run 验证。

## 限制
- 设备TTS 0.3倍是目标请求，某些手机会限制实际速度；不声称它是考试官方原声。
- 单词发音分和句子分不做横向比较。
- 微信真机文件选择、学生真机录音仍需教师实测验证。

## 新增发布保护（R57 复核）
- 主站原子自动发布脚本在检测到 `src/lib/classroom-web-words.ts` 时，先运行 `ops/release/check_r57_word_db_ready.sh` 的只读检查。
- 必须四表同时存在、全部 FORCE RLS、tenant_boundary 策略存在、`accentclass` 具备 SELECT/INSERT/UPDATE，才允许构建和切换。
- 数据库未就绪时记录 `AUTO_DEPLOY=SKIP reason=r57_word_database_not_ready`，保持旧站在线。
- 单词录音幂等编号绑定单词题目；同一编号用于另一单词返回 409，避免错配成绩。
