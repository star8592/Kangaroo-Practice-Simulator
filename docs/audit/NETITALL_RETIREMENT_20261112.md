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

旧独立业务的源文件、运行记录或可能的游戏用户数据，只能在服务确实停止、无其它引用、受限备份完成且可恢复之后清理。**任何游戏数据都不写入英语/数学/微信身份/计费数据库。**

PostgreSQL 18 统一实例的 Issue #306 与账号身份降权的 Issue #308 均是独立任务，不能因为移除游戏就擅自对它们执行生产迁移。
