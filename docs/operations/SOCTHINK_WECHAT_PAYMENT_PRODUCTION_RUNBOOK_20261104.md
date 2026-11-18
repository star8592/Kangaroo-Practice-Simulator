# SOC THINK / Math 微信登录、Native 支付与数字交付生产手册

> **长期技术基线 v1.0｜2026-11-04（北京时间）**  
> 代码仓库：`star8592/Kangaroo-Practice-Simulator`；正式发布分支：`main`。  
> 正式站：**https://socthink.cn**；正式购买：Web 微信 **Native 扫码支付**。  
> 真单验收时线上 SHA：`3f1fc014f98202d87843fd48b17de6cb7472145b`（发布会变化，每次执行前重新检查 `/api/release`）。  
> **稳定性原则：** 后续 Math/K12/竞赛/测评/资料商城界面可以彻底重构；但同一微信买家身份、正式商户身份、统一 PostgreSQL 交易账本、支付通知及主动查单、权益和私有交付文件不得重新造一套，也不能因换新版页面丢失。  
> **状态定义：** 已有新站真实 ¥2.99 付款、订单 `paid`、权益记录和真实文件 HTTP 200；公开付款开关已启用。不能据此宣称其他微信支付产品（H5、JSAPI、小程序虚拟支付）或每个商品都单独完成真实交易验收。

## 0. 当前生产事实：先读这一节，避免使用过期文档

本手册引用生产服务器、微信登录网站页面、PostgreSQL 账本和 Nginx 访问日志的真实检查结果。旧文件 `ops/payment/PRODUCTION_ACTIVATION.md`、`docs/engineering/WECHAT_NATIVE_PRODUCTION_UNLOCK_20261031.md` 等保留了当时的“未开通”历史阶段，**不能拿那些文字覆盖最新生产状态**。

| 检查项 | 2026-11-04 实际结果 | 结论范围 |
| --- | --- | --- |
| 正式域名 | `socthink.cn` 首页、商城、商品页 HTTP 200；`www.socthink.cn` 308 转主站 | 仅新站 Web |
| 实际新旧商户凭据匹配 | MCHID、支付 AppID、商户证书序列号 SHA-256 指纹一致；商户私钥公钥与旧站商户证书匹配 | 未公开任何凭据 |
| 正式交易 | 商品 `socthink_integer_patterns_2026_batch01`，人民币 299 分（¥2.99），`wechat_native`，数据库 `state=paid` | 一笔真实交易 |
| 时间证据 | 订单创建 `2026-11-04 00:18:08`（北京时间附近；取服务端原始记录为准） | 非推测 |
| 权益 | `billing_item_entitlements` 有 1 条已购权益，账号页显示“已付款”、允许下载 | 同一买家 |
| PDF 交付 | Nginx 记录 3 次 `GET /api/resources/download/...` 为 HTTP 200，每次响应 198,178 字节，恰好等于对应 `billing_resource_assets.size_bytes`；源代码交付前校验完整 SHA-256 | 不等于验证了各手机实际文件落盘 |
| 商品库存 | 13 个可售 `item` 的 `enabled/rights_approved/delivery_verified/access_restricted` 均为真，另有 2 个未启用 | 需逐项复核授权、文件 |
| 公众收款 | `SOCTHINK_WEB_NATIVE_PAYMENTS_ENABLED=1`；`SOCTHINK_WECHAT_NATIVE_RECONCILIATION_ENABLED=1`；临时单账号试付 drop-in 已删除 | 公开 Native 收款 |
| 游客边界 | 普通游客商品页“微信登录后购买”；匿名 `POST checkout`、`GET paid resource` 均 HTTP 401 | 不是绕过身份的匿名购买 |
| 后台自动补单 | `socthink-wechat-reconcile.timer` 运行，最近 oneshot 为成功；空队列 `scanned=0 failed=0` 正常 | 历史一笔交易和持续状态分开 |
| 尚需长期复验 | 商户后台结算/资金对账、每个 SKU、移动端使用体验、独立备份恢复与证书轮换 | 不谎报这些已完成 |

**本轮真正根因之一：** 新站曾设置 `SOCTHINK_WEB_NATIVE_PAYMENTS_ENABLED="0"`，导致用户看到“微信支付尚未开放”，不是商户号全部失效。先进行单买家真金白银验收，再打开公开收款；之后已清理所有 pilot 覆盖。禁止以后部署时重新把开关写回 0，或引入并行账本。

## 1. 生产结构、域名与不变边界

