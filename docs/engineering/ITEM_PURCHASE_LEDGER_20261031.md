# 单微信账号：单卷/单资料商品交易闭环（二阶段，2026-10-31）

## 本次工程变更（候选分支，尚非支付生产验收）

单微信账号不变。扩展**同一个** PostgreSQL `billing_products → billing_orders
→ billing_payment_events → billing_*_entitlements` 交易链路，不新建第二套订单、
第二套回调或第二套结算 worker。

- 迁移 `ops/db/004_item_purchases.sql`：保留旧 PLUS/PRO 月/年套餐，新增
  `product_kind=item`、`content_kind=exam|resource`、不可变订单内容快照；
  item 权益表仅是同一订单的授权投影。
- **默认绝不出售**：新商品 `enabled=false`、
  `rights_approved=false`、`delivery_verified=false`、
  `access_restricted=false`。需要完成版权/销售资格、题库实物、
  价格和交付核实后才能上架；审核状态不能仅来自网页按钮。
- 付款只有签名验真 + 官方独立查单金额与商户一致后才能结算，
  同一事务把订单标记为 `paid` 并赋予具体内容权益；
  回调不能直接放权，重复查询只返回原有授权。
- 同一微信买家不能重复购买已拥有的单品；不同买家隔离，
  退款撤销本次商品权益，历史答卷不删除。
- 试卷前端页面、题目 API、考试会话、交卷评分检查
  `SOCTHINK_ITEM_ACCESS_ENFORCED` 和实名购买权益；
  已经付费过的试卷即使 SKU 停售，仍保持付费检查。
  网站身份与小程序不同 AppID 的 OpenID **不得自动合并**。
- 会员购买页只展示真实启用且已批准、已验证的商品；
  单卷额外要求真实训练卷存在且训练就绪。
  已购单卷在“我的账号”中显示价格、订单与重新进入考试的链接。
- 单份数字资料的账本/权益已经准备好，但**真实文件交付与受保护下载
  API 尚未完成**，因此当前商城不出售 `resource` 类型，Native checkout
  也明确拒绝这种商品，禁止“付钱但无文件交付”。

## 正式激活所需条件

1. 先对专属支付数据库备份并验证恢复；新建数据库执行 001→002→003→004
   四套 migration，已存在的专属库仅在经授权迁移审查后增量执行 004。
   不得把 schema 迁移混进 npm build、GitHub CI 的生产发布步骤。
2. `SOCTHINK_ITEM_ACCESS_ENFORCED=1` 必须在第一张单品付款**之前**开启；
   只要历史上产生过任何单品付款，它就不能通过“关闭新订单”而关闭；
   关闭新收费应只改 `SOCTHINK_WEB_NATIVE_PAYMENTS_ENABLED=0`。
3. 验证 Native 商户 APPID/MCHID 关联、经营场景权限、APIv3 与签名回调、
   HTTPS 查单、退款成功、生产单实例补偿 worker 和原始回执，
   与 `ops/payment/PRODUCTION_ACTIVATION.md` 顺序一致。
4. 逐项人工审核候选商品的合法使用/商业分发权，检查真实内容及交付、
   明确单价、有效期与退款规则后，才能给 `billing_products` 添
   `item` SKU 并启用三个商品级审查字段。
5. 在两个真实微信买家、手机与桌面端完成真单对账、独立身份隔离、
   补单、撤销、历史成绩保留和回归验收。CI 通过不等于真金白银成功。

## 额外边界

- 新站 HTTPS 503 仍表示生产收款未开放；不得凭本次代码 PR
  把支付生产状态改为已上线。
- Web 和小程序目前仍没有可靠 UnionID 绑定闭环；尚未批准的小程序虚拟
  商品支付不能借用 Native PC 扫码支付权益。
- 此次迁移不会改、删任何原学生记录或旧的登录 token；原来的免费
  竞赛训练保持原有使用逻辑，只有明确设为付费的试卷走单品权益校验。
