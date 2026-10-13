# 小学一、二年级赛事完整读题音频：发布与验收规约

## 范围
所有当前 **training-ready** 的 Grade 1–2、Pre-A 等考试，不区分主办机构。中文/英文只有真实存在的题干和选项才提供对应朗读；图片选项只提示查看选项图片，不编造图形描述；不得朗读正确答案、解析。题目/选项原始信息不完整时先修题库。

已盘点：24 套试卷、380 道题、584 条去重音轨（中文 341、英文 243）。另外 63 题样题库尚未开放训练，应由题库团队单独完成上线审核，不得纳入已上线统计。

## 本地准备

在当前 Git 代码工作树内，确保所需 `private/exams/` 与生产一致（本文件以及生成器不会将题库提交至 Git）。

```bash
npx tsx scripts/prepare_exam_readaloud.ts
npm run test:exam-readaloud
/mnt/disk1/H3_Studio/IndexTTS2/.venv/bin/python scripts/render_exam_readaloud.py --backend index
python3 scripts/audit_exam_readaloud_assets.py --strict
```

`prepare` 只负责按题干/选项内容构建带 SHA-256 的音轨清单；`render` 调用本地 IndexTTS2.5，失败可重启续跑，已验证 MP3 跳过。`audit --strict` 必须检查 584/584 是否完整且 ffprobe 可解码。不可用 `--limit` 生成的试听音轨冒充全量发布。

## 发布顺序

1. 审查并合并本功能 PR、在原有 CI 与自动部署流程中通过 Web/小程序构建、验收站点不回退旧功能。
2. 对与生产题库对应的本地工作区完成 **全部 584 条** MP3，并执行严格音频审计。
3. 先执行 `DRY_RUN=1 bash ops/release/publish_exam_readaloud_assets.sh` 预检；生产代码尚未带资源链接时，执行 `DRY_RUN=0 DEFER_PUBLIC_PROBE=1 REMOTE_HOST=root@<production-ip> bash ops/release/publish_exam_readaloud_assets.sh`，经免密 SSH 上传音频包，服务器端逐条比对 SHA-256 并切换持久化资源；此结果仅为资源预发布，不能视为公网验收。代码切换后必须单独完成公网文件校验。
4. 检查 `https://socthink.cn/exam-read-aloud/v1/<sha>.mp3` 与本地 SHA-256 一致，以及微信小程序的正式下载域名配置。
5. 登录一、二年级真实考试，分别验证中文、英文（如果存在）、全选项、播放、暂停、进度拖动、重播、切题自动停止，iPad Safari、安卓浏览器与微信真机都通过才算封版。

## 部署约束

- **绝不能**将本地的未完成音轨清单、私有试卷或音色示例直接提交至 GitHub。
- 本项目有不可变 Web runtime；音频文件位于服务器 `/opt/socthink-math/public/exam-read-aloud/`，运行时 `public/exam-read-aloud` 映射到该持久化目录。自动发布与预构建发布脚本均维持此映射。
- 音频资源独立发布脚本以 `DRY_RUN=1` 为默认，不会在资源不全时实施发布。
- 功能分支构建通过不等于线上可用。用户验收需要公网下载响应和微信/iPad 真机播放证据。
