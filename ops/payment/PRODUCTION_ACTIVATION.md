# SOCTHINK 真正收款上线 · 生产激活操作票（2026-10-30）

**适用站点：** `https://socthink.cn`。**不同于**旧 `https://www.socthink.cn` ThinkAI。支付实现已在 GitHub `main`，本票只规定尚待履行的生产操作，不把配置检查或模拟测试冒充收款。

## 实证状态

- 微信历史商户在旧站仍运行 `wechat_native`，商户号/AppID/APIv3 格式有效；私钥及微信公钥可 OpenSSL 解析、文件私有、商户证书有效。**不得输出这些原值到 Chat、GitHub、日志。**
- 新站公网 `/api/release` 在 2026-10-30 返回 `e6265b0f1e87397fe5c6237b1afbff434202954a`，已经包含实际 Next.js Native API、回调/查单/权益接口及**默认关闭**的购买 UI。CI 四个作业通过。
- 新站 `socthink-math.service`、自动部署定时器正常。新站本机 PostgreSQL 16 已安装并启动，仅监听 loopback；**尚无**专属账本数据库和 app-role，也没有商户密钥注入；访问 `/membership` 仍明确“收费未开放”。
- 当前远程生产角色/凭据初始化在执行接口遭安全检查阻止；不得通过另一条未授权通道、GitHub Actions 自动执行、修改系统安全配置或变相部署来绕过。以下操作仅供**获得生产服务器正式变更授权的运维人员**审查后在受控终端主动执行。

## 1. 正式账本：只执行一次、仅限明确获授权的生产环境

先检查两台服务器不要混淆；正式 systemd 服务 `WorkingDirectory` 是 `/opt/socthink-releases/current`，其真实路径指向不可变提交版本目录；`/opt/socthink-math` 是旧的代码树，不是正式进程工作目录。绝不可在旧目录初始化新收款账本。保证 Postgres 16 正常，并对数据盘空间、备份路径、恢复能力做只读确认。

```bash
cd /opt/socthink-releases/current
python3 ops/payment/provision_billing_postgres.py --check
# 所有 preflight 均满足、经过运维批准后，才在生产终端执行：
sudo python3 ops/payment/provision_billing_postgres.py --apply --confirm INITIALIZE_SOCTHINK_BILLING
```

该脚本**不在 npm build、GitHub CI、自动部署和日常服务启动时运行**。它只创建专属 Postgres `socthink_billing_prod` 和权限受限的登录角色，运行版本化 `ops/db/001_billing_entitlements.sql` 、增量 `ops/db/002_wechat_reconciliation.sql` 和 `ops/db/003_native_notification_inbox.sql`，验证 8 张账本表、补偿水位列及签名通知落盘列，并将随机 256 位数据库密码仅存入权限 0600 的 `/etc/socthink-math-billing.env`。通过独立 `40-billing.conf` 添加 systemd 环境文件；不会覆盖既有 `/etc/socthink-math-wechat.env` 用户微信登录配置，不重置旧账号，不开启实际收款；不会输出数据库 URL、密码或任何私钥。

**如果遇到现存 DB/角色/envfile、旧数据、只读文件系统或任一部分失败，脚本拒绝覆盖或自动删除。需先运维人工审计、保留数据后修复，绝不可反复运行。**

后续至少具备定期加密备份、单独存放的恢复密钥、恢复抽样、容灾与最小权限，才能把真实用户的支付数据投入生产；只有本地 Postgres 服务健康不能证明备份闭环。

## 2. 微信支付商户资料迁移与验证

- 旧站商户使用的商户 API 私钥、商户证书序列、微信支付公钥及对应公钥 ID、商户号/绑定 AppID 和 APIv3 Key 由受权运维人员**在真实宿主机或专用 secrets 管理工具内**核实并安全迁移。严禁传给聊天、放在 GitHub、通过网页二维码第三方或 `curl` URL 参数传递。
- 新站采用与原登录配置分开的 `/etc/socthink-math-payment.env`（600）+ 专用受保护密钥目录（仅服务身份读），并新建独立 systemd drop-in，保留旧站运行中的收款服务。
- 当前 Node Native 模块要求 `WECHAT_PAY_MCHID`、`WECHAT_PAY_APPID`、`WECHAT_PAY_SERIAL_NO`、`WECHAT_PAY_PRIVATE_KEY_PATH`、`WECHAT_PAY_PUBLIC_KEY_PATH`、`WECHAT_PAY_PUBLIC_KEY_ID`、`WECHAT_PAY_API_V3_KEY`、`WECHAT_PAY_NOTIFY_URL`、`SOCTHINK_PUBLIC_ORIGIN`；注意微信支付平台**公钥**与商户签名**私钥**是两种不同材料。
- 证书和签名必须与微信支付商户平台真实 AppID/商户号相符；校验 SDK/官方签名和证书有效期；普通购买不以退款 API 权限为前置条件。旧站曾付费成功是历史依据，不代表当前新域名经营场景已获批准。