```text
访客 / Math 新 UI / 竞赛 / 测评 / 数字商城
  │
  ├─ /login → 微信网站二维码或微信内官方 OAuth
  │             → 官方身份 → 唯一网站买家账号 + 安全 Cookie
  │
  ├─ /shop/[productId] → 服务端商品、真实售价/版权/交付检查
  │                            ↓ 主动确认数字商品销售规则
  │                  POST /api/payments/wechat/checkout
  │                            ↓
  │                 微信 APIv3 Native → 本站生成付款二维码
  │                            ↓
  │                 用户用微信扫码真实付款
  │                            ↓
  ├─ 官方支付通知 POST /api/payments/wechat/notify
  │      原始报文验签 / AES-GCM 解密 / 金额商户身份核对 / 证据持久化
  │                            ↓
  └─ 唯一 reconcile worker → 官方签名查单 → 一份 PostgreSQL 账本
                                      ↓
                            paid + 一次性权益记账
                                      ↓
                /account → 已付订单 → 私有 PDF / 权益 / 服务
```

这是**单一账号、单一账本、多业务界面**模型。前端可换 Vue/React/Next、视觉样式、题库与路由，但后端契约和已售资源 ID 必须保持。绝不能把微信**登录二维码**误用为**付款二维码**，也不能把微信**网站授权 AppID**、**小程序 AppID**、**Native 商户绑定 AppID**视为必然相等。

现行公开主域名 `https://socthink.cn`；`https://www.socthink.cn` 是历史旧 ThinkAI 入口并已跳转；二者曾部署于不同服务器。旧 ThinkAI 于 **2026-06-16** 曾有真实 Native 扣款、回调与修复后的 `pending→paid` 验收记录，但**旧站账户和订单不能当作新账本订单**。切换 DNS/跳转不等于微信支付迁移。

生产：Nginx → 本地 Node/Next.js；正式 systemd `socthink-math.service` 由 `95-immutable-runtime.conf` 指向 `/opt/socthink-releases/current`（当前是不可变构建目录的软链接）。仓库工作树 `/opt/socthink-math` **不是**线上执行代码的唯一依据，绝不可仅凭修改源目录宣布上线。

只读检查命令：

```bash
getent ahostsv4 socthink.cn
curl -fsSI https://socthink.cn/
curl -fsSI https://www.socthink.cn/
curl -fsS https://socthink.cn/api/release | head -c 400
systemctl is-active socthink-math.service
readlink -f /opt/socthink-releases/current
systemctl cat socthink-math.service | grep -E '^WorkingDirectory=|^EnvironmentFile='
```

## 2. 微信扫码登录：新版 Math 必须完整保留

**前台固定逻辑：** 一个微信号就是一个用户账号；首次扫码自动注册，复访恢复旧账号；购买、考试、下载、学习记录使用同一买家 ID。不得重新增加“创建家长→添加孩子→学生 PIN→才能买单”的客户障碍。

- **电脑扫码登录：** `/login` → `POST /api/auth/parent/wechat/qr` 签发 `ticket,state,expiresAt` → **微信官方网站应用 QR Connect** → `GET /api/auth/parent/wechat/callback` → `GET /api/auth/parent/wechat/qr/status` 获取一次性的认证结果并设置安全 Cookie。
- **微信内授权：** `GET /api/auth/parent/wechat/start`（真实微信端）→ 公众号网页 `snsapi_base` / 配置允许的 OAuth → `/api/auth/parent/wechat/callback` → 安全的站内 `next` 目标。
- **账户数据：** `src/lib/parent-auth.ts`；当前保存于独立持久化 `parents.json`，生成稳定 `par_<18位hex>` 标识。旧数据库列 `payer_parent_id` 是**内部兼容别名**，不代表必须显示“家长/监护人”。
- **会话 Cookie：** `socthink_parent_session`，签名 token、HttpOnly、HTTPS、SameSite，30 天 TTL，服务端复核 `active/sessionVersion`；退出/撤销失效，不能凭客户端自称 paid 或任意 UID 放行。
- **扫码票据：** `src/lib/wechat-qr-login.ts`，5 分钟 TTL、HMAC 摘要、一次消费；持久化 `wechat-qr-login.json` 和 `wechat-qr-login-secret.txt`。两份秘密和用户文件都不能在发布时新建空文件覆盖原值。
- **账号数据目录：** `SOCTHINK_USER_DATA_DIR`；未显式配置则为 `<运行工作目录>/private/users`；正式不可变 release 使用持久化 `private` 映射，部署必须保持。
- **微信身份隔离：** `WECHAT_WEBSITE_APPID/SECRET`（网站二维码）、`WECHAT_OPEN_APPID/SECRET`（公众号网页）、`WECHAT_MINIAPP_APPID/SECRET`（小程序）、`WECHAT_PAY_APPID`（Native 商户应用）必须分别识别。跨不同 AppID 的 OpenID 不可凭昵称/头像硬合并；若官方可验证 UnionID/绑定手续再做专门可回滚迁移。

