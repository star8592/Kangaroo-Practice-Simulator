# SocThink 每日加密备份与真实隔离恢复

**适用**：全球数学赛事管家 Web/微信共用的服务器私有数据。工程整改 GOV-03，部署前不得声称已启用。

## 目的与范围

自动保留真实数据，而不是依赖 GitHub 的源代码或某次题库发布快照。每天在业务低峰建立 AES256 对称加密 tar+zstd 归档，紧接着校验 SHA-256 并将其解密到完全独立的临时目录，检查必要学生文件、用户 JSON、逐条 JSONL、私有题库和本地素材目录。验证结束后自动销毁临时明文。**任何脚本都没有自动覆盖生产数据的恢复入口**。

备份三个受控范围：/opt/socthink-math/private/、/opt/socthink-math/public/local-assets/、/opt/socthink-math/public/generated-solutions/。包含学生档案、考试记录、计算进度、真题及其素材。产物在 /var/backups/socthink-math/，每个成功备份包括 .tar.zst.gpg、.sha256、.receipt.json，权限 0600，父目录 0700。

加密口令只能由生产安装器在 /etc/socthink/backup-passphrase 创建、保留，权限 0600，**永不写入 Git、CI 日志或聊天**。请由负责人使用安全方法另行封存恢复密钥；**如果这份文件随服务器同时丢失，备份将不可解密**。备份状态须真实标记为 local-only，异机副本、密钥异地托管与跨机器恢复未完成。

## 安装和立即实测

只有主分支四组 GitHub CI 全绿、生产 commit SHA 和部署回执一致后，在真正服务器使用：

```bash
cd /opt/socthink-math
sudo bash ops/backup/install_verified_backup.sh
systemctl status socthink-verified-backup.service --no-pager
journalctl -u socthink-verified-backup.service -n 20 --no-pager
systemctl status socthink-verified-backup.timer --no-pager
python3 ops/backup/check_backup_health.py /var/backups/socthink-math
```

timer 为当地时间每天约 03:40，最多随机延迟 12 分钟，Persistent=true（错过时在开机后补做）。服务以 root 读取平台原有数据，但 systemd 使用 NoNewPrivileges、PrivateTmp、ProtectHome、ProtectSystem=strict、Nice 和 IO 优先级；**写权限只开放加密备份目录**。若 tar 发现源文件在读取过程中发生变化，该次备份会失败，不能生成 PASS 回执；下一周期再尝试。

## 恢复验收与故障处置

每次备份自动运行：

```bash
sudo bash ops/backup/verify_backup_restore.sh /var/backups/socthink-math/<真实归档名>.tar.zst.gpg
```

这只能解压到临时隔离目录并检查数据结构，不能恢复到生产。验证要求密钥权限正确、密文哈希一致、解密成功、目录完整、学生 JSON/JSONL 可解析。测试覆盖错误密钥、篡改密文、敏感文件缺失和保留业务原文不被修改。

实际生产灾难恢复必须另有负责人批准和独立演练：隔离新主机安装匹配代码制品、恢复数据副本、核对学生身份、考试记录数量、登录和成绩计算，再明确如何切流。没有完成跨机器恢复前 **RTO 与 RPO 均为 UNKNOWN**。不通过“本机解压成功”宣称已经实现异地容灾。

## 限制与待办

1. **本机单机备份不能抗服务器或磁盘整体损坏**：必须再部署加密异机/对象存储复制、独立凭证、哈希回读校验、生命周期策略和备份密钥异地安全托管。
2. **在线文件归档不是数据库事务快照**：tar 检测明显变化并失败关闭，但多文件写入可能跨时间点产生逻辑不一致；后续应对关键用户数据提供带一致性锁的快照或迁移事务数据库。
3. 长期保留/容量阈值需在异机保护和容量监控到位后启用；当前不自动清理归档，避免未经异机备份时删除唯一副本。
4. 每日运行记录、最近成功时间、备份文件哈希和隔离恢复回执都应由生产巡检读取；失败要发出运维告警。目前尚未建立自动告警送达和每周跨机器灾难演练。

**安全边界**：不能把真实归档/密码复制到 GitHub 或聊天；不能为测试而停机或覆盖真实用户数据。
