# 云端 → 本地开发主机：加密异机备份复制（2026-10-10）

## 运行架构

生产云端 socthink.cn 每天自行制作 GPG AES256 加密归档，并通过实际解密、结构化 JSON/JSONL 校验后写入 hash 与成功回执。独立的本地主机（大容量数据盘）使用系统用户 master 的 systemd 用户定时器主动通过 SSH **只读拉取**三份文件：密文归档、SHA256、来源恢复回执。

- 云端数据目录：/var/backups/socthink-math（root0700）。
- 异机目标：/mnt/disk1/master_data/secure/socthink-backups（master0700，独立 15 TB 数据盘）。
- 本地主机每日约 05:10（本机时区）拉取，随机延迟最多 15 分钟，Persistent=true；云端加密备份计划 03:40（云端时区），错过后按 systemd 机制补跑。
- 严格 SSH host key 检查（不能跳过已知主机验证），BatchMode，明确远端 root@socthink.cn，绕过本地主机当前不安全的系统 SSH 配置以复用已验证用户 SSH 身份。
- rsync 限速 16 MiB/s，采用隔离暂存目录；下载后必须核实归档 hash、来源 receipt、文件大小及恢复通过声明；**最后写入 receipt 作为本机副本提交标记**。源端访问失败或本机已有副本损坏时不会伪造 PASS。
- 不传输 GPG 口令，也不传输未加密的学生数据；脚本不向生产主机写入任何文件。异机定时服务以用户身份运行，未请求 root 权限。

## 第一次部署及验证

在本地机器的**干净、精确 main SHA** 工作区，执行：

    bash ops/backup/install_offsite_pull.sh
    systemctl --user status socthink-offsite-backup-pull.timer --no-pager
    systemctl --user status socthink-offsite-backup-pull.service --no-pager
    journalctl --user -u socthink-offsite-backup-pull.service -n 25 --no-pager
    python3 ~/.local/share/socthink-backup/bin/check_offsite_health.py /mnt/disk1/master_data/secure/socthink-backups

安装器把已经 GitHub CI 核验的 pull/校验器复制到 ~/.local/share/socthink-backup/bin，并安装用户 systemd 单元。master 用户已经配置 systemd linger=yes，以支持无人登录时的周期调度。

备份状态判断以**真实文件和 systemd 执行回执**为准，而不是以“脚本已上传 GitHub”或“timer enabled”推断。

## 安全与剩余限制

1. **加密口令仍只存在生产端**；这里完成的是异机 **密文复制 + 回读完整性**，不是已经能在云端彻底损毁后独立解密的灾备。必须单独安排安全离线密钥托管，经过授权的跨机恢复演练后才能认证 RTO/RPO。
2. 当前借用已经配置好的 root SSH 管理通道，后续应替换成权限最小化、只能读取 .gpg/.sha256/.receipt.json 的备份专用账号/受限 SSH key，并与开发运维账号分离。
3. 未启用自动删除本机副本。应在验证密钥恢复、保留周期与盘满告警后，再逐步加入备份分代及可追溯删除策略。
4. 双机都需要监控磁盘余量、备份最新时间和服务日志；本地 host 断网时 timer 能补跑，但没有完成异机告警送达机制。
5. 云端主服务发布不会自动证明本地主机 pull service 已经运行；必须分别查看各自回执和时序日志。

## 软件工程测试门禁

scripts/test_offsite_replica.py 使用人工生成的密文模拟素材，检查 SHA256、截断/篡改、错误回执、符号链接、禁止绕过 SSH host 验证和本地副本状态；加入 npm run verify:public 与工程控制的变异回归。真实 600MB 级 SSH 传输只在 PR CI、main CI 通过并安装到授权机器后执行，避免未经验证代码直接访问生产数据。
