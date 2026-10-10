# 真实题库保全发布门禁（2026-10-10）

## 背景与事实

SOC THINK 正式站点当前发布标识为 `a15466dbc8aa8a43d274156c5a0538d8202c4474`。只读 `GET /api/release` 显示：原始题卷 418 份、问题 10,868 题、可训练卷 417 份、智能组卷 31 份。正式系统在 `/opt/socthink-math/private/exams` 有 418 个 JSON；主服务器服务状态为 active。以上是 2026-10-10 的**基线快照**，不是永久不变的上线 KPI。

原有独立工作树未挂载私有题库，曾显示 0 份，导致“空题库也能通过 Next build/E2E”成为真实风险。本工作专门解决部署时题库消失而未经发现的问题。

## 门禁结构

- `scripts/guard_release_inventory.py`：生产当前服务和候选服务都从仅本机回环 `/api/release` 读取只读的统计摘要，不读取也不移动题目、学生身份或订单数据。
- 比较两端发布 SHA 并要求候选严格匹配计划提交；对 `rawInventory` 的原始题卷数、题目数、分赛事计数，以及 `trainingInventory` 的可训练卷数、智能组卷数、分赛事计数均不允许减少。
- 基线缺失/为零、候选库存为空或指标失真/缺失、赛事身份丢失、候选 SHA 不一致或 HTTP 错误，一律阻断升级。不得默认为测试用的空库。
- `ops/release/auto_deploy_server.sh`：候选已经启动、身份验收通过，但尚未切换线上之前运行此工具；失败走已有 `ERR` 处理和候选清理/回滚逻辑。
- `ops/automation/quality_gate.sh` 纳入 `scripts/test_release_inventory_guard.py`，持续执行 2 个正例 + 21 个失败注入断言。
- 测试契约为独立服务，不修改公用题库；业务确实需要缩减试卷时，必须通过另行审核的数据迁移方案和特殊发布流程，不可直接掩盖库存缩水。

## 验收与限制

开发时运行：
```bash
python3 scripts/test_release_inventory_guard.py
bash ops/release/test_auto_deploy_contract.sh
```

真实候选在目标服务器上（候选仅监听 127.0.0.1）：
```bash
python3 scripts/guard_release_inventory.py \
  --baseline-url http://127.0.0.1:3000/api/release \
  --candidate-url http://127.0.0.1:3097/api/release \
  --expected-sha <40-character-target-sha>
```

上线后仍需真实操作验收，验证指定试卷能进入、题目数与赛制一致、交卷/恢复及会员权限正常。此门禁保证**不会静默丢失试卷数量**，但不能独自证明每道题的翻译、解析、正确答案和授权完整。正式上线另外保留数据库备份、加密异机副本、回滚点与真实 Web/小程序签收证据。

此门禁 PR **不等同于部署**。在 main 合并时必须遵守已有 PR/CI/发布要求。
