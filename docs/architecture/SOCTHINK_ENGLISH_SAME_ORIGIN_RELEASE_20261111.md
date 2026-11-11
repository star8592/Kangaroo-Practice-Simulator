# SOC THINK 英语四应用同域发布规约（2026-11-11）

## 唯一正式对外入口

公开唯一业务域名为 https://socthink.cn。四个产品介绍页仍使用 `/english/{id}`，实际 Web 应用使用 `/english/{id}/app/`，各自 API 位于 `/english/{id}/api/`。不得把主站产品页的“开始学习”按钮指向旧 `toktik.tech` 地址。原站不删除，保持迁移/回滚期间可以独立运行；后续**新版本一律发布到主站服务器**，旧站不再是首发目的地。

| id | 新版 Web 入口 | 后端 |
| --- | --- | --- |
| pronunciation | /english/pronunciation/app/ | 本机 127.0.0.1:3121 |
| vocabulary | /english/vocabulary/app/ | 本机 127.0.0.1:39284，独立 PG18 |
| reading | /english/reading/app/ | 本机现有轻量服务 3121，部分接口未完成 |
| aelos | /english/aelos/app/ | 本机 127.0.0.1:23302 |

## 2026-11-11 20:51（UTC+8）已验收事实

- 主站生产服务器 `8.166.137.232` 已有 `/opt/socthink-english/{accent,vocabulary,reading,aelos}` 的独立发布目录，三个英语服务的 systemd 进程运行。
- 同域公网四个 `/english/{id}/app/` 的 HTML 和入口 JS 均实测 HTTP 200；`/english/reading/api/v1/lessons` 返回 HTTP 200，`/english/aelos/api/health` 返回健康 JSON。
- 应用静态资源暂从已部署在这台主机上的候选构建复制并做路径重基，正式路径在 `/var/www/socthink-english-public/current`，该目录指向不可变 `releases/r20261111T204922`；Nginx 片段 `/etc/nginx/snippets/socthink-english-live.conf`，仅在 SOC THINK 的 HTTPS server 中包含。
- **尚未验收**：四个产品完整账号/学习记录迁移、跨产品 SSO 和统一收费、真实学生麦克风/手机端到端。阅读服务 `/api/v1/books`、`/api/v1/accents`、`/api/v1/speech/parallel` 尚返回 404，阅读目前仅是有限体验，禁止作为成熟付费课程宣传。
- 旧独立站继续保留为回退，不因同域页面可访问就删除其数据/音频、停机或宣称商业完工。

## 以后每次发版

1. 每个产品保留独立 GitHub 仓库，从**当前稳定主线源码**构建，而不是重用、覆盖旧站的压缩 JS；Vite `base`、路由 history basename、API 前缀、音频和 Service Worker scope 都使用各自的正式 `/english/{id}/app/` 或 API 地址。
2. 主站服务器上用 `sudo bash ops/release/publish_english_app.sh <pronunciation|vocabulary|reading|aelos> <已构建的dist目录> <源码提交SHA>` 发布：脚本只替换指定产品，复制另外三个产品的上一版本到不可变快照，原子切换 `current`，公网首页探针失败自动回退；轻量 API 和数据库保持各自服务/专用角色，不合库。只通过本机回环代理暴露 API，不再为新版本新增公网业务域名。该脚本已经使用独立 `/tmp` 根目录验收文件与发布切换，尚未用真实新版产品产物进行生产发版。
3. 验证首页、JS/CSS、SPA 深链、API、录音权限、登录与作业/阅读核心操作；失败保持旧版本，发布成功后原子切换 `current` 链接，保留上一版本可回退。**不要增加无必要的多重发布门禁**。
4. 主站 Next.js 的四个按钮必须始终指向上述本域路径，中央收费账本独立于英语应用。未验收的账号融合、收费权益不要挂成已完成。
5. Nginx 配置备份必须存放在 `sites-enabled` **外部**，防止被 glob 加载为重复的 `server_name`。修改后 `nginx -t`、reload、同域 HTTP/静态资源验收；生产配置独立片段，避免覆盖支付及其他产品路由。

## 回退

主站入口的 PR 与英语运行文件各自可独立回退。Nginx 若失败，可删除主站中引入的 `socthink-english-live.conf` include，并恢复 `/root/socthink-nginx-backups/` 中本次原始文件，然后 `nginx -t` 后重载。回退只影响本域路径，不自动改变其他系统和原独立站。数据/账号切换在验证前保持关闭。
