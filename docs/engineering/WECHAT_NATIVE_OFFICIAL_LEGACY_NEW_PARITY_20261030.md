# SOCTHINK 微信支付逐项对照与正式联调记录（2026-10-30）

**这是证据对照表，不是上线批准。** 比较四个源：① 微信支付普通商户 API v3 **官方文档**（文末逐项 URL）；② Z890 老 ThinkAI 源码及 2026-06-16 真支付历史验收；③ `star8592/Kangaroo-Practice-Simulator` 的 `main`；④ 实际公网只读 HTTP、生产 SHA 与用户 Google Docs 私有《微信支付》配置笔记。**绝不把私有文档中的 APIv3 Key、证书、AppID、商户号、云密钥或用户资料复制到仓库。**

## 0. 最先确认谁是真正的运行环境

| 证据 | 结果 | 意义 |
|---|---|---|
| `https://www.socthink.cn/api/subscription/provider-status` 2026-10-30 只读检查 | `provider=wechat_native;configured=true;mock_mode=false;callback_ready=true` | 旧 ThinkAI 有真实商户配置，**不是**今天新站已收款的证明 |
| `https://socthink.cn/api/release` 2026-10-30 只读检查 | `deployedSha=gitSha=5541f8b53d42d0aacc20c38173337a5d09e13d59;ok=true` | 新版确有正式部署，不能猜网页运行哪个 commit |
| 新版 `POST /api/payments/wechat/checkout` 与 `POST /api/payments/wechat/notify` | 均 HTTP **503** | **当前不能真实付款**；不能将部署、回调路由存在或 PR 通过当成付款成功 |
| 新站生产专用账本、支付密钥、商户准入 | 截至现有授权检查，未取得已生效证据 | 尚缺主账号的实际批准/支付真单/到账/权益/退款结果。先只读核查；生产写入此前被执行安全检查拦截，禁止绕过 |

### 事实等级

- `OFFICIAL_REQUIRED`：官方直接写明；按官方原文核对。
- `LEGACY_HISTORIC_SUCCESS`：旧版曾真实收款，**不代表**可原样复用旧实现。
- `CODE_PRESENT`：新代码已存在，**不代表**线上启用或官方真单成功。
- `FIX_REQUIRED`：存在具体代码与官方行为差异，必须修。
- `UNKNOWN`：缺少商户后台/生产/用户交易原始回执，禁止编造。

## 1. 微信官方 vs 旧实现 vs 当前新实现

