# socthink.cn 发布上线

生产站：`https://socthink.cn`

唯一代码源：GitHub `star8592/Kangaroo-Practice-Simulator` 的 `main` 分支。

## 一条命令发布

在测试节点执行：

```bash
cd /mnt/disk1/Code/Kangaroo-Practice-Simulator
bash ops/release/publish_socthink.sh
```

脚本固定执行以下闭环：

1. `git fetch origin main`，锁定 GitHub 的精确 commit SHA。
2. 拒绝带有本地 tracked 修改的发布，确保 GitHub 是唯一代码源。
3. 本地 `npm ci && npm run build`。
4. 在独立端口启动当前构建并运行 `scripts/smoke_test.py`。
5. 通过免密钥 SSH 连接 `root@socthink.cn`。
6. 生产目录固定为 `/opt/socthink-math`，服务固定为 `socthink-math.service`。
7. 远端只从 GitHub `main` fetch/reset 到同一个 SHA。
8. **不执行 `git clean`**，保留 `private/`、`public/local-assets/`、题库图片、用户数据及运行时资产。
9. 远端重新安装、构建、重启服务并运行 smoke test。
10. 公网 `/api/release` 必须返回相同 `VERSION` 和 `deployedSha`，否则发布判失败。
11. 已存在 Git 历史时，失败自动回滚到前一个 commit；首次接管旧部署时会先建立 legacy 代码备份。

## 发布状态检查

```bash
curl -sS https://socthink.cn/api/release
```

示例：

```json
{"ok":true,"service":"math-competition-lab","version":"1.0.0","deployedSha":"..."}
```

只要公网 `deployedSha` 与 GitHub `origin/main` 一致，才算真正上线完成。
