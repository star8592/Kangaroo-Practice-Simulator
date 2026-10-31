# SOCTHINK Native 微信支付新站接线（二阶段）

2026-10-30。依赖已合并 PR #155，归属 #153 / #52 / #151。**此提交含 HTTP 处理器，但所有收费开关默认禁用；禁止通过仅部署代码开启真实付款。**

## 实现（当前只对应老 PostgreSQL PLUS/PRO 订阅商品）

- `POST /api/payments/wechat/checkout`：必须启用双重商户授权和新订单开关；要求已有真实监护人服务端会话、同源浏览器请求和正常已启用的 `billing_products`；价格始终服务端取，不使用客户端金额、用户名、商户或“已支付”标识；单一 PostgreSQL 账本插入 `provider=wechat_native` 的独立待支付订单；调用签名官方 Native API，并**在自己的 Next.js 进程里**用 `qrcode` 生成 PNG data URL。第三方 QR 服务不接触支付链接。
- `POST /api/payments/wechat/notify`：**2026-10-30 新回调修复**：无用户登录，校验原始签名、时间窗口及公钥 ID，AES-GCM 解密并确认 Native SUCCESS / 商户 / AppID / 金额 / 币种；在同一订单账本上**原子持久写入通知事件 ID、交易号、回调哈希和时间戳**，随后立即 HTTP 204。回调本身不进行 10 秒远端查单、不发放权益；DB 失败返回非成功，允许微信重试。官方签名 GET 查单由已存在的同一账本补单 worker 完成，成功后才事务结算权益。
- `GET /api/payments/wechat/orders/[orderId]`：只有原支付监护人账户可以读取其付款状态，匿名/其他用户不得查询，绝不显示商户秘钥、平台流水等敏感信息。
- `/membership`：动态按现有 `billing_products.enabled=true`、实际大于零的 CNY 价格和完整**新订单启用开关**提取当前 PLUS/PRO SKU。**没有任何真实可售产品或开关未通过时，保留原“收费未开放”界面，绝不显示购买按钮**。若具备授权和活跃商品，则向已登录监护人展示定价、通过本站 checkout API 请求订单、以本地生成的 QR PNG 扫码支付，定时只读查询本人订单状态。前端不会凭页面提示直接发放权益。该 UI 尚未通过真实商户回执与浏览器 E2E。
- `src/lib/wechat-native-server.ts`：仅服务端按受控绝对路径加载私钥和微信支付公钥并要求文件权限安全；不输出密钥。可信公网 `SOCTHINK_PUBLIC_ORIGIN` 必须与完整 HTTPS notify URL 同源，路径必须为正式路由。
- `src/lib/billing-ledger.ts` 保留既有 `wechat_pay` 兼容默认值，给新 Native 订单添加`wechat_native` provider，不增表、不另建第二账本；在独立 `*_ci` PostgreSQL 测试中覆盖新 provider 支付与退款。**现有 schema 目前只有 plus/pro month/year，不能声明已支持每卷独立 SKU 或机构账单。**

## 生产安全开关（全部默认 CLOSED）

| 环境变量 | 使用目的 |
| --- | --- |
| `SOCTHINK_WECHAT_NATIVE_PRODUCT_APPROVED=1` | 运维人员验证微信商户后台 Native 产品与真实经营场景后才设置 |
| `SOCTHINK_WEB_NATIVE_PAYMENTS_ENABLED=1` | **新订单创建**单独开关，必须先打开结算能力才能生效；紧急停止新付款时撤销此开关即可 |
| `SOCTHINK_WECHAT_NATIVE_RECONCILIATION_ENABLED=1` | **已付款订单后续回调、查单及状态查询**单独开关，不能随停新单而关闭，否则可能造成已付款却不到账 |
| `PAYMENT_PROVIDER=wechat_native` | 明确网站 Native，而不是小程序虚拟产品 |
| `SOCTHINK_PAYMENT_SURFACE=web-native` | 独立 Web Native 作用域 |
| `SOCTHINK_BILLING_DATABASE_URL` | 新站唯一的 PostgreSQL 交易账本连接；由 secret manager 注入 |
| `SOCTHINK_PUBLIC_ORIGIN` | 本网站受控 `https://` 公共源；必须与 notify 同源 |
| `WECHAT_PAY_MCHID`, `WECHAT_PAY_APPID`, `WECHAT_PAY_SERIAL_NO` | 官方商户 APPID/证书映射；不复制旧站历史值到 GitHub |
| `WECHAT_PAY_PRIVATE_KEY_PATH`, `WECHAT_PAY_PUBLIC_KEY_PATH`, `WECHAT_PAY_PUBLIC_KEY_ID` | 服务端证书绝对路径和微信支付公钥标识；文件权限必须私有 |
| `WECHAT_PAY_API_V3_KEY`, `WECHAT_PAY_NOTIFY_URL` | 通过安全部署通道提供；从不输出/记录明文 |

**上线顺序**：先在原主机安全渠道和商户后台核实真实商户主体/产品授权/有效证书及 AppID 绑定；再为新站部署单一 PG 账本，完成备份与恢复；先启用回调结算与只读状态，确认准备就绪，最后仅允许已授权测试账号启用新订单并走一笔真实交易。完成微信官方查单/账本授权/真实交付/对账/独立用户 E2E 后，才开放正式 UI。

**未完成**：旧站历史订单不可直接视作当前订单；目前没有对当前服务的正式签名支付、微信商户回执或真实商户密钥装载做过线上验收。目前只有通过强制开关才能展示的会员购买 UI；普通用户退款适配器不是商业需求或收款上线门槛；但实际可售 SKU、真实商户授权、交付和资金回执均未验收，不得宣传新增商品可售。未打通时此实现必须维持关闭。

## 回归命令

```bash
npm run test:wechat-native-flags
npm run test:wechat-native-boundary
npm run test:wechat-native-transport
npm run test:wechat-pay-scopes
# 单独临时本地 PG *_ci，绝不能用生产数据库运行该套测试：
SOCTHINK_BILLING_TEST_ISOLATED=1 SOCTHINK_BILLING_DATABASE_URL='postgres://.../socthink_billing_ci' npm run test:billing-ledger
```

若生产通过健康探针而下单仍不可用，首先检查四个真实状态：已批准商户、现有密钥、新站受控账本、产品真实权益；不要自行重置 SSH/复制旧密钥或建立第二套结算。
