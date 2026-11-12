# SOC THINK 全站代码、目录、服务与发布卫生审计（2026-11-12）

> 范围：`socthink.cn` 主站及同机直接影响其运行的基础设施；合并考虑独立英语四应用、儿童阅读、统一微信身份、计费、数学、Nginx、PostgreSQL、发布与备份。其它同机独立品牌（`lic.toktik.tech`、NetItAll 等）只做共宿主影响盘点，**不擅自移动、停止或删改**。
>
> 方法：生产机只读目录/运行进程/配置与公网 HTTP 状态检查、仓库静态检索、测试隔离执行、数据备份及 SHA-256 抽样。不是逐行人工读完所有 1,963 个跟踪文件；凡未取得运行证据的条目标为待核查。

## A. 当前实测规模

- 正式主站代码源：`/opt/socthink-math`，Git 版本 `5dde60a`（2026-11-12 16:09 CST）；主站运行 `/opt/socthink-releases/current` → SHA 目录，`socthink-math.service`。
- 当前代码含约 **1,963 个受 Git 跟踪文件**、**161 个 Next `page.tsx/route.ts`**，`src/app` 有 29 个顶层子目录；`scripts/` 约 **362 个物理文件**、`ops/` 86 个、`tests/` 43 个。`src/app/api` 约 75 条文件路由。原仓库 `public/` 约 818 MiB，`public/local-assets/` 约 637 MiB。
- 同机主站代码、独立英语服务、英语静态发布、儿童预览/正式版及商业工具分布在 `/opt`、`/var/www`、`/srv`；所有路径先做用途映射，不直接清理运行依赖。
- Z890 `/home/master/projects` 一级目录查到 **489 个项目/工作区目录**；大量 `vocab-r*、accentlab-v*` 为版本 worktree。它们不是 Git 数据库“重复项目”证据，需要按 branch/worktree/远端 commit/最近使用时间归档，不直接删除。
- 主站两个正式 PG 实例并存：PG16.15 主实例 5432（含 `accent_lab`、`aelos`、`english_leap_accounts`、`socthink_billing_prod`、两个交付库等），Vocabulary PG18.6 独立 5433（`vocab_classroom`），详细统一任务见 Issue #306 与 PR #305。

## B. 模块/代码/运行目录职责清单

| 模块 | 唯一正式入口或职责 | 当前主要路径/服务 | 判断 |
| --- | --- | --- | --- |
| SOC THINK 门户和数学/竞赛/工具入口 | `/`、`/math`、`/competitions`、`/arithmetic`、`/assessment-center` 等 | `src/app` → `/opt/socthink-releases/current`；`socthink-math.service` | 共享壳合理，但模块边界与脚本分类过散 |
| 微信统一身份 | `/login`、`/api/auth/parent/me` | `src/lib/parent-auth.ts`、`src/lib/user-data-store.ts`；`private/users` | 统一认证 API 已有，账号权威仍为 JSON，不是 PG |
| 全站计费 | 微信支付、订单、退款、权益 | Next 服务 + `socthink_billing_prod` | 保留唯一账本；不要让子应用再建独立支付 |
| AccentLab 发音 | `/english/pronunciation/app/` | `/var/www/socthink-english-public/current/english/pronunciation/app`；`socthink-accent-api.service` | 源码独立，正式页面统一域名；E3 作业后端仍未公开 |
| Vocabulary 背单词 | `/english/vocabulary/app/` | 相同静态发布树 + `socthink-vocab-api.service` + PG18 5433 | 需迁入单一 PG18 集群 |
| English Leap 阅读 | `/english/reading/app/` | 相同静态发布树 | 静态页面 200；独立数据接口仍需逐路由验收 |
| AelOS 综合英语 | `/english/aelos/app/` | 相同静态发布树 + `socthink-aelos-api.service` + PG16 `aelos` | 服务独立且在运行；数据库版本待统一 |
| 少儿正式阅读 | `/english/reading/kids/` | `/var/www/socthink-kids-formal/current` | 单独 release/current 合理，应入统一发布清单 |
| 少儿 AelOS 预览 | `/english/aelos/kids-preview/` | `/var/www/socthink-kids-preview/current` | 预览明确隔离，发布标签及路由仍需统一 |
| 课堂扩展 | `/classroom-live/`、`/classroom-api/` 等 | `/opt/zoryvia-classroom`；Nginx 多个 snippets | 跨服务边界复杂；不得与 Zoria Control 产品混同 |
| StoryForge 课堂故事 | `/story-studio/` | `/opt/storyforge-studio`，Nginx 独立反代 | 同机但独立进程，应列入宿主风险清单 |
| CommerceFlow 交付 | `lic.toktik.tech` | `/opt/commerceflow-delivery`、`/srv/commerceflow-delivery` | **另一业务域名**；不合并到 SOC THINK 目录 |
| SEO、备份与发布 | `scripts/seo_monitor_daily.mjs`、`ops/{automation,backup,release}` | systemd/timers、`/var/backups`、immutable releases | 已有自动发布和备份基础，但审计/证书/账号权限有缺口 |

