# SOCTHINK 收费 503｜微信 Native 官方核对与生产恢复路线

核实日期：2026-10-31，北京时间。唯一目标为 https://socthink.cn 的 Web Native 数字商品收款；旧 https://www.socthink.cn 属另一服务器。

## 已取得真实证据

- 新站公网响应 ledgerConfigured=false；新服务器 PostgreSQL 16 运行，但专用 socthink_billing_prod 数据库和 socthink_billing 角色不存在，收费连接配置文件不存在。
- 新站 checkout HTTP 503 是自身安全返回 WEB_NATIVE_DISABLED：正式代码在发微信下单请求之前，先检查 nativeCheckoutAllowed 和 billingConfigured。
- 旧 ThinkAI 的 provider-status 返回 configured=true、mock_mode=false，只说明**旧商户配置**；不能推出新机器有商户私钥，也不能推出新网站的商品经营场景已获准。
- 生产账本的只读 preflight 七项全部满足。此前远程创建数据库被执行安全策略拦截，不能绕过该限制。未初始化的数据库不是程序自动猜测或自动部署能修复的。
- 旧诊断脚本错误检查一个正式代码不使用的 SOCTHINK_WEB_NATIVE_SETTLEMENT_ENABLED；正确的是 SOCTHINK_WECHAT_NATIVE_RECONCILIATION_ENABLED。已修复。
- 静态公开套餐比较目录一直 checkoutAvailable=false，仅表示套餐计划预览；是否有实际可售商品由 /membership 的真实数据库商品查询决定，不能拿静态预览标记当支付硬条件。已修复错误诊断。
- 正式回调代码已是验签、解密、验证并持久化回调，再由唯一异步补账程序官方查单和结算；目前没有新站真商户付款回执。

## 微信支付官方文档确认

1. Native 开发接入准备：已开通 Native 支付、绑定有效的 APPID 和商户号；商户平台须核实实际经营场景，而非信任旧版配置。
   https://pay.wechatpay.cn/doc/v3/merchant/4015614538
2. 普通商户 Native 下单：POST /v3/pay/transactions/native 返回 code_url；参数必须对应商户号、AppID、唯一订单号、人民币金额和通知地址。
   https://pay.wechatpay.cn/doc/v3/merchant/4012791877
3. 微信支付公钥响应模式：在商户配置中正确使用 PUB_KEY_ID_ 前缀的微信支付公钥 ID，不能与商户 API 签名证书序列号混为一谈。
   https://pay.wechatpay.cn/doc/v3/merchant/4013038816
4. 支付回调：验签成功后在 5 秒内 HTTP 200/204 应答；验签失败不能成功应答；业务处理建议异步；没收到回调需主动查单。
   https://pay.wechatpay.cn/doc/v3/merchant/4012791861
5. 主动查单、避免重复支付、T+1 对账是正式收款闭环的必要环节。
   https://pay.wechatpay.cn/doc/v3/merchant/4012075249
6. 商户经营场景管理：
   https://pay.wechatpay.cn/doc/v3/merchant/4017312501

## 后续仅有的真实生产操作

A. **获得生产运维授权后**，在正式新站 /opt/socthink-releases/current 用预置的独立账本创建脚本一次性初始化，核查 DB 角色权限、10 张表及备份恢复。绝不能在旧目录操作，也不能用 GitHub Actions、其它远程工具绕过先前的安全拦截。

B. 在微信商户平台用受权商户账号确认 Native 支付和当前 APPID 绑定、新网站数字教育/资料商品经营场景；旧商户可用不代表新域名一定合规。

C. 由被授权运维人员通过受保护密钥管理或服务器间私密通道把正式商户所需凭据安装到**新服务器**，配置新独立 notify_url 为 https://socthink.cn/api/payments/wechat/notify。严禁在聊天/GitHub/日志输出私钥、APIv3 密钥、数据库密码；不要从旧站直接复用旧 notify URL，不要强制改变旧商户公钥模式。

D. 真正的收款代码条件（全部来自 src/lib/wechat-native-flags.ts 和 src/lib/wechat-native-credentials.ts）：
- PAYMENT_PROVIDER=wechat_native
- SOCTHINK_PAYMENT_SURFACE=web-native
- SOCTHINK_BILLING_DATABASE_URL 在 secret manager 中实际可用
- SOCTHINK_PUBLIC_ORIGIN=https://socthink.cn
- SOCTHINK_WECHAT_NATIVE_PRODUCT_APPROVED=1（须有当期真实商户批准证据）
- SOCTHINK_WECHAT_NATIVE_RECONCILIATION_ENABLED=1（验签、回调、补账具备）
- SOCTHINK_WEB_NATIVE_PAYMENTS_ENABLED=1（最后启用新订单）
- 微信商户、证书、公钥与公钥 ID、APIv3 Key、Native notify_url 必须真实匹配。

E. 选择**有合法权利、已验收交付、价格明确**的真实数字商品创建 SKU；做一笔受控、真实的合法微信 Native 下单、收款、签名查单、同一账本 paid、实际授权交付与财务对账。正常数字内容不提供无理由退款；不做用户自助退款，也不把“先制造退款测试”当作上线前置条件。

## 本次改动边界

已纠正只读诊断的变量名和假阻断，在同一个 GitHub CI quality 任务运行离线合成测试；不增加新的上线门禁服务。诊断只能证明配置缺项，不能单靠开关全为真就宣告收费真实成功。没有获授权的生产 DB 写入、私钥迁接与商户审核回执，仍不得公开开启收款。
