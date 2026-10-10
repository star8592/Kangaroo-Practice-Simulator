# ADR-2026-10-10：SOC THINK 会员统一权益、Web 微信支付和小程序虚拟支付

**状态：已提出实施决策，支付仍未上线。** 关联：`docs/ACCESS_MATRIX_V1.md`、`docs/engineering/BILLING_LEDGER_IMPLEMENTATION.md`、GitHub Issue #52、双端发布任务 #90。

## 1. 决策

> 采用 **一套学生/家庭权益及订单账本 + 独立支付渠道适配器**，不能将已开通的 Web 微信支付权限等同于已开通小程序虚拟支付权限，也不能在小程序中诱导用户跳转外部网站购买虚拟会员。

- **Web PC**：已有普通微信支付商户产品支持时，服务端 Native 交易下单 → 本站展示动态付款二维码 → 微信扫码 → 微信服务端通知/查单核验 → 原子发放权益。
- **Web 的微信内 H5**：若商户已绑定适用公众号 AppID 并开通 JSAPI，则可用 JSAPI 下单；在普通手机浏览器仅在已开通 H5 产品权限与域名配置后接入 H5 支付。**JSAPI/H5/Native 不是可任意混用的接口。**
- **微信小程序**：训练会员、数字题库、AI 题解、模拟赛功能订阅和数字报告属于虚拟权益；按照 2026 年微信虚拟支付规则，**必须先在该小程序后台核实虚拟支付准入、开通/结算/费率/商品及发货规则**，然后使用 `wx.requestVirtualPayment` 及其对应商户服务端适配器。**不得拿普通 JSAPI 的 `prepay_id` 直接调用 `wx.requestPayment` 销售此类虚拟会员。**
- 同一家庭可以在 Web 购买、在 Web 和微信小程序使用已验证权益，前提是双方通过实际身份校验完成账号与合法监护人绑定；不得根据昵称、客户端上报 OpenID 或相似手机号自动合并学生成绩/权益。
- 会员目前尚未正式收费，`/membership` 的“支付尚未开放”文字必须保留，直至真实环境正式验签、退款和灰度验证通过。不得因为已配置商户账号就自动开启付款按钮。

## 2. 已存在的工程基础（截至 2026-10-10）

- `src/lib/access-policy.ts`：`guest/free/plus/pro` 服务端 capability 权限矩阵，区分公开内容与增量高级功能。
- `src/lib/billing-ledger.ts`：独立 PostgreSQL 事务账本，订单、支付事件、权益有效期、退款撤销、幂等和配额；**当前仅存在 `wechat_pay` 类型的模拟核验输入，不含任何真实微信验签或支付 HTTP API。**
- `ops/db/001_billing_entitlements.sql`：八张隔离表；生产账本和迁移角色、备份、TLS、可恢复演练尚未正式验收。
- `/api/access/me`：只读权限发现，`policyMode=preview`；小程序使用自己独立的已验证微信身份。现有微信用户并不自然等于已验证的付款家长。
- Web `/membership` 当前主动告知“正式收费尚未开放”；小程序 `我的` 页尚无收费业务。
- 2026-10-10 Web v4 主站已验收上线；小程序新版当前是微信官方预览包，不是正式审核版本。

## 3. 平台政策与出处

- 2026-02-27 微信团队《小程序虚拟支付业务管理规范更新公告》明确：微信小程序 iOS 已开放虚拟支付，会员等非实物虚拟商品需通过虚拟支付接入，禁止通过外部网站/公众号/H5 等绕行；公告指引和可用条件必须在公众平台最新后台再次核实。`https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/business-capabilities/virtual-payment.html`、公告页面 `https://mp.weixin.qq.com/cgi-bin/announce?action=getannouncement&announce_id=11772091560sL6TW&version=&lang=zh_CN`。公开转录：`https://www.csweigou.com/article/3389.html`。
- 微信支付官方 **Native 下单**：`https://pay.wechatpay.cn/doc/v3/merchant/4012525171`；**JSAPI/小程序普通下单**：`https://pay.wechatpay.cn/doc/v3/merchant/4012791856`；**小程序普通支付准入**：`https://pay.wechatpay.cn/doc/v3/merchant/4015459512`。普通商户支付文档不应误作虚拟支付适用凭证。
- iOS 侧佣金随政策变化：Apple 2026-03-15 将中国内地适用计划佣金调整，详见 `https://developer.apple.com/cn/news/?id=dadukodv`。微信虚拟支付的**实际商户费率和优惠**必须以本小程序后台已开通产品协议和当期费率为准，不能把网络报道的限时数值写死进商品利润率或合同。
- 上线前还须核验小程序经营类目、交易类运营/发货管理、退款服务、用户协议、未成年人保护及数字内容来源授权。

## 4. 系统模型与支付交易一致性

```text
       Web Parent         WeChat Mini Program Parent
           |                        |
     [Native/H5/JSAPI]       [Virtual Payment]
           |                        |
           +--> PaymentGateway Adapter(s) <--+
                     |
             Server-issued Order
                 immutable SKU
          product_id / owner_parent_id
         price_minor / currency / channel
                     |
            Official Payment Proof
       signature + provider status query
              amount + currency match
                     |
             Transactional Ledger
     billing_orders + billing_payment_events
         + billing_entitlements + audit
                     |
             Identity/Family Mapping
                     |
             Web & Miniapp Access API
```

