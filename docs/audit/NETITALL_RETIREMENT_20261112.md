# SOC THINK 正式退役 NetItAll 游戏模块（2026-11-12）

## 业务边界

用户明确要求 `socthink.cn` 只做教育，不继续维护独立游戏 `NetItAll`。游戏不属于英语发音、词汇、阅读、AelOS、数学、微信登录或统一计费服务。

## 已执行的生产变更

- 正式 Nginx HTTPS vhost 去掉 `include /etc/nginx/snippets/netitall.conf;`。
- 保留两条精确路径清退规则，避免旧缓存/搜索链接意外落到教育 SPA：`location = /NetItAll { return 410; }`、`location ^~ /NetItAll/ { return 410; }`。HTTP 410 表示正式下线，不是“后台短暂不可用”。
- `netitall-mp.service`（Rust 对战）和 `netitall-admin.service`（Node 管理）已 `systemctl disable --now`，并校验 3001、3002、3003 均未监听。
- UFW 已先行设为 IPv4/IPv6 `3001/tcp DENY IN`；保留拒绝以防旧服务被误启动。
- 旧 Nginx、两份 service unit 已在服务器 root 专属审计目录 `/var/backups/socthink-site-audit-20261112` 备份。
- 现场验收：`/`、`/login`、四项英语正式应用及少儿阅读均 HTTP 200，旧游戏路径、资源路径、WebSocket 和管理接口均 HTTP 410；Nginx 配置测试通过。

## 后续发布约束

`scripts/check_cohost_gateway.py` 不再要求独立游戏的 Nginx include 与 WebSocket HTTP 101；相反，默认检查教育相关 Nginx includes 不丢失，旧游戏配置没有重新激活，旧游戏链接必须继续返回 HTTP 410。回归测试纳入已有站点架构检查，不新增发布硬门槛。

**旧游戏程序目录已经清理**，有完整 root-only 备份。已先确认服务停用、端口无监听及旧路径 410，并将全部 `/opt/netitall` 目录（原约 553MB，包括 47 个历史 release、共享数据与配置）打包到：

`/var/backups/socthink-site-audit-20261112/netitall-retired-full-20261112.tar.gz`

- 压缩档大小 **414,342,254 字节**，文件为 `root:root 0600`。
- `gzip -t` 成功、`tar -t` 可遍历 **4,317** 项，管理端和旧发布目录记录可见；`shared/netitall.env` 在源目录与压缩包内的 SHA256 一致。
- 完整压缩档 SHA256：`5b264371d6c32ebe930266ef116b0328d043d4cbf51590ee2cd66763d38303a5`。
- 复制了独立 Nginx snippet、两份 systemd unit 及网络隔离 drop-in 到同一 root 私有审计目录。
- 在备份验证成功之后，移动旧树到待删除目录，复测 7 个教育入口 HTTP200 和游戏旧地址 HTTP410，然后删除原 553MB 程序树；删除了不再启用的 NetItAll unit 和 Nginx snippet；`systemctl daemon-reload`、`nginx -t` 均通过。
- **没有删除归档**；全站微信、英语、数学、支付与 PostgreSQL 服务没有改变。

旧游戏有可能涉及的用户数据只能存在于独立归档中，**不得导入教育站身份/计费数据库**。

PostgreSQL 18 统一实例的 Issue #306 与账号身份降权的 Issue #308 均是独立任务，不能因为移除游戏就擅自对它们执行生产迁移。