Nginx `/etc/nginx/sites-enabled/socthink.cn` 通过 snippets 组织英语、儿童、课堂、StoryForge 路由，语法检查通过。HTTPS 主站、登录及四款英语正式前端抽样 HTTP 200；未登录 `/api/auth/parent/me` 为 401；`/.env`、`/private/users/parents.json` 等抽样请求为 404（本地宽权限**不等于**已证实公网泄露）。

## C. 问题清单（按风险，而非视觉美观排序）

| 级别 | 问题与证据 | 最小修复策略 / 验收 |
| --- | --- | --- |
| **P0** | SOCTHINK SSL 证书原到期日 **2026-11-26**；Certbot 续签原先报 ACME 404。当前 Certbot 配置使用 `/var/www/html` webroot；Nginx HTTP 先全站跳转 HTTPS，Next 不能提供挑战文件 | 已为 HTTP-01 添加精确 Nginx 路由，`nginx -t`、HTTP200 实测通过、Certbot staging `--dry-run` 成功；**必须单独查证生产新证书 notAfter 和定时续签**。原配置备份在 `/var/backups/socthink-site-audit-20261112`，不可因为改动已发布就虚报续签完成 |
| **P0** | 主站 `socthink-math.service` 实际进程为 **root**，`PrivateTmp/ProtectHome/ProtectSystem/NoNewPrivileges` 未启用 | 先列出私有目录与执行任务依赖；建立受限 OS 用户、共享目录访问表，再做 canary 启动与回滚。不能直接 `User=www-data` 使支付与用户文件损坏 |
| **P1** | 主站 `parents.json`、`users.json`、`wechat-qr-login.json` 原为 `0644`；原 `atomicWriteJson` 默认权限且用固定 `.tmp` | 三个生产敏感文件已现场收紧为 `0600` 且 SHA 未变。审计分支修复原子写入为独占 `0600` 随机临时文件，并有独立测试。生产运行代码仍需发布后防回归验证 |
| **P1** | `readJsonArray` 原逻辑把任何 JSON 损坏静默变为 `[]`，登录/注册写入可能覆盖原用户；`scripts/test_parent_auth.ts` 原直接移动生产工作树内账号文件 | 审计分支增加持久身份记录严格解析，改造测试只访问 `mkdtemp` 沙箱；Z890 两项认证/权限测试通过，**尚未上线** |
| **P1** | SEO 巡检本身正常执行，但 72 个 sitemap URL 仅 60 个通过；12 个页面 `NO_H1`，导致巡检服务 exit 2 | 修复各页面真实语义 H1，不关闭或放宽巡检门槛；重跑 72 页核查，应回到 72/72 |
| **P1** | `socthink.cn` 与 `www.socthink.cn` 查到不同的 A 地址；当前主站证书 SAN 仅 `socthink.cn` | 核验 www 是否有独立 HTTPS 入口及域名策略，再决定规范跳转与证书范围。不可直接加 www 到现有证书而不检查 DNS |
| **P1** | 主站运行 SHA 发布目录中残留无效/不可识别 `.git` worktree 指针；源仓 `auto_deploy_server.sh` 在构建后会 `git worktree remove/prune` | 产物目录不应带失效 `.git`；移除对运行版 worktree metadata 的依赖，发布单独固化 `SOURCE_COMMIT`、构建清单和 SHA256；先修发布脚本，不能手工 `git worktree prune` 影响自动发布 |
| **P1** | 端口 `3001` 监听 `0.0.0.0`，进程名 `seaboart-mp-ser`，不像其余应用仅 loopback | 与 NetItAll 服务所有者核实设计及防火墙/认证是否限制外部访问；未验证公网可达，不应直接判定已暴露 |
| **P2** | `scripts/` 300+ 混合验收、采集、导入、临时实验、修复工具；`src/app` 29 个顶层子域，部分逻辑跨 `src/lib`、`apps`、`backend` | 按业务域与工作流建立索引，迁移时保留旧 CLI 兼容入口，更新 package scripts、CI、systemd 和 docs 后删除旧位置 |
| **P2** | `/opt/socthink-source-releases` 约 1.5GiB，`/opt/socthink-releases` 约 483MiB，`/opt/retired` 约 499MiB；客户端另有多个 preview/release | 按当前、上一已验收可回退版、带证据历史版、废弃候选分类，经过引用检查与备份后限额归档。当前空闲约 33GiB，**无需冒险立即批量删除** |
| **P2** | `public/local-assets` 约 637MiB；场景音频常见同名 | 已 SHA256 实测 `scene-0*.mp3` **654 文件=654 独立 hash**，内容不重复；不可单凭文件名删除 |

