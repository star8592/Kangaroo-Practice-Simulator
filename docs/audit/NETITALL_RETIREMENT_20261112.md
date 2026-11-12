# NetItAll 从 SOC THINK 教育主站退役记录（2026-11-12）

## 正式范围

用户明确决定 **socthink.cn 只用于教育业务**，NetItAll 游戏不属于英语、数学、微信身份、支付或教学平台。本站不再维护游戏服务，也不保留其退役备份。

## 实际生产变更与验收

- Nginx HTTPS 站点移除了 `include /etc/nginx/snippets/netitall.conf;`，游戏原路径 `/NetItAll` 及 `/NetItAll/*` 统一返回 **HTTP 410 Gone**，让旧链接从搜索索引逐步退出，避免由教育应用错误承接游戏请求。
- Rust 对战 `netitall-mp.service` 与 Node 管理 `netitall-admin.service` 都已停用、禁止开机自启，最后删除其 unit、专属 drop-in 与 Nginx snippet；3001、3002、3003 不再监听。
- 旧程序、47 个历史 release 以及共享游戏资料所在的 `/opt/netitall` 目录已删除。
- 服务器本机及独立 Z890 公网复测：教育主站首页、统一登录、四个英语应用及少儿阅读 **7/7 HTTP 200**；游戏原页面、WebSocket、管理 API 返回 HTTP 410。Nginx 配置校验通过；SEO 73/73、教育站点地图和首页无游戏入口。PostgreSQL、微信身份和计费服务未改动。
- UFW 保留 `3001/tcp DENY IN` 的 IPv4、IPv6 规则，防止游戏端口意外重新对外放行。

## 游戏专属备份已经永久删除

退役时为保障安全，曾在 root-only 审计目录打包并验证程序全量归档 `netitall-retired-full-20261112.tar.gz`，包含 4,317 个条目。原归档大小 414,342,254 字节、SHA256 为 `5b264371d6c32ebe930266ef116b0328d043d4cbf51590ee2cd66763d38303a5`。备份检查完成、原程序已清理后，用户又明确允许删除游戏备份。

**2026-11-12 已实际删除** `/var/backups/socthink-site-audit-20261112` 内所有 15 个 NetItAll 专属备份（完整压缩包、归档清单、旧游戏 Nginx/systemd/UFW 快照），合计 **414,633,167 字节**。此外清理 `/opt/retired/netitall-admin-index-before-loopback-20260924.mjs`（26,108 字节），共 **16 个游戏备份文件、414,659,275 字节**。删除后再次扫描 `/var/backups`、`/opt/retired` 及 `/opt` 浅层目录，未发现具 NetItAll 名称的文件或目录。同一审计备份目录中其余 **7 个教育站、SEO、证书相关备份完整保留**。

因此，不得再把旧 NetItAll 压缩包称为仍存在的备份，也不能承诺从这台服务器恢复该游戏或其私有数据。GitHub 留存的是历史审计事实，并非游戏可恢复资料。

## 教育站后续发布约束

- `scripts/check_cohost_gateway.py` 只检查教育相关 Nginx 片段和正式 HTTPS 页面，并要求旧游戏路径继续返回 HTTP 410；不能重新添加 NetItAll include 或恢复旧 WebSocket。
- 现有 CI/架构测试的退役约束已由 [PR #311](https://github.com/star8592/Kangaroo-Practice-Simulator/pull/311) 合并，不引入额外正式发布硬门槛。
- PostgreSQL 18 统一和非 root 身份迁移分别仍由 Issues #306、#308 处理；无权修改这些系统的数据权威、支付或备份策略。
