# SEAMO 原创基础训练双语读题 R1 — 增量发布回执

- 日期：2026-10-21（中国时间）
- 赛事：SEAMO 一年级、二年级**本站原创基础训练修订版**（不是官方真题）
- 正式域名：`https://socthink.cn`（不带 `www`）
- 生成引擎：Z890 上的 IndexTTS 2.5 本地服务，复用已加载 GPU 进程，不终止其他任务。

## 可独立复核的执行证据

| 门禁 | 结果 |
| --- | --- |
| 修订卷题目 | 一年级 15 道 + 二年级 25 道 = 40 道 |
| 朗读内容 | 中英文**题干与选项**，40 条中文 + 40 条英文 |
| 音频生成 | 新生成 78 条，复用前期缓存 2 条，失败 0 |
| 本地 MP3 严格审计 | 80/80 文件真实存在，`ffprobe` 可解码，缺失 0、无效 0、英语缺失 0 |
| 增量发布包 | 6,284,153 字节，SHA-256 `327e125c6061b179205545e89a883e7ff51b0b0d4730b59fc26c10f8dcecebcf` |
| 发布算法自测 | dry-run 不写入，80 文件增量，重复发布幂等，原有文件哈希保留，冲突拒绝 |
| 生产发布前文件 | 584 条其他考试 MP3 |
| 生产增量安装 | `SEAMO_AUDIO_ADD=PASS legacy_preserved=584 tracks=80 added=80` |
| 生产发布后文件 | 664 条 MP3，原 584 条哈希全部一致 |
| Nginx 静态访问 | 校验 `nginx -t` 通过、热重载成功；共享持久音频目录 `alias /opt/socthink-math/public/exam-read-aloud/v1/` |
| 公网 HTTP 验收 | `SEAMO_PUBLIC_AUDIO=PASS total=80 zh=40 en=40 checksum=80/80 mime=audio/mpeg` |

## 运维和保留策略

- 生产音轨放在持久化目录 `/opt/socthink-math/public/exam-read-aloud/v1`，不可变 Web 发行版通过 `/opt/socthink-releases/current/public/exam-read-aloud` 符号链接引用；常规代码发布不会移除音频。
- Nginx `location ^~ /exam-read-aloud/v1/` 专门提供静态 MP3，配合长缓存与内容寻址文件名。Nginx 变更前已经建立带时间戳的配置备份，并已完成配置校验。
- 使用 `scripts/seamo_audio_additive_release.py` 实施逐文件校验和增量放入；**禁止使用旧的 `ops/release/publish_exam_readaloud_assets.sh` 发布 SEAMO 子集**，后者会替换整个音频目录，影响其他赛事。
- 每次变更后用 `scripts/audit_seamo_audio_public.py --base https://socthink.cn` 对 80 条音轨逐一做 HTTPS 下载、MIME 与哈希比对。
- 本回执只说明已验证音频文件可以公网访问，不等于已经对所有中文数字、英文读法进行了**人工听审**。

## 后续仍需完成的交付

- 微信小程序原生答题仍需新版客户端真机验收、上传、微信审核和正式发布回执；代码和音频准备就绪**不等于微信已上线**。
- 学生作答后的“朗读正确答案与题解”需单独验收，本次完成的是**题干和选项朗读**，不可混淆。
- `www.socthink.cn` 的路由与主域名不一致，尚未通过验收。对用户公开的链接统一使用 `https://socthink.cn`。

**发布结论：SEAMO Web 双语题目朗读文件及公网交付 PASS；微信小程序正式发布与全量人工听审尚未封板。**