- 数据模型需 **additive migration** 引入 `payment_channel`、商户业务类型、`provider_order_id`（不同虚拟支付 SDK 返回值必须实际核实）、购买平台和商品映射。不得直接改变历史已付订单和先前的 `wechat_pay` 回调语义；需要能区分 `wechat_pay_native` / `wechat_pay_jsapi` / `wechat_virtual` 的结算事件命名空间。
- 对 `billing_products` 使用稳定 SKU，例如 `plus_month`、`plus_year`、`pro_month`、`pro_year`。**生产价格未获业务确认，一律不写死收费金额；独立报价、币种、优惠、虚拟货币换算等由服务端签发并按渠道监管规则配置。**
- 先以**非自动续费的月/年使用期限**交付，不自动假定微信普通支付和虚拟支付提供相同的订阅续费机制或可跨平台自动续扣。
- 整体扣款链路必须是：家长身份/监护关系核验 → server-side order → 官方下单/虚拟道具订单 → 唤起支付 → 用户界面只能显示“确认中” → **服务端核验官方回调与查单交易状态** → 比对商户、业务 AppID、SKU、订单、实际付款金额/币种 → 幂等结算 → 服务端权益。
- 小程序 `wx.requestVirtualPayment` 的客户端回调、`wx.requestPayment` 的客户端 `success` **都不等于已收款**。支付通知必须验签/防重放；退款/撤销必须校验交易并补偿权益，不删除孩子的历史成绩。
- 未成年人不直接被诱导付费；套餐购买与退款入口主要放在“家长中心”。家长合法绑定多个孩子后共享席位上限，孩子之间的数据始终隔离。
- 保留已公开的基础计算、公开样题、标准结果等免费；只有新增加且已可交付的 AI 分步讲解、高级诊断、个性化组卷、家庭多学员管理等能力可以定价。任何实际来源授权不足的原题，即使已付会员，也不能自动开放。

## 5. 推荐实施迭代与 DoD

### P0：商户能力盘点（不可跳过）
- 只读查看网站 **Native**、**JSAPI**、**H5** 产品是否真实开通；核实各产品绑定 AppID/域名；确认微信小程序后台是否已有 **虚拟支付** 入口、准入类目、结算主体、商品和必要 ID。失败时不得通过别的接口硬代替。
- 密钥只进 root-owned secret / 环境文件、专用密钥路径；不得在用户聊天、GitHub、日志、数据库明文和截图中传播。已曾在聊天/明文传播的 APIv3 Key / AppSecret 应**轮换**，而非继续使用暴露过的旧值。
- PostgreSQL 独立账本迁移到已备份并完成隔离恢复的生产兼容环境，启用连接 TLS、权限最小化、回滚和对账日志。

### P1：可卖 SKU 与家庭权益
- 确定 Free / PLUS / PRO 实际提供功能、家长席位、AI 配额、月/年金额和退款规则；准确展示到 Web 及小程序，先保持支付开关关闭。
- 注册/已验证监护人和学生账户链接：不能仅凭微信静默登录、头像或手机号合并旧学生。父母合法绑定后才能让相同权益跨 Web/小程序生效。
- 单端与跨端升级的 401/403、到期、并发、重放测试全部通过。

### P2：Web 微信收款适配器
- 安全生成本地订单并服务端调用 Native，二维码展示、查单/回调校验、取消/超时重试、幂等写账、微信 Native 查询订单与退款测试。
- 微信内 JSAPI/H5 只在产品权限和域名配置确认后追加；不阻塞首期 Native PC 场景。
- 全部测试先在测试商品与受控低额测试账号执行，不能把业务模拟回执当真钱已到账。

### P3：小程序虚拟支付适配器
- 前提：实际虚拟支付产品权限、商品映射、类目及协议已审批开通。
- 按官方 `wx.requestVirtualPayment` 的真实订单格式、服务端签名/查询及发货协议开发 **专用 adapter**，不得直接复用普通微信 pay-jsapi adapter。
- Android 与 iOS 分别真机验证成功、取消、断网、重复点击、发货失败恢复、退款/撤销、不同设备已购权益恢复。无需该能力的纯免费功能不因支付 SDK 缺失被挡住。
- 正式微信审核和订单发货管理合规验收通过后才灰度开启虚拟商品购买 UI。

### P4：统一交付、财务对账与运营
- 真实商户收款 → `billing_payment_events` → `billing_entitlements` → Web、小程序均可用；多端权益不重复售卖或错误延长。
- 支付与订单日对账，未到账、超时、异常订单可恢复；退款后仅撤销对应权益，保留已生成的原始学习记录。
- 1% → 10% → 全量灰度，订单成功率/权益发放滞后/支付差异/退款延迟有告警及**一键停收款**，不影响基础训练服务。

## 6. 必须避免的实现捷径

1. 不给小程序“充值 VIP”按钮直接复用 PC Native/普通 JSAPI 商户密钥；没有小程序虚拟支付准入不能收小程序虚拟会员款。
2. 不使用跳转至站外网站、让 iPhone 用户找安卓代付等方法绕过小程序虚拟支付。
3. 不能把微信账户 OpenID 等价于 `parent_id`，不能因客户端报 `paid: true` 发放权益。
4. 不使用未核实的佣金百分比指导生产定价；不默认跨平台自动续费。
5. 不将购买入口或会员限制上线早于实际高级服务的成功交付与退费机制。

**结果定义**：仅在每条渠道实际微信后台核验、真实低额付款和退款、Webhook 防重放、账务对账、Web/小程序权限双端回归全部通过后，才能宣称“支付系统上线”。