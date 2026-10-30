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
5. [普通商户 API v3 支付成功回调通知：5 秒应答、200/204、推荐异步后处理](https://pay.wechatpay.cn/doc/v3/merchant/4013070368)（APP 支付品类页面，说明 API v3 普通商户统一回调处理流程）。
6. [官方普通商户退款开发指引，更新 2026-10-13](https://pay.wechatpay.cn/doc/v3/merchant/4013071031)。
7. [按商户退款单号查询真实最终状态](https://pay.wechatpay.cn/doc/v3/merchant/4012791884)。

## 5. 对照后的代码整改优先级（给联调人员）

**第一轮 P0**：把新站 `POST /api/payments/wechat/notify` 的签名验证与持续 10 秒的远程 GET 查单解耦。官方普通商户回调示例明确：验签后返回 200/204，业务逻辑推荐异步；我们仍须确保完成可恢复持久化（订单收款安全关键场景），数据库失败则返回非成功响应，不能仅内存 `setTimeout`。验收模拟官方 GET 10 秒超时，微信回调须在 5 秒内有可确定的应答，并且真实数据库故障不得 ACK 成功。

**第二轮 P0**：微信退款正式申请→持久化 `out_refund_no`→按官方接口查询 `PROCESSING/SUCCESS/CLOSED/ABNORMAL`→仅最终 `SUCCESS` 冲正权益。官方最新 2026-10-13 退款指引，资金受理不能冒充到账。退款相关任何测试都不得触及真实商户未授权账户。

**第三轮 P1**：对 Web Native `code_url` 实际 2 小时 TTL 进行前端时钟测试、状态查询和同商户订单号重取，而不是旧版硬编码 10 分钟或者二维码永久展示。

## 6. 维护机制

今后修改支付代码或官方文档发生变更时，应先更新**这一份**对照矩阵及相关自动回归，不另建相似的第二份表格。任何状态升级需粘贴**脱敏原始回执的证据标识**：明确 commit SHA、官方文档更新时间、测试结果、生产部署时间、实际商户交易及查询回执。**没有证据，状态只写 UNKNOWN/NOT_LIVE。** 与 [EngineeringOS 跨项目访问规范](https://github.com/star8592/EngineeringOS/blob/main/docs/operations/CROSS_PROJECT_ACCESS_AND_AUTH_LESSONS.md) 共用同一套登录防误判规则。

## 2026-10-30 微信官方现行配置核对（以网页原文为准）

本节直接核对普通商户官网当日可见的版本与设置路径，不把旧 Google Docs 的变量名误认为微信官方 API JSON 参数。官网页面**更新时间分别不同**：开发必要参数说明 **2026-10-13**、Native 开发指引 **2026-06-09**、退款开发指引 **2026-10-13**、微信支付公钥介绍 **2026-05-20**、APPID 绑定指引 **2025-10-28**、经营场景管理 **2026-02-05**；不能仅凭首页“最新”自动认定接口全部改变。

| 类别 | 官方实际字段或路径 | 当前实现/待修 |
|---|---|---|
| 商户身份 | `mchid`、与该商户号绑定的 `appid`；商户平台「账户中心 → 商户信息」「产品中心 → APPID账号管理 → 我关联的APPID账号」 | Node 环境键名自行约定 `WECHAT_PAY_MCHID/WECHAT_PAY_APPID`；旧私有笔记写 `WECHAT_PAY_MCH_ID/WECHAT_PAY_APP_ID`，**必须映射一次，不能混用**；新站产品权限尚未获得商户后台回执 |
| API v3 私钥签名 | 请求 `Authorization: WECHATPAY2-SHA256-RSA2048 ... serial_no=<商户API证书序列号>`；商户 API 证书**私钥**签名原始 HTTP 报文 | 当前代码签名原始 JSON 正文；切勿把商户证书序列号误作微信公钥 ID |
| API v3 解密 | `APIv3 Key` 32 个字符，商户平台「账户中心 → 账户设置 → API安全 → 解密回调 → APIv3密钥」；**不支持查看已设密钥，只能重新设置** | 用于 AES-GCM 回调密文解密，不是 Authorization 签名私钥，也不是 APIv2 Key；切勿盲目重置影响旧站真实收款 |
| 微信支付公钥验签（官方推荐） | 商户平台「账户中心 → API安全 → 微信支付公钥 → 管理公钥」获取 PEM + `PUB_KEY_ID_...`；响应/回调 `Wechatpay-Serial` 指明对应公钥 | 新版只支持单公钥 ID 进行验签；若商户仍在平台证书/公钥灰度切换，必须先核实官方实际模式，不能擅自切换影响旧站 |
| **请求微信公钥模式的关键 Header** | **`Wechatpay-Serial: PUB_KEY_ID_...`**；官方 FAQ 明确该请求头影响**应答验签模式**，并举 GET 示例 | **新 `wechat-native-transport.ts` 当前遗漏此请求头，P0：即使有正确公钥文件，也可能收到平台证书签名的合法应答而验签拒绝；必须修复并增加断言** |
| Native 下单 | `POST /v3/pay/transactions/native`，`appid`、`mchid`、`description`、`out_trade_no`、`notify_url`、`amount.total`、`amount.currency`；`time_expire` 可指定订单截止 | 订单号须每商户唯一，金额必须来自账本；新站不把小程序 APPID 强行等同网站 APPID |
| 支付有效期 | 默认订单支付期限 7 天；`code_url` 仅 **2 小时**；过期可用**原下单参数**重新下单获取新二维码 | 当前前端尚缺倒计时/订单状态保护/同单刷新，应修 |
| 回调应答 | 验签后应返回 200/204；**超时 5 秒会重试**；官方建议业务异步处理，不能仅靠回调 | 当前先同步 GET 官方订单再回复，GET 最高等 10 秒，违反可靠性目标；必须先验签并持久化再 ACK，恢复任务使用同一 PG 账本 |
| 退款 | 请求受理 ≠ 退款成功；`PROCESSING/SUCCESS/CLOSED/ABNORMAL` 处理分离，同一 `out_refund_no` 超时重试不能换号；退款默认 365 天期限 | 正式退款 adapter 和最终确认、权益冲正未实现；不能称正式收款闭环 |
| 经营场景 | 商户平台「账户中心 → 经营场景管理 → 添加场景」，检查新的线上教育数字商品场景和实际商户主体 | 需持有人登录商户后台才能得到**该账号**的授权回执；公开文档不能代替商户后台实际批准 |

### 本节官方原始页面（2026-10-30 访问）

- 开发必要参数（2026-10-13）：https://pay.wechatpay.cn/doc/v3/merchant/4013070756
- Native 下单：https://pay.wechatpay.cn/doc/v3/merchant/4012791877
- Native 开发指引（2026-06-09）：https://pay.wechatpay.cn/doc/v3/merchant/4012791891
- 微信支付公钥介绍（2026-05-20）：https://pay.wechatpay.cn/doc/v3/merchant/4012153196
- 微信支付公钥 FAQ——**Wechatpay-Serial 请求头与灰度**：https://pay.wechatpay.cn/doc/v3/merchant/4013038816
- 公众号/小程序 APPID 绑定管理（2025-10-28）：https://pay.wechatpay.cn/doc/v3/merchant/4016328613
- 经营场景管理（2026-02-05）：https://pay.wechatpay.cn/doc/v3/merchant/4017312501
- APIv3 密钥配置：https://pay.wechatpay.cn/doc/v3/merchant/4012072195
- 普通商户支付成功回调（含 Native，5 秒）：https://pay.wechatpay.cn/doc/v3/merchant/4013070368
- 退款开发指引（2026-10-13）：https://pay.wechatpay.cn/doc/v3/merchant/4013071031

**当前判断：** 核心 API 名称没有凭空发生全面替换；新版最突出参数差异是公钥应答头缺失、旧笔记的环境变量别名差异、商户后台关联/公钥灰度状态缺乏实证。以上不是对私有文档敏感字段的披露，也不是操作商户后台。

## 2026-10-30 微信支付已登录商户后台实测（不含任何敏感值）

经用户明确授权，在 Z890 既有 Chrome 会话实际进入 `pay.weixin.qq.com`，只读查看对应菜单，未操作产品开通、删除/关联 APPID、编辑授权目录、商户密钥或交易资金。

| 真实后台位置 | 当日实际显示 | 与 SOCTHINK 的关系 |
| --- | --- | --- |
| 产品中心 → 产品大全 → 已开通 | 全部 36 项；已开通 4、未开通 32、申请中 0、已关闭 0；已开通 **Native 支付、JSAPI 支付、刷脸支付、自动提现**；H5/APP 支付未开通 | **PC Native 商户级支付产品已开通**，无需再次申请；但不等于新站已获得经营场景准入、部署密钥或真实收款 |
| 产品中心 → AppID账号管理 | 服务号「青梧索思」**已关联**；小程序「智量巧算」**已失效** | 小程序支付不能基于失效关联直接启动；失效原因尚未获可靠解释，不能擅自删除/重绑；网页 JSAPI 可核对仍有效的服务号 |
| 产品中心 → 开发配置 → JSAPI 支付授权目录 | **暂无数据**，页面提示最多 5 个 | JSAPI 产品权限虽已开通，微信内网页仍缺支付授权目录，尚不能声称 JSAPI 调起能力已具备。参见官方 [JSAPI 配置指引](https://pay.wechatpay.cn/doc/v3/merchant/4013287088) |
| 产品中心 → 开发配置 → Native 支付回调链接 | **暂无数据** | 不得直接判定 APIv3 Native 不可用；普通商户 APIv3 的 `notify_url` 由下单接口逐笔传入，必须独立验证新站实际回调 URL。参见官方 [支付成功回调通知](https://pay.wechatpay.cn/doc/v3/merchant/4013070368) |
| 产品中心 → 开发配置 → 云闪付 | **已开启** | 本轮不扩展到云闪付支付 |
| 账户中心 → API安全/经营场景管理 | 已进入相关入口，但浏览器只读语义快照未能读取实际详情 | **UNKNOWN**：微信公钥/平台证书切换模式、公钥 ID 状态、该站经营场景审核结果，不能由公开文档或旧站推断 |

### 应用于实际网站的决策

1. 更新工程任务中“商户 Native 产品未开通”的误判：**已开通的是产品权限**，不是所有生产收款前置条件。
2. 新站支付仍须使用经商户后台确认有效绑定的 APPID；不能将已失效小程序 APPID 硬编码到支付配置，亦不能将商户号/AppID 完整值写入 GitHub。
3. JSAPI 产品已开，但缺授权目录，故微信内网页支付不可直接宣布上线；PC Native 与 JSAPI 必须分开验收。
4. 不得为清空的后台 Native 回调设置盲目修改老服务；新站 APIv3 按每笔下单的 HTTPS `notify_url` 实测真实微信通知及查单。
5. **保持新站收款开关关闭**，直到生产 PG、密钥、正式经营准入、实际合法可交付 SKU、真单资金和权益/退款均有回执。此核查没有启动任何实际收款。

本节为商户账号实时界面的**脱敏状态记录**，非微信支付公开文档中的通用结论；后续状态变化必须重新进入商户后台查证。