## 3. 三个互不混淆的生产状态

| 变量/证据 | 含义 | 开启前依据 |
| --- | --- | --- |
| `SOCTHINK_WECHAT_NATIVE_PRODUCT_APPROVED=1` | 已有人实查商户 Native 产品、AppID 绑定和该网站数字产品经营范围 | 官方商户后台当前授权记录，不凭旧口头记忆 |
| `SOCTHINK_WECHAT_NATIVE_RECONCILIATION_ENABLED=1` | 允许旧/新已付款订单回调签名验证、主动查单、账本权益结算 | 生产账本已备份、可恢复，密钥、微信回调与查单真实可达 |
| `SOCTHINK_WEB_NATIVE_PAYMENTS_ENABLED=1` | 允许当前网站创建新的真正付款订单 | 上两项有效 + 已验证真实交付商品/价格/售后 + 受控真单验收 |

**顺序必须是账本→密钥→验签/查单→结算→受控新订单→真实付款→权益／交付／对账→全量开放**。**不要求普通自助退款系统或测试退款作为正常收费上线门槛**；法定异常另由人工售后处理。停止新收费只关闭最后一个开关；已经收款的交易继续履约。

## 4. 实际商品和付款验收

当前新站 `src/lib/access-catalog.ts` 仍声明 `previewOnly:true`、`checkoutAvailable:false`；`billing_products` schema 只支持 PLUS/PRO 月/年，且 `enabled` 默认为 false。因此**不能先设置虚构价格或直接开放 PLUS/PRO 套餐**。先确认向用户出售的具体功能已经真实可用、有授权内容、明确交付与不支持无理由退款的适用条件，并在网站显示真实定价。

经批准后，用受控实际买家账号完成如下步骤并保存**脱敏**正式证据：

1. 在新站选择实际可交付商品，由服务器从唯一 PG 表读取价格并生成 `ord_...`。
2. 收到微信支付官方 Native 下单的**真实**二维码，买家使用微信扫码并实际完成资金支付。
3. 生产 `notify_url` 经公网 HTTPS 获得微信回调，原始报文公钥验签和 AES-GCM 解密成功；在同一真实账本上**持久保存通知证据后快速返回 204**，超时/数据库异常不假装成功。
4. 已经实际运行的唯一官方查单补偿 worker 独立签名调用微信官方查单，金额、币种、商户、AppID、平台交易 ID 与本地订单完全一致。
5. **同一 PostgreSQL 事务**使订单从 `pending` 到 `paid`，发放权益；重复推送/断网重试不重复授权；买家重新登录仍可使用购买的服务。
6. 检查已付订单真实交付凭证和财务对账，并确认用户无自助退款入口；异常可安全暂停新订单但继续处理已付订单。仅当实际发生法定应退、重复扣款或平台强制处理等特殊案例时，由人工受权并以微信官方最终资金状态确认后更新账本。

**必须有这六步原始回执才能将此项目状态标记为 `LIVE_PAYMENT_E2E_VERIFIED`；这里的第六步是交付和对账，不是制造一笔常规退款**。CI、mock、配置自检、旧站历史成功和网站出现二维码都不是收款成功证据。

## 5. 当前待办/边界

- 受限渠道目前无法代替正式运维权限写生产账本或复制商户密钥，因此不得声称“已经开放收款”。
- 仍需产品上线审核与真实单次支付／交付／对账 E2E。**不另建自助退款申请、普通用户退款 API 或自动退款任务**；法定例外通过人工复核后依法处理，保留账本对已发生的官方最终资金状态的核对和冲正能力。
- 有多种付费方式时，PC Native 与小程序虚拟支付、H5、JSAPI 分别按真实产品授权操作，不跨场景借用。
- 不要为了获得交易回执绕过微信认证、跳到其它独立网站收钱而不匹配订单、或让客户支付未交付的产品。

## 6. 官网支付回调丢失时的自动补账

