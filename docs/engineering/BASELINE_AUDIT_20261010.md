# 全球数学赛事管家工程基线审计 · 2026-10-10

**审计对象**：origin/main = 045340bf091ea6716abab1617cfba2fc82f757d7；独立工作区，不修改主机当前有其他聊天任务的脏 main。结论按能验证的代码、GitHub 规则和近期生产回执，不将文档声明视为已执行。

## 已有强制控制（Evidence PASS）

| 项目 | 代码或实际来源 | 状态 |
|---|---|---|
| 主分支 4 CI 检查 | GitHub branch protection API，quality、billing-ledger、Web browser click E2E、Miniapp build and API contracts，strict=true | PASS |
| PR 模式 | GitHub branch protection，已定义 PR 必须合并；不能直接把测试分支当 main | PASS |
| 全量公开质量门禁 | ops/automation/quality_gate.sh；lint、TypeScript、考试身份/重复提交、数据契约、Next build | PASS wiring |
| Web 自动发布 | ops/release/auto_deploy_server.sh；main exact SHA、CI GREEN、candidate、回滚、public receipt | PASS wiring / 近期生产成功 |
| GitHub 发布回执 | .github/workflows/production-receipt.yml；检查 deployedSha 与 gitSha 同 SHA | PASS wiring |
| 小程序构建与原生 QA | ops/release/miniapp_ci.sh + scripts/verify_miniapp_qa_receipt.mjs，DevTools+真实安卓设备 SHA 回执 | PASS wiring / 线上原生发布未验证 |
| 竞赛来源信任 | 审核队列不会自动修改 verified-editions；生产已实际运行 3/5 来源采集 | PARTIAL 服务来源健康，不能说 5/5 PASS |

## OPEN 风险与处置

| ID | 级别 | 待办与客观验收 | 现状 |
|---|---|---|---|
| GOV-01 | L3 | 强制代码审阅：branch protection required_approving_review_count 目前 0；有可用 reviewer 后开启至少一次独立批准，不能让一个模型冒充第二人。 | OPEN |
| GOV-02 | L3 | .github/workflows/deploy.yml 仍为人工 workflow_dispatch 的历史源代码 reset --hard、root SSH、密码兜底方案。停止视为标准发布；迁移到单一基于 CI-green SHA 的可回滚执行器，再删除旧分叉。 | OPEN |
| GOV-03 | L3 | 用户及考试数据的定时加密异机备份、备份恢复演练、恢复后认证/成绩完整性验证，没有足够的全链路自动化证据；目前项目内仅见数据晋升前快照。RTO/RPO 为 UNKNOWN。 | OPEN |
| GOV-04 | L2 | 微信小程序线上版本：需要同 SHA 开发者工具与安卓实机证据、微信提交审核及正式发布回执。编译通过不代表发布完成。 | OPEN |
| GOV-05 | L2 | 官网来源巡检部分成功：3/5 源首轮成功，MAA HTTP403、中国数学会 HTTP503；运行时部分成功 exit status 正在独立修复。 | OPEN |
| GOV-06 | L2 | 生产 Web、支付、短信/微信通知的长期可用性与错误预算目前没有完整30日观测基线，DORA五指标尚无自动汇总。 | OPEN |
| GOV-07 | L1 | README 中旧本地 3027/旧路径与当前正式线上 /opt/socthink-math、3000 不一致；统一文档入口并标记历史环境。 | OPEN |
| GOV-08 | L2 | JSON 文件存储在多副本环境下可能竞态，扩展前需 PostgreSQL 事务/唯一约束和数据迁移演练。 | OPEN |

## 本阶段落实

新增统一制度、PR 模板、控制注册表与不可绕过的公开 CI 控制测试（含负向变异）；新增服务器只读发布/健康诊断脚本；对后台与微信交付定义状态证据边界。所有 OPEN 项保留，不能因本文提交即改为 PASS。

## 优先次序

P0：GOV-03 加密数据备份及真实隔离恢复；GOV-02 已由 PR #78 合并整改。
P1：GOV-01 评审机制、GOV-04 小程序发布、GOV-05 来源巡检故障、GOV-06 健康监控。
P2：README 一致性、扩容持久化计划、每两周 DORA 数据评审。

下一次审计不以完成文档判定通过，而以现网实际日志、备份恢复证据、GitHub API 配置与 CI 运行结果闭环。

### 2026-10-10 数据备份实施增量

GOV-03 加入加密全量数据归档、SHA-256、每次独立解包及结构化数据校验、生产日度 systemd timer，详见 docs/engineering/VERIFIED_BACKUP_RESTORE_20261010.md。
本地逻辑与生产实际分开：未看到线上 timer 与首次真数据恢复回执前状态为 IMPLEMENTING；异机副本和跨机器恢复测试仍 OPEN，RPO/RTO 未认证。


### 2026-10-10 异机副本实施进度
GOV-03：本机 AES256 加密+独立隔离解包生产实测已成功（PR #79，13,227 个文件、源数据约 726MB、密文约 612MiB，systemd Exit 0）。异机副本的拉取与 SHA256 独立回读列入下一 PR。复制密文不等于密钥离线托管，也不等于跨机恢复验收，因此 GOV-03 仍 PARTIAL，RTO/RPO 仍 UNKNOWN。


### 2026-10-10 TPM 恢复增量
异机密文归档 PR #81 已于生产和本地主机两侧通过校验；TPM 封存与纯本机的离线解密验收正在按 L3 变更独立实现（docs/engineering/TPM_OFFHOST_RECOVERY_20261010.md）。成功执行后 GOV-03 仍 PARTIAL（TPM 硬件损坏风险、独立离线密钥/新服务器业务完整恢复未演练、RTO/RPO UNKNOWN）。不得只因密文二份及 TPM 凭证存在就关闭 Issue #82。