微信登录主要源码：
`src/lib/wechat-parent-auth.ts`、
`src/lib/parent-auth.ts`、
`src/lib/wechat-qr-login.ts`、
`src/app/api/auth/parent/wechat/{qr,qr/status,start,callback}/route.ts`（以实际目录为准）。
登录/订单接口必须在新 Math 架构中保留或提供等价兼容网关，不能让老用户重新建号。

## 3. 配置：正式服务的唯一真实来源，严禁把值放 GitHub

服务器经过核实的关键**环境文件及 systemd 映射**：

| 受保护文件 / 位置 | 职责 |
| --- | --- |
| `/etc/socthink-math-wechat.env` | 网站微信扫码、公众号 OAuth、小程序相关 AppID/Secret、回调域名和登录模式；对应 `30-wechat-auth.conf` |
| `/etc/socthink-math-billing.env` | `SOCTHINK_BILLING_DATABASE_URL`；对应 `40-billing.conf` |
| `/etc/socthink-math-payment.env` | Native 商户号、支付 AppID、序列号、APIv3 Key、私钥和微信公钥引用、回调、三个开关；对应 `55-native-merchant.conf` |
| `/etc/socthink-native-keys/` | 受保护商户私钥与微信支付公钥（最终以 env 中绝对路径为准） |
| `SOCTHINK_DIGITAL_FILES_DIR` | 私有已售文件目录：**必须**独立于 web `public` 和可替换构建目录 |
| `SOCTHINK_USER_DATA_DIR` / release `private/users` | 微信用户账号、签名密钥和二维码票据，跨版本持久化 |
| `/etc/systemd/system/socthink-math.service.d/` | 当前包含 `30-wechat-auth`、`40-billing`、`55-native-merchant`、`95-immutable-runtime` 等，重新部署前核对具体文件 |

凭据清单**只记录键名/含义**，不要记录原值：

```dotenv
# 本段是变量名规范，不是能粘贴执行的真实密钥文件
WECHAT_LOGIN_MODE=<official_account 或 website，依据微信授权场景>
WECHAT_CALLBACK_ORIGIN=https://socthink.cn
WECHAT_WEBSITE_APPID=<保密>
WECHAT_WEBSITE_SECRET=<保密>
WECHAT_OPEN_APPID=<保密>
WECHAT_OPEN_SECRET=<保密>
WECHAT_MINIAPP_APPID=<小程序独立配置>
WECHAT_MINIAPP_SECRET=<保密>

SOCTHINK_BILLING_DATABASE_URL=<保密、独立 PostgreSQL>

PAYMENT_PROVIDER=wechat_native
SOCTHINK_PAYMENT_SURFACE=web-native
SOCTHINK_PUBLIC_ORIGIN=https://socthink.cn
SOCTHINK_WECHAT_NATIVE_PRODUCT_APPROVED=1
SOCTHINK_WECHAT_NATIVE_RECONCILIATION_ENABLED=1
SOCTHINK_WEB_NATIVE_PAYMENTS_ENABLED=1
WECHAT_PAY_APPID=<当前 Native 商户已绑定应用>
WECHAT_PAY_MCHID=<正式商户号>
WECHAT_PAY_SERIAL_NO=<商户证书序列号>
WECHAT_PAY_PRIVATE_KEY_PATH=<受保护绝对路径>
WECHAT_PAY_PUBLIC_KEY_PATH=<微信支付公钥绝对路径>
WECHAT_PAY_PUBLIC_KEY_ID=<PUB_KEY_ID_...>
WECHAT_PAY_API_V3_KEY=<高敏、32字节>
WECHAT_PAY_NOTIFY_URL=https://socthink.cn/api/payments/wechat/notify
```

**RSA/公钥模式别搞混：** 商户私钥+证书 serial 为请求签名；**微信支付公钥**+`PUB_KEY_ID_...` 用于微信响应和回调验签；APIv3 Key 用于通知资源 AES-GCM 解密。原始 PEM、密钥、token、数据库 URL、微信订单的敏感明文不进入 Chat、Git、日志或任何公开监控。