| 序号 | 微信支付官方要求/建议 | 旧 ThinkAI（Z890） | 新版 SOCTHINK（main） | 结果/最低验收 |
|---|---|---|---|---|
| P01 | Native `POST /v3/pay/transactions/native`，传绑定商户号、AppID、唯一订单号、金额、HTTPS notify URL | `socratic_engine/services/payment_service.py` 实现 Native 下单，历史真支付 | `src/lib/wechat-native-payment.ts` 构造签名请求；`wechat-native-transport.ts` 执行 | `CODE_PRESENT`；仍要核查**原商户新网站经营场景和 AppID 绑定** |
| P02 | API v3 RSA-SHA256，签名必须对应**精确发送的 HTTP 正文** | `json.dumps(...separators=(",", ":"))` 先生成签名正文，但 `httpx.post(json=prepared.body)` 再次序列化：存在**字节不一致风险**；历史成功不证明所有版本无问题 | 新版签名/实际请求使用同一个 `bodyText` | 新版本地签名测试通过；真实商户签名成功未验收 |
| P03 | 接收微信**原始 HTTP Body** 验签，`Wechatpay-Serial` 与受信公钥匹配 | 原回调代码支持公共 Key/平台证书两种模式，曾修过 HTTP 头大小写；时间戳差异只告警 | `verifyWechatV3Notification` 大小写不敏感、检查 Key ID、时间窗口 | 新版改进；需以微信真实回调与平台公钥轮换验证 |
| P04 | APIv3 `resource` 通过 AES-256-GCM 解密，验交易 ID/金额/商户/APPID | 旧版有解密、订单/权益逻辑，但需核实真实并发边界 | 新版签名验真后解密，查本地账本、交易匹配再结算 | `CODE_PRESENT`；生产必须验证支付→权益→刷新登录 |
| **P05** | **回调应答限时约 5 秒**；超时会重试；商户应自行保证幂等与可靠处理 | 旧版创建回调日志、验签、DB 工作，无法据源码保证 5 秒 | 新版 `src/app/api/payments/wechat/notify/route.ts` **同步调用微信 GET 查单**；transport 的单次 HTTP 超时 **10000ms**，数据库工作还另耗时 | **`FIX_REQUIRED / P0`**：回调不能以超过 5 秒的网络请求为正常成功前提。改为安全的签名验收 + **durable DB 通知接收** + 立即成功 ACK，由唯一账本后台补偿/验证；在持久化失败时返回失败让微信重试。单纯调低超时**不是**完整正确方案 |
| P06 | 不能只靠通知，订单状态不明须主动查单 | 旧版可查询微信订单（布尔值 SUCCESS；金额/其他上下文检查较少） | `src/lib/wechat-native-reconciliation.ts` 使用官方签名 GET + 同一 PG `settleVerifiedOrder` | `CODE_PRESENT`，独立补单的 timer 和生产账本尚无授权上线回执 |
| P07 | Native `code_url` 过期 **2 小时**，可对同一待支付订单重新下单获取新的 URL | 老版自己设置 10 分钟最晚支付时间，QR 使用第三方生成网站 | 新版自有域名生成二维码，但 `NativeCheckoutPanel.tsx` **不显示真实 QR 过期时间、不停止展示过期码、不提供同一订单 refresh** | **`FIX_REQUIRED / P1`**：服务端保存 QR 有效期，过期停止展示；先查单防重复，再用原订单签名参数重新取 `code_url`，不能默默新建一笔订单 |
| P08 | 微信 Native 的 `code_url` 是扫码指令，前端转成二维码展示 | 旧版把整段 `code_url` 放进 `api.qrserver.com`，泄露一次性支付码给第三方 | 新版 `qrcode` 进程内生成二维码图片 | 新版明显更好；应检查图片 2h TTL、不用第三方泄露 |
| P09 | 退费申请与最终退款状态是**两个阶段**；`SUCCESS` 才是真退款；`PROCESSING/CLOSED/ABNORMAL` 含义不同 | 老实现退款业务未纳入本次生产证据 | 现有账本有 `refundVerifiedOrder`，**无完整微信官方申请、查单、退款通知到 PG 的生产 adapter** | **`FIX_REQUIRED / P0`**：先持久化申请/单号和受理状态；官方退款查单确认 `SUCCESS` 后才做权益冲正 |
| P10 | 同一个 `out_refund_no` 重试应幂等，状态不明先查单 | 旧版缺少可复用的完整证据 | 新版生产真实退款接口尚未实现 | `FIX_REQUIRED`，不得超时重试时换新退款单号 |
| P11 | 商户、AppID、Native、H5、JSAPI 与小程序虚拟支付各有产品资质 | 老站是真网站 Native，不能替代新站批准 | 新版有 `SOCTHINK_PAYMENT_SURFACE` 区分 | `UNKNOWN`：需在微信官方商户平台核对新站数字教育商品实际准入 |
| P12 | 线上需要完成订单入账、支付权益履约与对账 | 旧站 2026-06-16 存在真实付款验收记录 | 新站 PostgreSQL 同一 ledger、Web Native HTTP 路由齐全，但开关关闭 | `UNKNOWN`：需要一笔**真实合法付款**，微信商户回执、签名查询、订单 paid、权益可用、退款完成五证合一 |

**重要**：微信支付回调官方可能接受 `200/204` 等成功响应，但任何实现都必须严格处理通知身份和重复调用。不能为了加快 5 秒 ACK 而对**未验签、未持久化**通知直接应答成功。

## 2. 私有《微信支付》配置文档：字段名对照（只核键名、不复制任何值）

2026-10-30 已读取该 Google Docs 的字段名，发现其并非可直接作为当前 Node 服务的 dotenv 文件：

| 私有文档中的名称 | 当前新版服务要求的名称 | 校验边界 |
|---|---|---|
| `WECHAT_PAY_MCH_ID` | `WECHAT_PAY_MCHID` | 两者只应由受保护配置层明确映射，不复制原值到 PR |
| `WECHAT_PAY_APP_ID` | `WECHAT_PAY_APPID` | 须核实当前 Native 商户实际绑定的应用，不可把小程序 AppID 强行相等 |
| `WECHAT_PAY_MERCHANT_SERIAL_NO` | `WECHAT_PAY_SERIAL_NO` | 要与商户证书实际序列匹配 |
| `WECHAT_PAY_MERCHANT_PRIVATE_KEY_PATH` | `WECHAT_PAY_PRIVATE_KEY_PATH` | 私钥必须位于**实际运行服务器**，服务身份能读、文件权限私有 |
| `WECHAT_PAY_API_V3_KEY` | 同名 | 需长度、实际解密、商户端一致，不输出原始字符串 |
| `WECHAT_PAY_PUBLIC_KEY_PATH` | 同名；另需 `WECHAT_PAY_PUBLIC_KEY_ID` | 平台公钥≠商户私钥，公钥 ID 必须与官方响应 `Wechatpay-Serial` 匹配 |
| `WECHAT_PAY_NOTIFY_URL` | 同名 | 新站 URL 必须真实可达 `https://socthink.cn/api/payments/wechat/notify` |
| 文档未能证明当前已生效的 DB/商户审批 | `SOCTHINK_BILLING_DATABASE_URL`、独立支付标记 | 无正式 DB/用户真实支付/商户授权，仍为 `NOT_LIVE` |

