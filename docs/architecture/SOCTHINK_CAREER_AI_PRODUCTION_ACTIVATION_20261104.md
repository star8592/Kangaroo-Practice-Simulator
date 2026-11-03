# SOC THINK 职业 AI 面试：生产运行与收费预备（2026-11-04）

## 已执行且可核验

- 生产 PostgreSQL 数据库 `socthink_billing_prod` 已在**加密备份和恢复验证通过后**顺序执行 `ops/db/010_career_interview_service_sessions.sql` 与 `011_career_monthly_and_per_use.sql`。
- 生产从 10 个核心表增加至 13 个：3 个新增表 `billing_career_session_grants`、`billing_career_sessions`、`billing_career_round_calls`。原有 15 个商品、2 笔订单、1 笔 paid、13 件已验收数字资源数量完全不变。
- 原 `/usr/local/sbin/socthink-billing-backup.sh` 的固定 10 表校验已经升级为**至少13表及13张关键表存在**，保留旧脚本备份；生产执行后的独立数据库加密备份、13表隔离恢复、13件数字资源备份全部成功。
- Z890 用户 systemd 持久化 `socthink-career-model-link.service`，使用已存在的受信任 SSH 登录，`-R 127.0.0.1:11434:127.0.0.1:11434` 转发本地 Ollama 至生产 VPS *自身回环地址*。生产 `ss -ltn` 确认仅监听 `127.0.0.1`，没有公开 AI 模型端口。Z890 用户 linger 已启用；网络断开由 systemd 重连。
- 真实生产 VPS → Z890 4B Ollama 请求：预热后普通 JSON 推理约 0.93 秒，运行 `probeCareerModelDelivery(getConfig())` 的真实证据探针为 PASS，约 1.63 秒；但冷模型请求曾 12 秒超时，Z890 冷加载时实际一次约 20.6 秒。这不是可以忽略的异常，因此添加模型保活与 GPU 空间判断。
- 生产 **`SOCTHINK_CAREER_AI_BILLING_ENABLED` 仍关闭**；尚无职业 AI 真实付款、履约交易。

## 模型保活与 GPU 资源公平

- 官方 Ollama 支持 `/api/generate` 空请求预加载，`keep_alive` 保持模型一定时间；参见 https://github.com/ollama/ollama/blob/main/docs/api.md 。
- 新正式模型请求保留 20 分钟，避免默认的五分钟闲置就卸载。
- `ops/career/prewarm_ollama.py` 每次先检查 Z890 的显存和 GPU 利用率：冷模型至少 4100 MiB 空闲才预加载；已加载至少 1900 MiB 空闲、利用率不高于 70% 才延长保活。资源紧张时跳过，由正常过期自动释放 GPU，不干扰并行影像/游戏制作。
- `ops/career/systemd/*` 是最小化的用户级定时服务，安装到 `~/.config/systemd/user/` 并将脚本放到 `~/.local/share/socthink-career/`。每 8 分钟尝试一次；失败只能影响 AI 服务可用性，不影响正常商城收款与数学考试。
- 模型仍是单一物理机器的服务，**尚未获得独立备份模型可用性回执**；用户开始购买以前，建议另接经核验的独立云模型或第二台机器，否则断电或 GPU 占用会暂停 AI 交付。

## 真实市场参考与拟定试售（不开售）

对中国市场公开标价的2026年11月4日检索：
- 快面AI https://kuaimianai.com/pricing 自述面试准备月卡 ¥29，另有单场「实时面试辅助」¥39，**实时辅助不等于我们的模拟练习**。
- 即答侠 https://jidaxia.com.cn/buy.html 自述基础版 ¥69/月，专业版 ¥129/月，有额外简历服务和会员权益。
- 答芬奇 https://bole-davinci.cn/pricing 自述面试加购 ¥49/20 次，属于捆绑产品方案。
- HiOffers https://hioffers.cn/pricing 自述30天含 2 场模拟与简历服务的套餐 ¥39.9。竞争报价与承诺未经交易验证，只能参考，不代表他们质量/销量真实。

**草案定位**：我们的现阶段产品是 `5 个原创建模主问题 + 每题至多1个有证据依据的 AI 选定追问 + 用户自评复盘`，**没有**实时语音、正式面试现场辅助、招聘录用概率、专业测评评分。区别于定价更高的真人面试工具，应先以低门槛试售验证实际转化。

| 适用岗位 | 按次（1场） | 30天包月（10场） | 自动续费 |
|---|---:|---:|---|
| 校招软件研发 | ¥6.90 | ¥29.90 | 无 |
| 社招采购/供应商管理 | ¥6.90 | ¥29.90 | 无 |

数据库商品定义位于 `ops/db/012_career_ai_pilot_sku_drafts.sql`。**四个 SKU 仅存为 `enabled=false`、`rights_approved=false`、`delivery_verified=false` 的草案**，不发布、不展示可购报价、不启动真实微信订单。在客服/模型/定价/实际付款验收完成前，不可让运营脚本直接激活。

## 上线最后检验

1. 长时间运行 Z890→VPS 模型通道，查看掉线重连与 GPU 负载，同时确保原有其他工作不受显存挤压。
2. 经真实输入验证模型结构化解析、证据引用、岗位追问与失败自动归还场次；不仅依靠合成 32 题（之前 27/32 匹配预期标签，非专家效度）。
3. 对四个初始 SKU 核实题量、价格、账本金额与权益时长，检查双重下单防重与用户明确同意数字服务条款。
4. 使用真实、授权微信买家完成首次小额付款→官方通知/对账→获得一个场次→完成整场→订单与权益可查询。测试前绝不谎称已交易。
5. 待业务完成验收后，单独、可回退地调整 `SOCTHINK_INTERVIEW_AI_ENABLED=1`、模型供应商配置及 `SOCTHINK_CAREER_AI_BILLING_ENABLED=1`，并让后台只展示真实 `enabled=true`、权益已审核、已验证交付 SKU。

所有步骤不改现有 `billing_orders`/微信交易主线；不引入第二套付款系统。