**已查明的诊断差异：** `scripts/check_wechat_pay_readiness.mjs` 的静态预检额外假定“私钥同目录有 `apiclient_cert.pem`”，因此现场曾返回 `CERT_UNREADABLE`；然而实际运行模块 `src/lib/wechat-native-credentials.ts` 在公钥模式下只读取私钥、微信公钥和参数，且**已发生 ¥2.99 真实收款**。不要把这个预检误差视作商户失效或以重置私钥处理。后续可以让检查器匹配真实运行合同，或由受权人员规范存放已核实的非敏感商户公钥证书文件，不能覆盖私钥。

### 支付开关：这是两条不同的控制线

| 开关 | 用途 | 生产 |
| --- | --- | --- |
| `SOCTHINK_WECHAT_NATIVE_PRODUCT_APPROVED` | 运营对商户 Native 准入的状态标记（**不是**实时微信官方接口回执） | `1` |
| `SOCTHINK_WECHAT_NATIVE_RECONCILIATION_ENABLED` | 已付订单的通知验真、官方查单与结算权益 | `1`，**停新单时仍维持** |
| `SOCTHINK_WEB_NATIVE_PAYMENTS_ENABLED` | 允许普通访客登录后创建新 Native 订单 | `1`；紧急止损切换 `0` |

2026-11-04 的试付曾短暂启用 `SOCTHINK_WECHAT_NATIVE_PILOT_*` 仅指定买家/指定 SKU；**已移除 `56-native-pilot.conf` 和试付 env 声明**。恢复备份时不要把它又带回正式环境。

## 4. 业务 API 合同：Math 新 UI 必须复用

| 行为 | 现有路径 | 授权或结果 |
| --- | --- | --- |
| 用户确认商品购买 | `/shop/[productId]`，`/membership` 或对应测评/考试入口 | 服务端商品信息与售价、明确购买规则 |
| 创建订单 | `POST /api/payments/wechat/checkout` | 必须微信正式登录、同源 Origin、正确商品 SKU、规则已确认 |
| Native 扫码 | 上述 checkout 成功时返回给本人的二维码数据和订单 ID | 后台官方签名下单 `/v3/pay/transactions/native` |
| 微信真实通知 | `POST /api/payments/wechat/notify` | **微信签名验真**，无需网站 Cookie；成功持久记证据后 HTTP 204 |
| 查本人订单 | `GET /api/payments/wechat/orders/[orderId]` | 同一微信买家，不允许查看他人订单 |
| 我的账号 | `/account` | 订单状态、已购权益、商品交付 |
| 下载数字商品 | `GET /api/resources/download/[resourceId]` | 已登录且具备**当前资源**真实购买权益；匿名 401，未购 403 |

**准入订单：**
1. 服务器读 `billing_products` 的 `product_id`、`amount_minor`（分）、CNY、`enabled`；数字单品要求 `rights_approved`、`delivery_verified`、`access_restricted` 都为真，文件元数据/实际哈希与交付路径成立。
2. 客户须主动确认销售政策 `DIGITAL_SALES_POLICY_VERSION`；不默认勾选。前端传价格、用户名、商户或 `paid=true` 一律不可信。
3. 同一 `billing_orders` 创建 `pending`、检查同买家同商品待付款/已购约束、限制未支付并发单量；依据 Native 订单截止时间生成短时二维码。
4. 签名调用**微信官方** APIv3；`src/lib/wechat-native-transport.ts` 必须验证响应签名并检查 `weixin://wxpay/bizpayurl...` 格式，付款二维码用本服务本地 QR 渲染，不调用第三方 QR 服务。
5. 浏览器只能**轮询**订单，不能用“付款成功”前端提示自己授予权益。

**微信通知：**
- 使用原始请求体校验 RSA-SHA256 和微信支付公钥 ID，兼容 HTTP 请求头大小写；
- 校验时间窗口、`TRANSACTION.SUCCESS`、`encrypt-resource`、AES-256-GCM、商户号、AppID、订单号、金额/币种、交易号；
- 在账本上**原子持久记录已核验通知**，尽快返回 HTTP 204；非授权/伪造返回 401，DB 故障返回非成功，交由微信重试；
- **不**在回调 HTTP 五秒窗口里执行远端 10 秒查单并发权益。