## D. 长期标准目录（设计目标，**不是声称已迁移**）

```text
/opt/socthink/
  source/                 # 唯一可写正式代码工作树（或 Git 管理的构建源）
  releases/<commit>/      # 不可变运行产物：无真实凭据、无 .git/worktree 指针
  current -> releases/... # 原子切换，保留已验收 rollback
  apps/                   # 可独立部署的应用服务，按模块 release/current
/var/www/socthink/
  releases/<release>/     # 静态资源唯一发布版本
  current -> releases/...
  preview/                # 明确隔离且不可冒充正式版
/var/lib/socthink/
  identity/               # 身份数据（未来优先迁入统一 PostgreSQL）
  pronunciation/          # 受鉴权音频存储
  others/                 # 业务运行数据，与不可变代码分开
/var/backups/socthink/    # 加密、限权、带恢复回执
/var/log/socthink/        # 结构化日志与审计，不混入源码
/etc/nginx/snippets/      # 网关按产品/能力最小 include
/etc/systemd/system/      # 仅受授权的系统运维管理
```

代码层建议分为 `apps/portal`、`apps/english/*`（独立仓库时保留 repo 边界）、`domains/auth`、`domains/billing`、`domains/math`、`domains/assessment`、`packages/ui`、`packages/contracts`、`ops/{deploy,backup,monitoring,nginx,audit}`；但不是在当前仓库上一次性大挪移。正式唯一微信 `/login`、计费中心、英语四应用浏览器 URL **不变**。

## E. 真正清理的顺序与自动验收

1. **当天**：确认 Certbot 正式续签证书新有效期、处理 root 主站及账号权限、避免任何测试对生产用户库进行写操作。原站静态资源/评分必须保留可用。
2. **第二批**：运行单个模块入口清单：对站点 sitemap、导航、四英语 APP、儿童正式/预览、相关 API 做 200/401/403/404 的预期断言；12 个 NO_H1 逐页修复；自动收集历史死链/重复导航。
3. **第三批**：为生产每个模块建立 `source_repo / release_sha / live_url / backend_service / database / private_storage / rollback` 的唯一注册表，发布系统从注册表取路径、禁止旧站复活。
4. **第四批**：清理源码脚本分类、重复工作树和过期 release。**先出待归档清单和 ref 依赖，再保留回滚锚点和备份后归档，不做 `rm -rf` 批量清空**。
5. **平台级**：按独立 Issue #306 实现正式 PostgreSQL 18.6 单实例及统一身份、计费；目录审计不能绕过系统权限或替代数据迁移验收。

验收输出必须包含：文件/服务来源和 commit、生产前后 SHA/hash、主站 HTTP 链路、数据库连接/备份证据、权限边界与回滚命令。未做到这一套，不宣称“全站已经整理干净”。

## F. 本轮已做的变更与限制

- 生产 Nginx ACME 路径最小修复、配置备份、语法检查、HTTP200 回显，Certbot 模拟续签成功；正式续签的最终回执仍需持续核实。
- 生产三个 root 所有的账号状态文件权限 `0644→0600`，内容 SHA 不变；代码更新尚未发布。
- 审计分支完成安全原子写入 + 身份损坏 fail-closed + 家长测试全沙箱化，Z890 运行 `test_user_data_store_permissions.ts` 与 `test_parent_auth.ts` 均通过。
- 未删除任何数据库、教学音频、旧 release 或其它业务目录；未关闭当前在线服务。DB 18.6 实际切换由 Issue #306 单线推进。

归属：`star8592/Kangaroo-Practice-Simulator` 审计分支 `audit/whole-site-layout-security-20261112`。此文为**审计与治理基线**，不是部署完成声明。