微信支付通知有时间限制，不可依赖通知必达。见
[本项目唯一查单恢复操作规程](WECHAT_RECOVERY_OPERATIONS.md)。
补偿程序复用正式 `settleVerifiedOrder` 事务账本与官方签名查单，
有数据库游标和重试冷却时间，不另建账本。现有服务端 Node 20
不自带 TS 运行器，因此已将 `tsx` 从开发依赖移至生产依赖；
**正式部署相应主分支后**才可由获授权运维人员手动安装该文件
列出的唯一 systemd timer，不可在旧构建或没密钥/没生产 DB
的机器上启动。退款必须以微信官方最终成功查询确认再冲正，
不是提交退款申请就直接废止权益。

## 2026-10-31 增量商品与文件交付更新

上述 2026-10-30 的“仅支持 PLUS/PRO / 8 张表 / 003 为最后版本”
是历史记录，已由后续代码演进取代，**不应再作为当前初始化指令**。
新站现有 004 migration 支持单卷商品和同一交易账本的权益投影；
005 migration 增加经过 SHA-256 验证的私有数字资料资产目录。

新的专属账本初始化要顺序应用 001→002→003→004→005，
合计 10 张表；实际使用前先以最新版本
`ops/payment/provision_billing_postgres.py --check` 进行只读检查。
任何现存账本都需获授权的迁移审查和单独备份恢复。
详见 `ops/payment/RESOURCE_DELIVERY.md`，新资料默认不得销售。
文件保存位置必须与自动部署代码目录隔离；不得把原始资料放到
GitHub、`public/` 或临时容器层内。

这份更新不代表生产商户号、生产账本或首次真实微信付款已经验收；
任何生产写入必须遵循现有授权边界。


## 2026-10-31：防重复收费的后续迁移

本项目又加入 006 迁移，正式最新 schema 为 **001→002→003→004→005→006**；
006 是同一买家、同一付费商品的 PostgreSQL 待付/已付唯一约束，
不增加新表，仍合计 10 张表。官方关闭微信待付订单之前，不得
仅凭本地计时释放该约束。说明和 CI 验收见
`docs/engineering/ITEM_ORDER_SINGLE_PAYABLE_20261031.md`。

## 2026-10-31：正式 Native 关单与重新下单

在 006 后新增 `ops/db/007_native_close_proof.sql`，
最新 schema **001→002→003→004→005→006→007**，仍为 10 张账本表。
本次代码为新 Native 付款设置 30 分钟支付截止，
同一个官方查单 worker 在至少 35 分钟后，先验真 GET 再调用
官方签名关单接口、验证 204 应答签名，再独立 GET 官方 `CLOSED`，
最后才在 DB 记录正式关单证据、释放唯一待付槽位。
详情见 `docs/engineering/WECHAT_NATIVE_PROVIDER_CLOSED_20261031.md`。
正式商户真实关单、实付、交付／对账和机房运行证据仍须独立验收，不可把
单元测试或 CI 结果标为 `LIVE_PAYMENT_E2E_VERIFIED`。

## 2026-10-31 数字产品无理由退款告知与订单确认

生产初建 migraton 新增 `ops/db/008_digital_sales_consent.sql`：
正式最新顺序为 001→002→003→004→005→006→007→008，仍为 10 张表。
新网站订单均需购买前主动确认数字内容开通/交付后不适用无理由退款的条款，
并在唯一账本留存固定规则版本与服务器时间；未经确认不能创建 Native 二维码。
法律规定的未履约、严重不符与质量救济依法处理，不能仅凭“售出不退”
拒绝一切售后。今后的新订单适用 `docs/legal/DIGITAL_SALES_POLICY_V2_20261031.md`；历史 V1
订单仍遵从未被改写的 `docs/legal/DIGITAL_SALES_POLICY_V1_20261031.md`。
见 `docs/engineering/DIGITAL_SALES_POLICY_ACCEPTANCE_20261031.md`。
该变更不等于真实生产商户、退款通道或结算账本已获得授权。


## 2026-10-31 退款产品决策（取代本文件上方旧的退款验收门槛）

本项目**售出已交付数字内容后不支持无理由退款、不做普通退款业务**。
没有用户退款按钮、不会自动发起或自动批准退款。
上文涉及“必须退款后才能收费”或“先开发退款适配器”的**旧规划已废止**。
生产收费验收关注真实到账、唯一账本、权益可用、实际交付和对账。
依法必须解决的未交付、预付未履行、严重违约或重复扣款由人工复核；
如果最后发生实际官方退款，保留账本验证官方最终结果的受控能力即可。
见 `docs/legal/DIGITAL_SALES_POLICY_V2_20261031.md`，不能把不退款声明
理解为免除依法应承担的责任。