**唯一后台查单补偿：**
- `socthink-wechat-reconcile.timer` → `socthink-wechat-reconcile.service` → 编译后的 `scripts/reconcile_wechat_native_orders.cjs`；
- 读取待付订单，带锁与重试冷却，调用微信官方**带签名 GET** 查询；校验成功且订单/商户/AppID/金额一致才通过既有原子结算函数转 `paid` 并发一次权益；
- 重复通知、重复 worker 重试、断网都不能制造重复扣款/重复权益；
- 未付订单已过期时按官方查单/签名关单/再次确认 `CLOSED` 流程，不能只凭本地时间立即释放防重复购买槽位。

源码入口：`src/lib/wechat-native-{flags,credentials,payment,transport,reconciliation}.ts`、`src/lib/billing-ledger.ts`、`src/app/api/payments/wechat/{checkout,notify,orders}`、`src/app/membership/NativeCheckoutPanel.tsx`。

## 5. 数据主库：绝不能因改版重建

生产使用独立 PostgreSQL 16 账本，唯一连接 `SOCTHINK_BILLING_DATABASE_URL`。曾实际查得 10 张核心 billing 表：

```text
billing_orders                 交易事实与状态
billing_payment_events         交易事件
billing_products               SKU、分价、权益及交付状态
billing_entitlements           通用服务/套餐权益
billing_item_entitlements      单品权益
billing_resource_assets        私有商品文件的哈希和元信息
billing_access_audit           访问审计
billing_usage_buckets          次数额度
billing_usage_events           使用事件
billing_family_links           历史兼容关联（不是前台新增家庭流程）
```

现有仓库 `ops/db` migrations（按最新代码实际可用文件，不等于所有生产版本均已执行）：

```text
001_billing_entitlements.sql
002_wechat_reconciliation.sql
003_native_notification_inbox.sql
004_item_purchases.sql
005_digital_resource_delivery.sql
006_unique_active_item_orders.sql
007_native_close_proof.sql
008_digital_sales_consent.sql
009_assessment_report_rights.sql
010_career_interview_service_sessions.sql
011_career_monthly_and_per_use.sql
```

**发布要求：** 对已存在生产库先加密备份并隔离恢复，然后只读比较 schema 和版本，再做审查后的增量 migration。绝不能重新运行“首次建库”命令覆写已有用户账本；`ops/payment/provision_billing_postgres.py --check` 是只读检查，`--apply` 只适用于明确授权、无存量的新环境。不要在 `npm build`、GitHub CI、定时发布中偷偷重建付费库。

**稳定主键：** `account_id`、`product_id`、`resource_id`、`content_id`、`order_id` 不能因 Math 重构重编号；历史已售商品可以停售，但不得删订单、抹余额或丢失已购 PDF。报告/服务次数/订阅应复用统一账本权益层，可加兼容扩展但不能写第二套 `paid` 状态机。

## 6. 数字资产交付：私有存储 + 每次 SHA-256 验真

`SOCTHINK_DIGITAL_FILES_DIR` 指向**持久、私有、绝对路径**，不在 Git `public/`、构建 release 或临时容器层。文件以摘要存放：

```text
<SOCTHINK_DIGITAL_FILES_DIR>/
  <SHA256 前两位>/
    <完整 64 位 SHA256>.bin
```

`billing_resource_assets` 保存 `resource_id`、`sha256`、`size_bytes`、`file_name`、`mime_type`、`rights_approved`、`delivery_verified`。最大单文件 100 MiB，后台核查真实文件路径、合法授权、文件大小与摘要，下载时重新验证大小和完整 SHA-256，使用 `O_NOFOLLOW` 防符号链接替换。HTTP 响应 `Content-Disposition: attachment`、`private no-store`、`nosniff`。

新商品必须真实拥有可销售权限（原创或取得合法商业分发权）；**公开取得/可下载不等于可转售**。修改已售内容须建立新版本资源 ID，不能静默替换旧 SHA-256，导致旧买家无法获取当时购买的文件。

销售规则：数字内容交付/开通后不提供普通无理由退款选项；**法定**交付失败、重大不符、重复扣费等异常由受权人工处理，不能依靠“不退款”条款剥夺法定救济；不开发用户自助退款按钮作为收款前置工程。

## 7. 发布、部署、回滚：新 Math 只换前端，不换收款

**正式代码路径：** GitHub `main` → 运行测试 / CI → 预构建不可变 release → 软链接 `/opt/socthink-releases/current` 原子切换 → `socthink-math.service` → Nginx 公网检查。正式部署脚本在 `ops/release/`：`build_prebuilt_runtime.sh`、`publish_prebuilt_socthink.sh`、`auto_deploy_server.sh`；生产 `socthink-auto-deploy.timer` 执行现有唯一自动发布入口。部署文档 `ops/release/SOCTHINK_DEPLOYMENT.md`。

