# SOC THINK PostgreSQL 18.6 全站统一总纲与实机验收（2026-11-12）

## 决策
最终全站只运行**一套正式 PostgreSQL 18.6 主集群（5432）**。身份、会话、微信登录和计费各只有一个权威服务；AccentLab、Vocabulary、AelOS、English Leap、数学及商业工具保留独立业务数据库/Schema、最小权限与独立代码。**统一数据库软件实例不等于共用一张表，也不是重新做微信登录或支付。**

官方截至当前的最新稳定小版本为 **18.6**（2026-08-13）；18.5 未发布。https://www.postgresql.org/support/versioning/

## 生产实机发现

- 主站 `8.166.137.232` 有两套**同时运行**的实例：PG **16.15** 主集群（端口 **5432**，系统管理），以及背单词专属 PG **18.6**（端口 **5433**，`socthink-vocab-postgres18.service`；程序来自 `/opt/vocab/pg18-native/root`，数据在 `/var/lib/vocab/pg18/main`）。
- PG16 有 7 个数据库：`accent_lab`、`aelos`、`commerceflow_delivery`、`commerceflow_delivery_canary`、`english_leap_accounts`、`postgres`、`socthink_billing_prod`。PG18 有 `postgres` 与 `vocab_classroom`。
- PG16 的 `accent_lab` / `aelos` 使用 pgcrypto 1.3；现有 PG18.6 可使用 pgcrypto 1.4；默认 collate 都是 `en_US.UTF-8`。主站剩余磁盘当时约 34 GiB。
- 当前主站 `src/lib/parent-auth.ts` 的家长微信主账号**不在 PostgreSQL**，而是由 `user-data-store.ts` 保存在 `private/users/parents.json`。该文件当时 1 条账号记录；`par_...` 是当前会话/订单/英语身份桥的稳定 ID。签名密钥在独立受保护文件中，任何报告不得输出内容。
- `english_leap_accounts` 内存在 `english_leap.users`、`auth_identities`、`auth_sessions`、`learner_profiles`（UUID），目前**不是**全站 `par_...` 登录权威；`socthink_billing_prod` 已有订单/支付/权益/用量账本，`payer_parent_id` 为 text。必须做主用户 ID 映射，不能擅自把 UUID 替换成 `par_...` 或变更既有账单主键。
- 敏感文件权限待整改：生产 `parents.json` 元数据是 `0644`、目录 `0775`；现有 `atomicWriteJson` 用默认文件创建权限，单次 chmod 以后写入还可能重新变宽。需以原进程 UID/服务读写测试为依据修复代码和权限，不得泄漏数据或打断 OAuth。

## 本轮实际完成的兼容验证（不得冒充正式升级）

1. 用已有 PostgreSQL 18.6 的新版本 `pg_dumpall --globals-only` 与 `pg_dump -Fc` 生成 PG16 全部 7 库 + 全局角色、PG18 `vocab_classroom` + 全局角色的时间点备份，保存在主站 `/var/backups/socthink-pg18-consolidation-20261112`（私有目录 0700，文件 0600）。各数据库归档全部通过 `pg_restore --list` 读取验证；上线前还须最终停写快照/增量差异对齐及加密异地备份。
2. 在现役 PG18.6 创建隔离测试库，实际恢复 PG16 的 `accent_lab`（22 表）、`aelos`（51 表）、`commerceflow_delivery`（7 表）、`commerceflow_delivery_canary`（7 表）、`english_leap_accounts`（13 表）、`socthink_billing_prod`（13 表），全部 `pg_restore --exit-on-error` 成功，测试库随后全部删除；主站业务端口及数据未切换。
3. 发音作业的 `accent_lab` 数据库于之前 E4 已在 PG16 初始化，22/22 表 FORCE RLS、应用角色非管理员；最终统一仍需保持原租户权限。
4. 没有停止或升级任何现有数据库进程，也没有改主站正式 `5432`。

## 最终架构和迁移顺序

**统一实例**：正式受支持的 PG18.6 系统包/服务，最终端口固定 5432。原 PG16 与背单词独立 PG18 双实例都应在核验后退役。不要直接把目前词汇项目使用的解包式 PG18 目录当全站正式包管理机制。

**统一身份权威**：建议 `socthink_identity` 独立数据库或 `identity` Schema，按 `par_...` 维护稳定用户主 ID；完整保存微信绑定、会话版本、状态、同意凭证，内部可使用 UUID，但建立唯一映射。老师角色与班级权限仍须显式授权。原 `/login` 与 `/api/auth/parent/me` 契约、HttpOnly Cookie 名和会话续期保持兼容，所有英语与数学应用只调用统一登录服务。

**统一计费权威**：保留并升级现有 `socthink_billing_prod`，原订单号、`payer_parent_id`、支付事件、退款、权益和用量历史全部保留；各应用只调用唯一计费服务检查权益，不复制微信支付凭据或建立第二本账。

**业务隔离**：`accent_lab`、`aelos`、`vocab_classroom`、数学与交付服务各用自己数据库/Schema/受限角色，共用稳定身份 ID；跨数据库权限通过可信 API，不给每个业务共享 PG 超级用户。录音放私有音频存储，PG 仅保存元数据。

**按顺序执行**：
1. 全量审计各集群数据库/扩展/角色/排序规则、应用连接路径与备份恢复；确认实际运行账号和数据库读写活动。
2. 经批准的系统运维通道安装可管理的 PG18.6 正式包，准备新独立 PG18 数据目录与回退锚点；`pg_upgrade --check` 和业务兼容验证。当前 Device Control 的系统边界明确拒绝某些系统用户操作，**不可绕过**。
3. 选择 `pg_upgrade` 迁移原 PG16 主集群，或使用上面已通过的逐库逻辑恢复；再用逻辑恢复迁入原 PG18 `vocab_classroom`。**一次 `pg_upgrade` 不能合并两个现有 PG 集群**。
4. 身份迁移先影子校验：将 `parents.json` 原数据导入新 identity 权威，保持 `par_...`、旧会话签名逻辑、`sessionVersion` 和绑定关系；比对哈希/数量/冲突后短时冻结注册及变更、补差异、原子切换到 PG 单写。不得让微信用户重新注册，也不能同时让 JSON 和 PG 双写发生分叉。
5. 将英语 UUID、教学资料、班级角色与主用户 ID 建立稳定映射；计费继续使用同一 `payer_parent_id`，验证原支付回调、退款、权益和订单幂等。
6. 分应用切换并实测 5432：微信扫码登录、扫码回跳、原家长会话、收费、数学、AelOS、AccentLab 的 V50/真实作业、Vocabulary、阅读、商业交付；验证无越权和同一请求不重复计费/评分。
7. 生产状态收敛：完整数据一致性与回退测试通过后，才停用旧 `socthink-vocab-postgres18` 和 PG16，运行中只保留 PG18.6；旧数据目录保留安全可恢复锚点，定期做加密备份及恢复演练。

**当前准确状态：备份与六库 PG18.6 真实恢复演练已经成功；正式实例合并、主站 5432 升级、统一用户主库迁移、计费及各应用生产切换均尚未完成。**

关联：`star8592/AccentLab/docs/ACCENTLAB_HOMEWORK_E4_PG16_PRODUCTION_READINESS_20261112.md` 和统一微信交接 Issue #300。
