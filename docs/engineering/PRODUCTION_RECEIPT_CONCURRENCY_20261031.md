# 2026-10-31 Production Receipt 并发隔离根因修复

## 真实症状

主分支 `61f005f` 的 CI 四项通过且公网 `/api/release` 已显示同一 SHA，
但对应的正式 `Production Receipt` 工作流 `41094260561` 状态为
`cancelled`，随后 `41094396713` 为 `skipped`。

## 根因与修复

旧 `production-receipt.yml` 固定 `concurrency.group=production-receipt`，
并设置 `cancel-in-progress: true`。
任何分支的 CI 完成都会触发 `workflow_run`，即使最后条件判断跳过
非主分支任务，仍可能抢占同组中正在运行的主分支回执。

新流程按 `github.event.workflow_run.head_branch` 给回执任务分组；
主分支的 push CI 与普通 PR CI 不再抢占同一个并发组。验收任务还要求
上游 CI 必须是 `push`、`main`、`success` 三者同时成立。

质量门内运行 `scripts/test_production_receipt_policy.mjs` 检测未来
回归到全局互斥组。生产验收仍须以真实工作流执行记录和在线 SHA、
库存、游客权限 smoke 全部通过为准；修改 YAML 并不等于回执成功。