**每次发布的固定操作票：**

1. 记下当前 `/api/release` SHA、当前 `current` 指向和正在运行的 PID；保存可回退的上一版，不保存凭据明文。
2. 检查 PostgreSQL/微信登录持久化/私有文件目录的完整备份和**隔离恢复能力**；新 migration 先走审计。
3. 用隔离测试库运行新增 Math + 微信登录 + 付款专项单测，避免连接生产资金库。
4. 仅替换 GitHub 构建后的 UI 或扩展兼容 API；**禁止**在发布时修改生产商户号、APIv3 Key、旧账号、账户签名密钥、老订单 ID、数字内容 SHA。
5. 发布原子切换后验证 `/api/release`、主页、`/shop`、商品详情、登录和未登录的 401/403 边界。
6. 在同一微信账号重新登录，核对**历史已付订单仍可见、历史下载仍为 200**。如果支付底层变了，再做受控小额真实新单；纯 UI 改版不制造不必要的重复付款。
7. 出现异常，**先关闭新单开关，但维持后台结算**，再切回已验收 release 和匹配数据 schema；恢复后重新查单，不能靠删除 pending 订单解决。

**只读诊断：**

```bash
systemctl list-timers --all --no-pager | grep socthink
systemctl is-active socthink-math.service
systemctl is-active socthink-wechat-reconcile.timer
readlink -f /opt/socthink-releases/current
curl -fsS https://socthink.cn/api/release
curl -fsSI https://socthink.cn/shop
```

**变更安全做法：** 生产 env 在 root 受控权限（通常 0600）下先做私有备份，再单项切换开关，通过 `systemctl restart socthink-math.service` 重载；如果不能返回公网 200 / 服务运行正常，立即恢复原配置与原 release，保留对应订单与补单服务。禁止用 `cat /etc/...env` 把原始密钥贴到聊天或日志；只记录变量名与开关真假。

## 8. 备份、恢复与最小权限

生产已经有四项定时器：`socthink-auto-deploy.timer`、`socthink-wechat-reconcile.timer`、`socthink-billing-backup.timer`、`socthink-verified-backup.timer`。与具体部署有关的服务文件可通过 `systemctl cat <unit>` 检查。

至少备份四类数据，保留恢复密钥于独立受控位置：
1. **专用 PG 账本**：商品、订单、事件、权益、用户映射、版本迁移；加密数据库备份和隔离库恢复。
2. **私有数字资料**：已售文件及完整 hash 索引；不能只备份数据库中的路径。
3. **微信网站账号**：持久 `private/users`、`parents.json`、`wechat-qr-login.json`、各签名密钥，不能发布时重置。
4. **商户和 DB 的秘密材料**：加密、最小权限、异地；**不能**作为普通仓库或未加密压缩包公开备份。

运行状态检查：

```bash
systemctl show socthink-wechat-reconcile.service -p Result -p ExecMainStatus
journalctl -u socthink-wechat-reconcile.service -n 30 --no-pager
journalctl -u socthink-billing-backup.service -n 25 --no-pager
journalctl -u socthink-verified-backup.service -n 25 --no-pager
```

补偿日志只显示匿名聚合计数，例如 `{"scanned":0,"settled":0,"closed":0,"notPaid":0,"failed":0}`；**0 不代表故障**，但 `failed>0`、多轮 pending 未结算、已付无权益和无法下载应报警。不同的定时任务不要复制成 cron / GitHub Actions 第二个 worker，防止并发修改同一资金状态。

**灾备顺序：** 冻结新单→隔离恢复账本+文件+账号+签名密钥→部署兼容 release→核对 OAuth、订单、SHA-256、微信公钥→恢复仅旧单结算→查官方状态→逐项验证后才恢复新订单。绝不能“只恢复了代码”就宣称收费恢复。

## 9. 事故处理手册

**A. 页面显示“微信支付尚未开放”：** 核对真正运行进程的公开开关是否还是 0；然后看结算开关、商户审批标记、真实 SKU 和登录态；不要只看 `/api/access/me` 的 `policyMode=preview`——它可能仅表示套餐权限预览，不必然等于单品 Native 不可买。

**B. 付款按钮存在但 checkout 503：** 先分辨 `WEB_NATIVE_DISABLED`、`CHECKOUT_UNAVAILABLE`、Origin 不符、Cookie 不存在、已购/重复 pending、销售规则未确认或文件未核验；再查微信官方 API/私钥/微信公钥 ID/系统时间/TLS；不能通过关闭验签“修复”。

