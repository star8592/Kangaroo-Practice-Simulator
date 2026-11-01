# SOCTHINK 微信 Native 单买家真实交易验收 · 2026-11-01

## 目的

在全站新收费开关保持关闭的情况下，指定当前生产中唯一经微信认证的试付账号，并只允许购买一份已授权、已校验 SHA-256 的原创一年级 PDF（商品 ID：socthink_g1_original_2026_batch01，账本价人民币 1.99 元）。本操作不是模拟支付，不篡改结算表或权益，不从其他商户复制凭据。

## 范围与机制

- 不启用 SOCTHINK_WEB_NATIVE_PAYMENTS_ENABLED（公众关闭）。
- 仅为本次测试设置服务端三个变量：SOCTHINK_WECHAT_NATIVE_PILOT_ENABLED=1、SOCTHINK_WECHAT_NATIVE_PILOT_BUYER_ID=生产数据库唯一微信账号的内部 par_ ID、SOCTHINK_WECHAT_NATIVE_PILOT_PRODUCT_ID=socthink_g1_original_2026_batch01。禁止把账号 ID、密钥写到 GitHub。
- 页面根据真实的已签名微信会话展示 NativeCheckoutPanel，服务端同样检查真实身份+精确 SKU，未满足者依然不能创建订单。
- 原有商品价格、售后主动勾选、真实私有文件校验、唯一订单、防重复支付、微信签名请求和原有回调/查单 worker 完全复用。
- 没有买家在微信中亲自扫码并确认，就不能产生真实付款；已创建但未支付的订单必须保持 pending/官方关单，不能直接标记 paid。
- 服务端权限不会从客户端传入的 buyerId 决定，只来自签名微信会话。
- 单账号试付不等于全站移动端可用，Native PC 扫码与 H5/JSAPI/微信小程序属于不同支付场景。

## 验收次序

1. 经 CI 和可回退发布；业务页面 200，PNG 样张 200，正式发布 SHA 一致。
2. 公众开关 OFF、补单 timer active、商户授权已核验。匿名和非指定账号点击/POST 应被拒绝；只允许试付账号的指定商品进入收银台。
3. 试付账号本人主动勾选数字商品规则，点击微信扫码购买。服务端使用真实账本价格 199 分创建订单，调用官方 Native 下单取得真实 code_url，展示限时二维码。
4. 买家扫码支付人民币 1.99 元后，用官方已签名查单或回调验证 transaction_id、金额、商户、订单、付款状态，回调与补单复用 settleVerifiedOrder。
5. 验证账本 paid + payment event 唯一 + item_entitlement 唯一 + 买家账户订单可见。
6. 用买家会话通过 /api/resources/download/socthink_g1_original_2026_batch01 下载 HTTP 200 PDF，SHA-256 与批准存储资产完全相同；未付款、匿名或其他用户无法下载。
7. 收集日志和审计回执（不含秘密、二维码 code_url、会话 cookie、完整微信交易标识），禁用试付专用环境变量。已付权益仍可下载。经过这些验证再另行决定公众是否开放。

## 失败恢复

试付出现错误时把 SOCTHINK_WECHAT_NATIVE_PILOT_ENABLED 设为 0 并重启应用，公众收款开关始终是 0，查单补单服务保持运行，以免出现已付款却不交付。正式发布系统本身带有自动回滚，任何版本回退不得删除收款数据库及用户的已付订单。

当前此文档只说明验收路径；真实支付成功必须由生产回执单独证明。
