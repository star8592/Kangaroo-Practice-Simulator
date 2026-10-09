# TPM 保护的异机恢复凭证与云端不可用演练

**2026-10-10 · GOV-03/Issue #82 的子阶段（L3）**

## 现状与为什么需要

PR #79 已在云服务器完成 AES256 加密备份，实测还原 13,227 个文件；PR #81 已在另一台主机的 15TB 数据盘验证同一份约 613MB 密文副本与 SHA256 回读。但云服务器若连同 /etc/socthink/backup-passphrase 一起损失，本地主机上的 .gpg 归档原本仍无法独立解密。

本阶段利用 **开发主机 TPM 2.0** 保护一个灾备凭证：`systemd-creds encrypt --with-key=tpm2`。仅从经 host key 验证的 SSH 安全通道读取生产备份口令，经管道直接交给 TPM 进行封装；**不写入本地持久化明文文件、不输出凭证、不进入 Git、日志或聊天**。

TPM 保护的凭证落在本地磁盘 `/mnt/disk1/master_data/secure/socthink-backups/recovery/backup-passphrase.tpm.cred`，父目录 0700、文件 0600。重复运行应逐字节比对生产原口令的 SHA256，不允许密钥已经轮换时静默覆盖原封存内容；TPM 或远端 SSH 不可用时拒绝执行。

## 经测试与部署的执行路径

仅在 PR CI、main CI 和产物身份核验后，通过 `ops/backup/install_offsite_pull.sh` 将两份脚本与独立数据验证器安装至本地主机稳定的 `~/.local/share/socthink-backup/bin`。无需 root 本机权限。

用户级备份定时器 `socthink-offsite-backup-pull.timer` 已独立启用。TPM 封存**仅在明确执行此阶段的操作时运行一次**，不在每天的备份循环里反复读取云端秘密。

1. `bash ~/.local/share/socthink-backup/bin/seal_offsite_recovery_tpm.sh`
2. `bash ~/.local/share/socthink-backup/bin/offsite_restore_drill_tpm.sh`

恢复演练仅使用**本机加密归档和本机 TPM**：先检查来源回执和 SHA256，再通过 TPM 解开口令，GPG 解密归档，解压到 `/dev/shm` 的独立 tmpfs，逐文件检查必要目录及 JSON/JSONL，结束自动删除 tmpfs 明文。恢复脚本没有 SSH/curl/云端依赖，不覆盖正式应用数据。

`scripts/test_tpm_offsite_recovery.py` 使用人工模拟数据重复该真实密码学链路，并故意篡改校验和、放宽口令文件权限测试拒绝。没有 TPM 的 CI 环境只执行静态约束审查，打印 `TPM_REAL_FIXTURE=SKIPPED_NO_TPM`；绝不以此声称已做硬件演练。

## 必须保留的风险

- TPM 保护密钥只与**这台实体主机的 TPM 芯片**绑定。主板/TPM 损坏、重置，或涉及 PCR 的固件变化均可能使凭证无法解密。因此**不能把本步骤代替真正离线、离机的恢复密钥封存**；Issue #82 仍不能完全关闭。
- 它还依赖本地主机的操作系统与用户权限完整性。TPM 并不保证在主机已被恶意软件完全控制时能保护运行中的解密操作。
- 生产密码经 SSH 传输一次，但只存在于授权的安全连接和加密进程内存；与 PR #81 的每日密文拉取（不传密码）是不同流程，必须分别审计。
- 本阶段是隔离**备份数据完整性恢复**，不是学生登录、考试提交、支付全套业务在新服务器重新启动的演练。尚不能为系统提供已认证的 RTO/RPO。
- 生产的多文件 JSON/JSONL 归档为在线 tar 而非事务快照，多文件逻辑一致性仍需数据库/快照改造验证。
- 原云端 SSH 仍使用运维管理身份，后续应隔离最小权限只读备份身份，避免过度授权。

## 证据类型

须分别留存 `TPM_ESCROW=PASS`、`TPM_RECOVERY_DRILL=PASS`、`BACKUP_RESTORED_TREE=PASS` 和零残留 tmpfs 回执。不能把 CI 测试通过、TPM 设备存在、脚本写好当作真实生产恢复已完成。


## 真实运行时授权阻塞（2026-10-10）

同一台 Linux 主机的模拟 TPM 封装/解封测试曾成功，但连续触发时出现了 \`Failed to encrypt: org.varlink.service.PermissionDenied\`。TPM 存在并不意味着当前登录的运维用户拥有稳定的封装授权。**不得**通过 root 绕过本地控制、关闭 TPM 校验、使用 \`--with-key=null\` 或落盘明文口令来伪造成功。正式 TPM 恢复功能须保持为手动显式启用，真实硬件准入命令为：

    SOCTHINK_RUN_TPM_FIXTURE=1 python3 scripts/test_tpm_offsite_recovery.py

若硬件权限不稳定，状态记为 BLOCKED，不得将 TPM 凭证封存称为生产 PASS。CI 仍强制审查脚本、加密类型、脱机恢复、不变更生产数据与关键静态不变量，但 \`TPM_REAL_FIXTURE=NOT_RUN_REQUIRES_EXPLICIT_APPROVAL\` 必须视为真实硬件未验收。生产密钥封存不能在普通 CI 中自动执行。