**C. 微信已扣款，订单仍 pending：** 立刻只关闭**新单开关**，保持 `reconcile=1`。查官方**签名**订单状态，核对金额、商户 AppID 和 event/交易号，检查唯一 worker 的失败情况；**不得手动改 `paid=true`**。历史旧 ThinkAI 于 2026-06-16 的真实故障原因包括：线上版本漂移、错误的公钥/证书验签模式、对 `wechatpay-*` 回调头大小写敏感；新 Node 版本必须保持这些修复，不能改回旧错误。

**D. 订单 paid 但无权限：** 用受控只读 DB 检查 `billing_orders`、`billing_item_entitlements`、商品/资源 ID 与购买账号是否一致；不可凭页面显示伪造一条权益。

**E. 下载 401 / 403 / 503：** 401 核对网站微信登录 Cookie；403 是无当前资源的已购权益；503 检查资产状态、私有文件权限、哈希、大小、磁盘可用性，不能将付费资料改放到 `public/`。

**F. 部署后用户全掉线、旧订单消失：** 优先排查持久化 `private` 映射、用户签名 secret 与 `SOCTHINK_BILLING_DATABASE_URL` 是否指向新建空库。绝不能为掩盖故障重建一个新 `parents.json` 或清空账本。

**G. 预检报 `CERT_UNREADABLE`，但已收真单：** 静态脚本与运行时对证书 PEM 的假设有差异；先确认私钥、公钥模式、serial 和实际服务代码，不重置商户私钥。解决方式是改善预检一致性，不是“换一个商户号”。

## 10. 测试、正式验收与未来改版不回归清单

**专项离线合同测试**（在安装了完整 Node 依赖、与生产 PG 隔离的环境运行）：

```bash
npm run test:wechat-pay-scopes
npm run test:wechat-native-boundary
npm run test:wechat-native-transport
npm run test:wechat-native-flags
npm run test:wechat-native-recovery
npm run test:single-wechat-buyer
npm run test:wechat-auth
# billing-ledger 集成测试仅允许连接隔离 *_ci 数据库，
# 且在显式 SOCTHINK_BILLING_TEST_ISOLATED=1 时执行。
```

2026-11-03/04 在生产代码树执行过五组 Native 支付、验签、传输、开关与补偿合同测试，全部退出码 0。它们用模拟签名/状态，不等于真钱回执；本次额外有**独立真实 ¥2.99 单据**和已购文件证据。

**不可简化的正式测试：**
- 微信电脑扫码、微信内 OAuth、首次注册和二次进入同一 ID；
- 新 UI 商品页展示后端 SKU/分价、交付内容与规则确认；
- 未登录不可下单和下载（401），其他账号无权查看别人的订单/资料（403/404）；
- 真实 Native 订单成功，官方微信身份/MCHID/AppID/金额一致；账本由 pending→paid；
- 恰好一次权益，原账号跨设备再次登录仍可见；受限 PDF 真实读回、大小和哈希一致；
- 回调丢失时唯一补偿 worker 官方签名查单恢复，重复回调不重复授权；
- 恢复开关/发布回滚后，不遗漏未完成订单，不清空购买者数据；
- 独立灾备恢复和微信商户后台结算对账；
- **小程序虚拟支付、手机内拉起、会员订阅或按次付费**另外适配官方场景并各自验收，不能拿 Web Native 一笔验收冒充所有渠道通过。

## 11. Math 全面改版的保留合同

新版可以彻底变更：导航分类、页面布局、字词/竞赛/测评题库、前端渲染技术、品牌表达、用户体验。

新版**不可破坏**：

- **一个微信账号**：正式扫码/OAuth 身份、用户和会话持久化、既有 Cookie／历史账号兼容；
- **一个账本**：现有 SKU/资源 ID、商品价格按分存、历史订单、计费事件、使用次数、购买权益；
- **一个真实支付适配器**：Native 微信商户 MCHID/AppID/私钥+微信公钥、通知和签名查单、幂等及关闭订单机制；
- **一个交付通道**：私有资料 SHA-256、单品版权与交付批准、付费下载 API；
- **两条独立运维开关**：停止新单不停止已经付款的结算；
- **一条正式发布路径**：GitHub main → CI → 不可变 release → 安全回滚；生产运行与用户数据永久分离。

