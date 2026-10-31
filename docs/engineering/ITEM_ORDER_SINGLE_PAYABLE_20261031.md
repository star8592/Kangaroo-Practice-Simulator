# 单微信账户：同一单品只允许一个可付款订单（2026-10-31）

## 根因及修复

原有下单流程先查**已支付的权益**，但是同一买家在首个 Native 二维码未付款时可连续生成多个待付款订单。
官方 Native 付款码可能在多个浏览器或设备上显示并被分别支付。单纯禁用按钮只能挡住同一组件内的重复点击，
**不能阻止跨设备、刷新后的第二个订单**。

因此迁移 `ops/db/006_unique_active_item_orders.sql` 在唯一 PostgreSQL 支付账本的
`billing_orders(payer_parent_id, content_kind, content_id)` 上建立部分唯一索引，
仅覆盖 `product_kind='item' AND state IN ('pending','paid')`。

- 对同一买家、同一内容，待支付和已支付共享唯一的可付款槽位；
  不同买家及不同商品互不干扰，PLUS/PRO 会员订阅不受影响。
- 服务端 `createBillingOrder` 在原事务 advisory lock 后同时检查
  已付款权益和未付款订单，跨设备重复创建会得到确定的
  `ITEM_PAYMENT_PENDING` 409 响应。
- 数据库唯一索引是最后一道可靠约束；即使另一个调用者绕过了
  应用检查，也不能插入第二份可支付的同内容订单。
- 当订单获得**真实官方关单证明**并变成 `closed`，或真实退款
  状态变成 `refunded` 时，释放该槽位，允许用户重新购买；
  **不能**仅因本地时间过期、页面关闭或浏览器取消就擅自
  把 `pending` 改为 `closed`。
- 已支付订单、交易事件与授权不会被删除；新迁移如果遇到历史重复
  活跃订单，应该失败等待资金对账后手工处理，不静默清理。

## 与微信支付官方规则的区别

Native 生成的 `code_url` 二维码默认有效期只有 **2 小时**，
而未传 `time_expire` 的微信订单默认支付有效期是 **7 天**。
“二维码过期”并不等于“微信订单正式关闭”。要允许因超时
重新下单，还须调用微信支付官方 Native 关单接口
`POST /v3/pay/transactions/out-trade-no/{out_trade_no}/close`，
在官方确认关单后再更新账本。普通商户的官方指引：
https://pay.wechatpay.cn/doc/v3/merchant/4012791891
https://pay.wechatpay.cn/doc/v3/merchant/4012526915

本次 PR **只解决禁止双重扣款的硬约束**，不假装 Native 官方关单、
运营取消、扫码刷新或超时补偿已完成。正式开放单卷/资料收费之前，
必须完成官方关单/查询的原子状态闭环、用户取消/重试 UX 和真实回执验收。
未完成前保留 `SOCTHINK_WEB_NATIVE_PAYMENTS_ENABLED=0`。

## 验收

`scripts/test_billing_ledger.ts` 在临时 PG 库上，使用四个并发请求
确认恰有一个待付款订单，其余三次得到冲突；
退款后的新订单可以重新创建；站点原会员续期、退款和消息幂等保持通过。

生产应用 migration 时请依序 001→002→003→004→005→006，
且先备份、恢复抽样并审计历史订单。不要在发布构建时修改生产数据库。

## 2026-10-31 后续代码变更

上方“本次 PR 只解决约束、关单代码尚未完成”描述的是此前
006 提交的状态。后续 007 现在提供官方验签关单与单 worker 补偿，
但不意味着真金白银或生产开关获授权。官方实测、退款与上线清单
请以 `docs/engineering/WECHAT_NATIVE_PROVIDER_CLOSED_20261031.md` 为准。
