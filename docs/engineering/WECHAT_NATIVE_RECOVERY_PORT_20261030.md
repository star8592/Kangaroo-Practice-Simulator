# 微信 Native 已验证旧支付链恢复：新版 SOCTHINK 迁移第 1 片

日期：2026-10-30。父任务 [#153](https://github.com/star8592/Kangaroo-Practice-Simulator/issues/153)、商业化 [#151](https://github.com/star8592/Kangaroo-Practice-Simulator/issues/151)、账本 [#52](https://github.com/star8592/Kangaroo-Practice-Simulator/issues/52)。

## 真实工程基础

Z890 上的历史 ThinkAI：`/mnt/disk1/Code/socThink/ThinkAI`（有用户未提交修改，**绝不清理、覆盖、重置**）。旧 `socratic_engine/services/payment_service.py`、`payment_callback_service.py`、`api/subscription.py`、前端 `PricingPage.tsx` 已包含真实微信 Native 下单、扫码、回调、查单、订单恢复、会员发放。当地 `docs/technical/wechat_pay_fix_summary_20260616.md` 与 `wechat_pay_system.md` 记录 **2026-06-16 真微信支付交易和修复后 pending→paid 的生产验收**。这证明**旧版曾可收款**，不证明新站当前具备交易通路。

**访问方法已纠错**：项目历史 SSH Host alias `labs.socthink.cn` 在受控 Z890 设备用 `check_ssh` 成功；直接裸 IP 可能触发 `Too many authentication failures`，不代表服务器账户坏了。当前专用远程执行命令仍受策略限制，所以此片绝不假称读取或修改了生产密钥、账单或线上程序。按 [EngineeringOS 统一访问规范](https://github.com/star8592/EngineeringOS/blob/main/docs/operations/CROSS_PROJECT_ACCESS_AND_AUTH_LESSONS.md) 操作。

## 本次真正落地（仅服务端内部模块，不开付费入口）

1. `src/lib/wechat-native-payment.ts`：基于官方 API v3 的 Node.js 原生 RSA-SHA256 签名（使用签发请求的**精确原始 JSON**）、固定 Native 下单路径、GET 主动查单签名；微信公钥/平台证书对应 ID 严格匹配，回调/应答原始报文验签（支持请求头大小写混用、时钟漂移限制及签名探测流量防护），AES-256-GCM 验证解密，`trade_state=SUCCESS` + `trade_type=NATIVE` + 商户/应用/金额/币种/订单/平台交易号检查。所有函数都不写订单库、不读取商户秘钥、不主动联网。
2. `src/lib/wechat-native-transport.ts`：最小 Node 服务端适配器：向微信官方 Native API 发**已签名的原始字节**而非重新序列化 JSON，要求 **HTTP 成功 + 微信官方签名验签通过**才接收 `code_url`；GET 官方订单查询同样验签并和受信服务器订单快照核对。返回 `weixin://` 指令给**自有域名上的本地二维码生成器**，禁止发送到旧 ThinkAI 使用的 `api.qrserver.com` 等第三方二维码服务。注意本片只返回字符串，尚未提供 QR 图片或购买页面。
3. `scripts/check_wechat_pay_readiness.mjs`：新增 `SOCTHINK_PAYMENT_SURFACE=web-native | miniapp-virtual` 场景区分。**PC Web 公众号/网站 AppID 与小程序 AppID 不一定相等**，不能用小程序错配阻挡 Web Native 支付；小程序虚拟商品必须通过虚拟支付专项准入，不得借 Native 或普通 JSAPI 绕过。默认旧小程序预检查范围；使用 Web 范围时必须**显式指定 `web-native`**。脚本仍仅只读配置，不证明商户平台产品已开通。
4. `scripts/test_wechat_native_payment.ts`、`test_wechat_native_transport.ts`、`test_wechat_pay_channel_scopes.mjs`：全部使用**临时生成的 RSA / AES-GCM 密钥、内存 HTTP 回复以及假账户/假金额**；覆盖签名验证、字节变化、跨应用/金额错配、签名重放时间窗、恶意 code_url、断网、伪造 HTTP 回执、旧测试回归。**不连接外网、不产生真实交易。**

## 正式接通前仍缺什么

- 服务器真实受保护商户 PEM / APIv3 Key、微信支付公钥 ID、对应应用 AppID、商户权限、有效期/轮换，必须在**生产机授权上下文**核实；不能从 Google Docs/其他业务的旧 .env 直接复制。
- 当前一份 PostgreSQL 账本已有会员账本和幂等基础，但默认 provider `wechat_pay`，尚无正式微信支付 adapter 接线、商家订单创建 HTTP route、回调 route、服务端主动查单事务对账、正式权益退款；这些需要**独立 PR** 和当前应用身份绑定。
- 二维码应在 SOCTHINK 本地或自有域名生成，避免第三方泄露一次性 `code_url`；该 UI / 原始数据/真实支付价必须独立按已确认 SKU 落地。
- 必须验证真实支付产品支持、Web 回调 HTTPS、对账与退款、故障恢复、家长代付以及资金异常时**一键停收款**。微信小程序虚拟支付与 Web Native 不共享协议身份或准入。
- 历史真支付应在原服务器/商户平台核对脱敏订单结果；应用切换期间不得让老 Python 与新 Node 两套同时处理同一笔订单的权益发放。
- **完成正式切换必须有真单、真实 webhook、已验签官方查单、订单→唯一权益、退款对账、灰度/回滚及当前生产 SHA 的回执。** 此代码 PR 不开启收款。

## 预检查命令（仅执行本地模拟测试）

```sh
npm run test:wechat-native-boundary
npm run test:wechat-native-transport
npm run test:wechat-pay-scopes
npx tsc --noEmit
```

## 只读环境预检（不要输出密钥）

在实际上线宿主机的**可信安全配置环境**，Web Native 模式需显式选择 `SOCTHINK_PAYMENT_SURFACE=web-native`；小程序虚拟支付选择 `miniapp-virtual`，并分别运行 `node scripts/check_wechat_pay_readiness.mjs`。环境变量不应通过 shell 命令行传入原始秘钥，不在 CI/Issue 打印原始密钥。预检成功只说明“本机字段结构合理”，不是“可收款”证明。

## 官方协议依据

- Native 下单：https://pay.wechatpay.cn/doc/v3/merchant/4012525171
- Native 开发指引（2026-06-09）：https://pay.wechatpay.cn/doc/v3/merchant/4012791891
- 签名验签工具：https://pay.wechatpay.cn/doc/v3/merchant/4012365352
- 回调验签与 WeChat Pay 公钥 ID：https://pay.wechatpay.cn/doc/v3/merchant/4012587960

## 2026-10-30 当前公网双入口实测（在 Z890 上只读 curl，不发订单）

必须区分两个域名，过去的反复登录错误部分来自**把不同服务器当成同一个环境**：

| 公网 URL | TLS/HTTP | 当前物理服务器 | 业务类型 |
| --- | --- | --- | --- |
| `https://www.socthink.cn/` | HTTP 200，TLS 验证通过 | `8.148.186.49` | **旧 ThinkAI，历史微信支付** |
| `https://socthink.cn/` | HTTP 200，TLS 验证通过 | `8.166.137.232` | **当前 Next.js 数学平台** |

旧 ThinkAI 的**现网** `https://www.socthink.cn/api/subscription/provider-status` 当前返回的**安全白名单字段**：

```json
{"provider":"wechat_native","display_name":"WeChat Native","configured":true,"mock_mode":false,"callback_ready":true}
```

这是实测只读响应，不是模拟测试。另 `/api/subscription/plans` 返回 200、3 个套餐；`/api/subscription/orders` 和 `/api/subscription/me` 在游客态都按预期返回 401。没有打印套餐价格、登录令牌、订单或密钥。

**解释**：旧服务**目前在线并自报真实微信 Native 配置完整**，2026-06-16 曾有真实付款成功记录。但是当前没有授权操作交易端或读取商户平台新回执，不能由此推出“今天新付款或退款已验收”；这一步仍是 `LIVE_PAYMENT_UNVERIFIED`。新 `socthink.cn/membership` 同时仍写“正式收费尚未开放”，两者**不是同一交易系统**。不可仅通过 DNS 切换、前端按钮或跨子域跳转将老订单伪装为新账本订单。

**下一步最短路径**：以 `www` 已运行的旧支付服务作为真实商户协议回归的来源，保留其生产配置不动；新系统单独实现授权家长创建订单 → 生成本地二维码 → 微信官方回执与主动查单验真 → 唯一 PostgreSQL 事务账本发放权益。需要在一笔受控真单中验证新站，不可直接复用旧 `/api/subscription/checkout` 给新站学生授权，除非完成账户与账务迁移核验。
