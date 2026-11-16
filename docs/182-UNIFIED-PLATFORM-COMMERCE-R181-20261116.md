# R181 · SOC THINK 统一支付中心（第一批正式接口）

目标：统一微信注册登录、统一订单、统一支付、统一退款和统一
付费权益；老师的产品管理授权与购买权益明确分离。平台拥有
唯一微信商户与账本，所有产品继续保留自己的教学数据、机构和班级权限。

## 第一批实现

- 全站唯一平台收银入口 /membership；原统一购买订单入口 /account。
  不新增收款密钥、机构商户或支付 Webhook。
- GET /api/platform/billing/modules：公开的六个产品归属清单，
  包括平台通用商品、数学、发音、词语星球、阅读、AelOS。
  每个产品均使用 SOC THINK 的收银与订单中心。
  注意：这是接口注册表，不是商品价格、付费开放许可或权限。
- GET /api/platform/billing/me：现有受保护微信会话只查询本人
  付费权益。SQL 同时验证付款归属、订单 state=paid 和撤销状态，
  不接受客户端传入 userId、orderId 或自封的付费标志。
- 历史通用报告/资料/试卷无法仅凭名称算作数学商品，因此放在
  platform 购买池；数学套餐经现有访问策略继续兑现。四个英语
  模块在正式 SKU 和产品交付适配上线前返回 not-onboarded。
- 订单入账、真实微信签名、独立官方查询、退款撤权、幂等结算
  仍由原 billing-ledger 与 Webhook 实现；不复制账本。

## 双仓协同

词语星球独立 PR 在 Rust 创建订单和 checkout 入口拒绝新订单
（HTTP 410 platform_payment_required），前端不再提供独立扫码
收款，原机构历史订单和退款路径继续保留。即使旧库增加商品
记录也不能重新打开本地收款。机构席位暂未在主站正式开售，
不能把平台会员套餐错误地当作机构座席。

未来只有真实平台结算记录经过机构所有者身份和机构绑定、
有效期、席位数量、退费规则联合校验后，才能发放机构权益。

## 验收范围

无网络、无付款契约：模块配置、匿名 401、缺账本 503、无虚假授权。
隔离 PostgreSQL18 测试：真实 SQL 已付权益查询、跨账号隔离、
退款后权益消失，与现有 provider 校验和幂等结算共用一个账本。
浏览器测试覆盖公开目录及私有接口的未登录拒绝。

尚未完成跨模块可售 SKU、机构支付与授权绑定、JSAPI 同机微信支付、
小程序统一调起方式和真实支付/退款 E3。本批不开放新 SKU、
不调价格，也不改真实支付记录。

## 第二批：机构席位的中央结算模型（2026-11-16）

在同一 PostgreSQL18 账本新增仅增量迁移
`ops/db/015_platform_organization_seats.sql`，包含：
- `billing_products` 新的 organization/vocab_seats 商品类型以及
  合法的席位数量、购买期限；该迁移不插入也不启用任何商品。
- `billing_orders` 不可变机构 UUID、席位及期限快照；保留原有
  家长/个人购买者 ID、价格、币种及微信服务端对账规则。
- `billing_organization_owner_bindings`：由独立词语星球 Rust 后端
  在核验机构 owner、平台微信 SSO 及平台词汇管理模块授权后，
  通过服务端 Bearer 密钥给当前微信账号登记一个 5 分钟
  有效的机构购买绑定。浏览器不能直接伪造组织管理员。
- `billing_organization_entitlements`：仅在官方支付状态独立核验后
  与 `billing_orders.state=paid` 同事务写入，退款时同事务撤权；
  不按用户提供的价格或购买后修改的 SKU 设置来发放权益。
- 跨用户买单、错误机构、同一机构商品并发待付款、重复结算、
  错误金额、退款撤权全部在真实独立 PostgreSQL18 `*_ci` 回归，
  回执 `BILLING_ORGANIZATION_SEATS=PASS`。

组织绑定接口：
`POST /api/internal/commerce/vocabulary/organization-owner` 必须经
真实服务端产品密钥 + 中央微信 cookie + SSO 匿名主体匹配 +
有效平台模块授权；
`POST /api/internal/commerce/vocabulary/organization-entitlements`
仅响应带服务端产品密钥的词语星球后端请求，返回无个人识别信息
的可用付费机构合同，不向普通网页用户公开。