迁移时先保持旧 API 对新版 UI 可用；如必须变更，提供有版本的兼容层和双向可回退迁移，**不**同时运行两套订单状态机。发布后抽检既有已购商品，必要时做受控真实小额再验收。只有所有旧权益、订单、账号能稳定读取，才能撤下旧前端；永远不能清账本或密钥。

## 12. 一页式检查表（部署/交接直接复制）

- [ ] 正式域名与 Nginx/TLS/回调源是 `socthink.cn`，`www` 正确跳转
- [ ] `/api/release` SHA 与 GitHub main 上本次预期提交一致，上一 SHA 可回滚
- [ ] 生产 systemd 使用不可变 `/opt/socthink-releases/current`，不是在老工作树临时改生产代码
- [ ] `/etc/socthink-math-wechat.env` 存在且权限严格，电脑扫码和微信内授权可用
- [ ] `/etc/socthink-math-payment.env` 和私钥/微信公钥、APIv3 Key 存在且权限严格；商户号/AppID/serial/公钥 ID 绑定正确
- [ ] `SOCTHINK_BILLING_DATABASE_URL` 指向原唯一生产 PostgreSQL，不是空库
- [ ] `private/users` 和扫码 secret 不被 release 覆盖，历史微信账号保留
- [ ] 私有数字文件、版权授权、SHA-256 文件与已购权益仍存在
- [ ] 结算开关=1，唯一 `socthink-wechat-reconcile.timer` active；公开新单开关按经营策略正确
- [ ] 生产中不再有 `SOCTHINK_WECHAT_NATIVE_PILOT_*` 的运行时白名单
- [ ] 普通游客看到微信登录后购买，匿名 checkout/download 401
- [ ] 登录买家历史付费订单可查，已购 PDF 下载 HTTP 200 且字节一致
- [ ] 若支付协议/身份映射/数据库变更，另行做真实小额端到端验收
- [ ] 数据库、用户、文件、秘密材料分别完成加密备份与隔离恢复演练
- [ ] 系统可以**一键关闭新单而不阻断已付款补单**，滚回上一可用发布

## 13. 官方依据及仓库内部历史资料

微信支付官方：  
- Native 下单：https://pay.wechatpay.cn/doc/v3/merchant/4012791877  
- 支付回调：https://pay.wechatpay.cn/doc/v3/merchant/4012791861  
- Native 接入：https://pay.wechatpay.cn/doc/v3/merchant/4015614538  
- 微信支付公钥模式：https://pay.wechatpay.cn/doc/v3/merchant/4013038816  
- 官方订单查询：https://pay.wechatpay.cn/doc/v3/merchant/4012075249

工程参考（**部分含过时阶段状态**，以本文 2026-11-04 生产核验为准）：
- `docs/engineering/SINGLE_WECHAT_ACCOUNT_20261030.md`
- `docs/engineering/WECHAT_FIRST_SIGN_IN.md`
- `docs/engineering/WECHAT_NATIVE_CHECKOUT_E2E_INTEGRATION_20261030.md`
- `docs/engineering/WECHAT_NATIVE_PRODUCTION_UNLOCK_20261031.md`
- `docs/engineering/WECHAT_NATIVE_OFFICIAL_LEGACY_NEW_PARITY_20261030.md`
- `docs/engineering/WECHAT_NATIVE_RECOVERY_PORT_20261030.md`
- `ops/payment/PRODUCTION_ACTIVATION.md`
- `ops/payment/WECHAT_RECOVERY_OPERATIONS.md`
- `ops/payment/RESOURCE_DELIVERY.md`
- `ops/release/SOCTHINK_DEPLOYMENT.md`
- `ops/backup/backup_verified.sh`、`ops/backup/verify_backup_restore.sh`

## 14. 文档维护规则

任何微信 OAuth、Cookie、商户 API、回调验签、数据库 schema、支付开关、SKU/资源交付、发布回滚方式的变更，必须同步更新本文的**配置键名、真实生产状态、验证命令和证据等级**。普通纯 UI 改造无需重建计费。文档不保存真实密码、APIv3 Key、商户私钥、用户手机号/OpenID、交易全号、带 cookie 的下载 URL、完整个人订单记录。线上状态变化需更新快照日期和 `/api/release` SHA，不能把历史记录当实时监控。

**最终工程结论：** `socthink.cn` 已完成一次真实微信 Native 付款、账本权益与 PDF 字节交付并启用正式公开 Web Native 收款。未来 Math 完全改版，应当**复用这条经过验证的统一微信身份与支付计费底座**，只更换用户界面和业务产品，不让每次部署重新接入微信支付。
