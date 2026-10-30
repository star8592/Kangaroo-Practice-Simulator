# SOCTHINK.CN 网站支付官方可行性核查（2026-10-30）

**结论：可行，但 Native PC 网站、微信内 JSAPI、普通手机浏览器 H5 与小程序虚拟商品是四个独立场景。** 该结论来自微信支付官方文档及我们自己的真实只读接口回执，不代表商户平台已单独批准全部产品。目标站点仅为 `https://socthink.cn`（当前 Next.js 智能考试平台）；`https://www.socthink.cn` 是仍在工作的旧 ThinkAI 商户集成，切勿用 DNS 名称差异掩盖两套订单数据库。

## 1. 官方文档核验

| 目标购买场景 | 官方依据 | 上线所需 |
| --- | --- | --- |
| PC 浏览器在 `socthink.cn` 购买本平台数字考试，微信扫码付 | [Native 支付产品介绍](https://pay.wechatpay.cn/doc/v3/merchant/4012791874)、[Native 开发准备（2026-10-22）](https://pay.wechatpay.cn/doc/v3/merchant/4015614538) | 商户对应的 Native 权限、和商户号绑定的有效 AppID、审核通过的实际经营内容、服务端签名下单、官方回调/查单、退款、唯一账本 |
| 手机浏览器（非微信内）打开本站直接唤起微信支付 | [H5 支付权限申请](https://pay.wechatpay.cn/doc/v3/merchant/4012791841)、[H5支付域名配置（2026-09-18）](https://pay.wechatpay.cn/doc/v3/merchant/4013287193) | **独立 H5 产品申请和域名审核**，交易实际跳转来源必须与审核的域名完全一致，ICP备案/经营主体/授权函及商户类目须核对。已开 Native **不等于**已开 H5。 |
| 微信内公众号/链接打开的本站网页 | [配置 JSAPI 支付授权目录](https://pay.wechatpay.cn/doc/v3/merchant/4013287088) | JSAPI 权限、支付页所在域名和路径的 **支付授权目录**、商户绑定的公众号 AppID 与网页授权用户身份（OpenID） |
| **智量巧算小程序**内部购买会员/在线模拟等数字权益 | [小程序支付开发接入准备（2026-10-16）](https://pay.wechatpay.cn/doc/v3/merchant/4015459512) | 核实账号经营类目和现行**虚拟支付**产品与实际支持的平台规则，不得把 PC Native 扫码链接塞到小程序或引导站外绕过限制。 |
| 未来由平台代第三方老师/机构收款并分账 | [电商平台收付通](https://pay.wechatpay.cn/static/partner_ability/business_payment.shtml) | 与**自营考试出售**完全不同：涉及服务商、二级商户、分账及相应网站/主体经营资质；当前自有考试产品不需要为此提前搭建支付服务商系统。 |

**重要主体差异**：Native 官方列出企业/个体户等主体；[H5 主体权限表](https://pay.wechatpay.cn/doc/v3/merchant/4015477838) 对个体工商户列为“不支持 H5”。**不能因为已有 Native 商户号就承诺可开 H5。**

### Native 可用站点和回调地址

- 官方 [Native 下单](https://pay.wechatpay.cn/doc/v3/merchant/4012791877) 要求 `POST /v3/pay/transactions/native`、有效已绑定的 `appid+mchid`、唯一商户订单号、正确价格、真实商品描述、`notify_url`。
- 官方 [APIv3 回调注意事项](https://pay.wechatpay.cn/doc/v3/merchant/4012075420) 明确：`notify_url` 应为**商户自己系统实际存在的公网 HTTPS 完整路径**，不能带查询参数或使用内网 IP；不应走用户登录保护；应在 5 秒内应答，对重复通知幂等验签。需考虑 DNS、ICP、CDN、Nginx 和安全组。
- 可在**实际开发完**当前 Next.js 回调路由后选择 `https://socthink.cn/api/payments/wechat/notify`。该路径在当前主分支**尚无完整生产 HTTP 处理器**，不能现在作为正式通知地址填进微信后台。
- 官方 Native 文档未要求 **扫码支付展示页**和 **notify_url**必须在同一个 `www` 主机名上；关键是商户应用绑定、实际业务与 HTTPS 通知地址、订单归属一致。网站域名的商户经营场景仍以商户后台实际签约为准；不可仅依赖示例文档声称实际商户批准了新站。
- 如有中国内地服务器，ICP 备案另行按政策与官方支付回调要求核对。**本次无法从权威 ICP 查询核实 `socthink.cn` 的真实备案主体、证照及其与商户号主体是否一致，不得猜测。**

## 2. 当前生产环境——真实只读回执

2026-10-30 Z890 只读公共 HTTPS 端点核验（未提交支付请求、未读取私钥）：

| URL/端点 | 真实状态 |
| --- | --- |
| `https://www.socthink.cn` | HTTP 200，TLS 通过，旧 ThinkAI 服务器 |
| `https://socthink.cn` | HTTP 200，TLS 通过，新 Next.js Math/考试平台 |
| `https://www.socthink.cn/api/subscription/provider-status` | HTTP 200，`provider=wechat_native`、`configured=true`、`mock_mode=false`、`callback_ready=true`、`missing_fields=[]` |
| `https://www.socthink.cn/api/subscription/plans` | HTTP 200，返回 3 套套餐 |
| `https://www.socthink.cn/api/subscription/orders`（游客） | HTTP 401（应限制未认证订单读） |
| `https://socthink.cn/membership` | HTTP 200，但正式付款尚未开放 |

**证据等级：** `LEGACY_NATIVE_LIVE_CONFIGURED` 且旧 ThinkAI 2026-06-16 有真实支付成功验收记录；**不能推断** `APEX_NATIVE_LIVE`、`CURRENT_ORDER_SETTLED`、`H5_PRODUCT_APPROVED`、`MINIAPP_VIRTUAL_APPROVED`。旧版与新版不应共享未隔离的用户/订单写库，付款必须在当前唯一账本事务化交付。

## 3. 官方案例直接发现并修复代码错误

[Native 下单官方示例](https://pay.wechatpay.cn/doc/v3/merchant/4012791877) 给出 `code_url` 类似 `weixin://wxpay/bizpayurl/up?pr=...&groupid=00`，不是只有 `weixin://wxpay/bizpayurl?pr=...`。PR #155 初稿对 `code_url` 的正则过窄，**会拒绝合法支付响应**；已改为标准 URL 分析及微信官方 `/up` 路径、受控参数白名单验证，加入恶意路径/参数测试。

同一官方文档示例中的 AppID 包含 `g/h` 等不在十六进制集合中的字母，故微信 AppID 的校验不能采用 `wx[0-9a-f]{16}`；应允许 `wx[a-zA-Z0-9]{16}`。PR #155 已更正并加入此官方形态测试。

以上均仅离线合成测试，**不可称真商户支付成功**。

## 4. 成本最低的正式实施顺序

1. **先用当前已开通的 Native Web**，只面向 PC 浏览器，自有考试商品自营收款；不同时申请 H5/JSAPI/小程序虚拟支付来阻塞首单。
2. 商户持有人在微信官方商户平台核对原商户号的 Native 产品状态、交易权限、AppID 绑定和**实际经营场景允许新的 SOCTHINK 线上考试商品**。如果需要更新审核信息，依法提交实际域名和商品服务说明。只能由当前账号的受权超级管理员完成核验。
3. 新 Next.js 服务端建立与统一商品 SKU/单一 PG billing-ledger 连接的订单 API、签名和首方二维码展示、Webhook 验签/解密、签名验证的独立查单、幂等交付、退款和对账；把旧 Python 的真付回调当经验样例，但**不双边结算**。
4. 先允许仅批准的测试人员用真实小额合法考试商品支付并完整完成：`商品页→服务端报价快照→订单→Native扫码→官方验签→正式查询→唯一权益→退款→权益核对`。保留回执但脱敏订单、客户/交易信息。
5. **再**根据真实手机用户渠道需求分别申请 H5/JSAPI 和合法小程序虚拟支付，明确域名备案、主体和授权目录；支付宝按同一账本接第二个适配器。

**当前禁止动作：** 不直接复制旧商户私钥入 GitHub、不将旧支付二维码分享给第三方生成器、不通过前端 `paid=true` 授权、不将正常 Web Native 收款伪装成小程序虚拟支付合规、不为绕过平台规则让小程序用户跳站外付款、不在未授权的生产机上执行脚本。