主站原 Native checkout 路由仅在
`SOCTHINK_ORG_SEATS_CHECKOUT_ENABLED=1` 且独立机构绑定仍在有效期
且 SKU 完整验收后才允许构建机构订单。该开关现在**保持关闭**，
没有新增价格、商品或真实支付。

## 双端交付及席位执行（2026-11-16）

词语星球 Rust 新增 `platform_billing` 服务端适配器。机构所有者
在独立后台完成真实任课/机构验证、与 SOC THINK 同微信账号绑定
后才能向中央支付中心登记购买归属；不是任何教师都能为机构买单。

付费机构合同由中央统一账本返回；机构管理页优先呈现已验证的
中央合同，原本经核实的本地试用合同继续保留。**只控制新生席位的
发放，不删除学生数据或阻断已有学生查看自己的历史记录**。
在明确开启 `VOCAB_CENTRAL_BILLING_ENABLED=true` 和
`VOCAB_CENTRAL_SEAT_ENFORCEMENT=true` 后，单个和批量学生邀请
都用相同的机构数据库事务锁，按中央有效且未退款的席位数量
限制新邀请数，防止并发创建超额席位；中央账本不可用则拒绝
新增付费席位，原有服务与学习数据不受影响。未启用时原行为不变。

仍待正式验收：生产 PG18 执行 migration 015、受信服务器密钥
配置、机构真实 owner 微信 E3、原有试用/免费政策与付费政策对齐、
学生已有学习权限在退费后的处理规则，以及新机构商品价格授权。

## JSAPI 同一手机准备（2026-11-16）

新增纯协议 `src/lib/wechat-jsapi-payment.ts`，复用主站现有
微信商户私钥及 APIv3 RSA 请求签名。微信内下单必须使用当前
公众号 AppID 对应的 OpenID，不能用 Website OpenID/UnionID。
为前端生成独立的 RSA `paySign`；不误用微信通知验签或 Native QR
参数。`GET /api/payments/wechat/jsapi/readiness` 只报告当前微信会话
是否满足配置条件，不返回 OpenID、AppID、密钥，且**永远不创建订单**。
离线 `JSAPI_PURE_PROTOCOL=PASS` 验证签名可验、公众号身份
错配被拒绝、未批准不能开通。

`SOCTHINK_WECHAT_JSAPI_APPROVED` 和
`SOCTHINK_WECHAT_JSAPI_ENABLED` 默认关闭。小程序仍必须使用
小程序支付，不通过网页 JSAPI 或 Native QR 混用。
只有核实公众号与商户号的官方绑定、微信支付产品权限、
真实手机 E3 以及后台可回执对账后，才适合新增真实 JSAPI 下单
和开启新的机构售卖。此次是协议和权限边界准备，不是付费上线。

### 并行付款的最后一层保护

billing_one_pending_org 在机构级别阻止不同 SKU 的两个待付订单
同时存在，配合统一的机构 advisory transaction lock。
V1 不允许尚有效的付费机构合同叠加新购，以免先续期、后退款
发生有效期错算；合同到期或退款确认后可重新购买。
这是订单安全边界而非发布审批门槛。提前续期、机构席位升级和
差额定价需要正式的商业规则，在此之前不面向用户销售。

## 生产一次性数据库安装器（增量，无售卖行为）

新增 ops/payment/install_org_seat_schema.py。仅 root 主机管理员可操作：
- --plan：只读当前账务 PG18 版本、迁移是否存在及汇总订单数。
- --apply：先触发原有已运行的加密账务备份 service，强制确认
  BILLING_BACKUP 和 BILLING_ASSET_BACKUP 各自独立恢复成功。
- 在 /run 临时私有目录做 pg_dump -Fc，使用全新一次性隔离数据库
  恢复现有完整账务，然后在隔离库运行 015 SQL，核对全部原订单
  和商品数量未被更改；最后销毁隔离库及临时转储文件。
- 仅以上恢复验证全部通过，才在现有生产 socthink_billing_prod
  顺序执行单事务迁移 015，复核机构权益表/唯一索引。
- 安装器不创建收费 SKU、不开放支付开关、不分配付费权限、
  不重启服务、不触碰或打印旧订单身份字段与商户密钥。
  即使 Schema 已安装，重复执行也只确认并返回。

与 English 产品主线 PR #341 同步：AelOS 是唯一新的阅读商业
模块；EnglishLeap reading 为只读历史导出入口，不再列入可售
模块清单，记录在 readOnlyLegacyModules。
