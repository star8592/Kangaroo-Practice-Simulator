# SOCTHINK 微信 Native 正式关单闭环（2026-10-31）

## 为什么必须补这一环

微信 Native 官网官方开发指引指出：未传 `time_expire` 的支付订单默认可支付 7 天，
`code_url` 仅有效 2 小时。浏览器二维码消失、页面关闭、客户端点击取消、
本地定时器超时均 **不能** 证明微信订单在官方侧已关闭。禁止因此释放
`billing_orders` 中同买家、同内容的唯一待付槽位。

官方资料：

- https://pay.wechatpay.cn/doc/v3/merchant/4012791891
- https://pay.wechatpay.cn/doc/v3/merchant/4012526915

## 唯一生产链路（不增设第二套关单服务）

1. 新 Native 网站下单请求在由服务器签名的 `bodyText` 中设置
   `time_expire = context.nowSeconds + 30min`（RFC3339），确保不能在
   用户放弃很久后再次付款；金额、商户号、订单 ID 等仍从服务器读取。
2. 单一既有 `reconcilePendingNativeOrders` worker 原有逻辑先通过
   官方签名查单识别 `SUCCESS`，继续原子结算和发放权益。
3. 若官方明确报告 `CLOSED`，把验签后原始响应 SHA-256 连同关单日期
   写入唯一账本，原子变更本地 `pending → closed`。
4. 若官方报告 `NOTPAY` 或 `USERPAYING`，订单已经创建至少 35 分钟
   （30 分钟结束 + 5 分钟缓冲），同一个 worker 才调用已用商户私钥
   签名的官方 `POST /v3/pay/transactions/out-trade-no/{out_trade_no}/close`。
   必须验证微信返回的 HTTP 204 **响应签名**；再独立官方 GET 查单，
   只有查得 `CLOSED` 并通过微信公钥验签，才能本地关单。
5. provider 网络故障、错误 HTTP、签名不对、官方仍 `NOTPAY`、
   本地 PG 事务失败，都不能释放同品待付槽位。worker 原有
   `reconcile_checked_at` 控制重试，不增设任何并行付款账本或调度。
6. 官网 `GET /api/payments/wechat/orders/[orderId]` 继续显示
   `pending/paid/closed/refunded` 状态，前端收到 `closed` 后才允许用户
   重新发起一个不同商户订单号的订单。
7. 真实已付/退款订单不允许误关或撤销；账本 `billing_orders` 的
   `closed_at`、`close_provider_payload_sha256` 存留脱敏后可复查证据。

## 安全边界

- 真实正式商户号、APIv3 密钥、商户私钥和微信公钥只能保存在受控服务器，
  不准存 GitHub 或日志。公钥与商户私钥各司其职，不能互换。
- `closeVerifiedNativeOrder` 是内部事务函数，不提供客户端 POST
  让用户伪造 `providerClosedConfirmed`；只有独立签名 GET 结果可以调用。
- provider 不存在该订单、无响应或存在金额/商户状态冲突时**不伪装关单成功**；
  需要官方证据与运营对账。需要真实微信两个买家、两设备扫码、
  30 分钟过期、真实官方关单 204/GET CLOSED、退款、宕机重试等验收，
  CI/mock 不等于商户生产验收。
- 微信商户官网经营场景核准、生产 PostgreSQL 备份/恢复、APIv3 商户密钥
  注入和用户支付权限仍需受权运行；正式收款开关不得提前打开。

## 独立数据库迁移

`ops/db/007_native_close_proof.sql` 为现有订单表仅新增
`closed_at` 和 `close_provider_payload_sha256`，不新增表、不改主账本；
现有全部 migration 依序为 001→002→003→004→005→006→007，
账本仍为 10 张表。

## 自动化测试

- Pure V3 签名测试：30分钟 `time_expire`，关闭接口的精确签名路径、
  商户号 body，非法订单/时间窗口拒绝。
- Transport：模拟签名的 204 空响应验真、签名篡改拒绝、
  官方签名 `CLOSED` 查单与未知状态拒绝。
- Recovery：`NOT_PAID` 不关、`VERIFIED_CLOSED` 才保存关单证明。
- PostgreSQL：`pending` 唯一占位、无证明拒关、官方证据关单、
  重放幂等、关单后可重新建单并支付、已付订单不得误关。
- 之前的会员续费、退款、商品授权、文件交付和 Web/小程序端点击全量回归。