**警告**：私有文档包含敏感信息和部分示例配置，不可当作“私钥肯定可用”的生产证明；勿将该文档本体复制进 GitHub，密钥应在真实目标服务器的受控 secrets 环境由授权人员执行布尔型原位核查。所有键名映射必须集中在受控配置规范，不保留第二套隐式兼容环境。

## 3. 正式调试时按证据由低到高逐步排查

- [x] 核对旧站与新站**不是同一运行环境**，且 SSH 成功入口不同。
- [x] 核对官网旧版 Native 配置状态与新版正式部署 SHA。
- [x] 对照普通商户 Native 下单、签名与回调公钥、AES-GCM、GET 查单的官方协议。
- [x] 比较用户 Google Docs 中的**配置键名**（不读取/发布其实际秘密值）。
- [ ] **P0 修回调 5 秒安全应答**：先进行有效身份验证和 durable 事件落盘，再快速 ACK，异步官方查单并在唯一 PG 结算；注入微信查单慢网、DB 写入失败、重复 callback 测试，验收 5 秒内响应和绝不误发权益。
- [ ] **P0 退款正式链**：提交退款、保存商户退款单号、查询状态、`SUCCESS` 后权益冲正；验证 PROCESSING/CLOSED/ABNORMAL 与重复请求。
- [ ] **P1 二维码 2 小时有效期**：到期停止展示，先查原订单并重新申请同一个 `out_trade_no` 的 QR；边界时钟与重复提交回归。
- [ ] 真实生产商户 Native 权限/AppID/新站经营范围的官方账户回执，备案/商品交付核对。
- [ ] 正式账本及加密备份/恢复演练，在**获正式授权**的运维渠道创建；不得绕过此前执行安全限制。
- [ ] 生产密钥/微信支付公钥 ID 本机安全检查（不打印值），确保现网 callback 与 provider GET 验签。
- [ ] 正式用户一笔**小额真实合规商品**支付，保留脱敏微信交易回执、PG paid、实际服务权益、退款最终成功和财务对账证据。

### 失败分类（调试时不要互相混淆）

| 现象 | 先检查 |
|---|---|
| `HTTP 503` 在付款 API | 正式商户/生产账本/授权开关全部默认关闭，不要猜是微信官方拒付 |
| `SIGN_ERROR` | 精确签名字节、时间/nonce、证书 serial、原始 Body，避免旧版双序列化 |
| `APPID_MCHID_NOT_MATCH` | 微信商户平台真正的绑定关系，配置笔记里的值不等于实际绑定 |
| 回调日志没有 / 未到账 | notify URL、反向代理、验签、持久化、5s 应答、独立补偿扫描 |
| 前端仍显示扫码但 2h 已过 | QR code_url TTL 与重取，订单本身时限可能另不同 |
| 申请退款显示已受理 | **不是退款成功**，查单到 SUCCESS 再冲正 |
| 网站 CI 全绿但生产旧 SHA | 已修自动发布 `FETCH_HEAD` 目标；应核公网 release SHA，不仅看分支 |

## 4. 官方原始资料（仅普通商户文档，避开服务商/合单误套用）

1. [Native 开发指引：默认订单 7 天、QR 2 小时、重取二维码](https://pay.wechatpay.cn/doc/v3/merchant/4012791891)。
2. [Native 下单 API：`code_url` 和原始返回示例](https://pay.wechatpay.cn/doc/v3/merchant/4012791877)。
3. [商户订单号查单 API](https://pay.wechatpay.cn/doc/v3/merchant/4012526919)。
4. [API v3 签名/验签工具与规范](https://pay.wechatpay.cn/doc/v3/merchant/4012365352)。
5. [支付通知：5 秒应答、重试与不能只依赖通知](https://pay.wechatpay.cn/doc/v3/merchant/4012166360)（此页面为合单场景，应继续核对普通商户 Native 实际通知页面；此处只引用其共通超时机制）。
6. [官方普通商户退款开发指引，更新 2026-10-13](https://pay.wechatpay.cn/doc/v3/merchant/4013071031)。
7. [按商户退款单号查询真实最终状态](https://pay.wechatpay.cn/doc/v3/merchant/4012791884)。

## 5. 维护机制

今后修改支付代码或官方文档发生变更时，应先更新**这一份**对照矩阵及相关自动回归，不另建相似的第二份表格。任何状态升级需粘贴**脱敏原始回执的证据标识**：明确 commit SHA、官方文档更新时间、测试结果、生产部署时间、实际商户交易及查询回执。**没有证据，状态只写 UNKNOWN/NOT_LIVE。** 与 [EngineeringOS 跨项目访问规范](https://github.com/star8592/EngineeringOS/blob/main/docs/operations/CROSS_PROJECT_ACCESS_AND_AUTH_LESSONS.md) 共用同一套登录防误判规则。
