# 微信合法域名及开放平台 IP 白名单只读验证

## 必须区分两个配置

1. 微信开放平台接口 IP 白名单：后端使用 AppID/AppSecret 调用 api.weixin.qq.com 时被限制。生产实测 errcode=40164，错误消息标识出口 IP 为 8.166.137.232。在本小程序微信公众平台开发设置中，按实际界面把 8.166.137.232 加入 API IP 白名单，不能随意放开任意 IP。
2. 小程序 request 合法域名：真机 wx.request 使用 HTTPS 域名 https://socthink.cn；必须在微信后台 开发管理 → 开发设置 → 服务器域名 → request 合法域名核实精确匹配。当前尚未证实已有这项配置，不能直接归因为手机端故障。

## 服务器只读验证

生产服务器项目根目录：

    bash ops/release/miniapp_openapi.sh status
    bash ops/release/miniapp_openapi.sh domain-status

status 查询版本与审核状态；domain-status 用微信 API 的 action=get 读取 requestdomain，只读，不包含任何添加、覆盖、删除动作。

- MINIAPP_OPENAPI=BLOCKED reason=ip_whitelist：先修 IP 白名单。此结果并不表示手机 request 域名不存在。
- MINIAPP_DOMAIN=PASS：微信返回的域名列表包含 https://socthink.cn。
- MINIAPP_DOMAIN=BLOCKED reason=request_domain_missing：微信返回中确实不存在该项，需后台补充。
- MINIAPP_DOMAIN=BLOCKED reason=wechat_api_unavailable：接口可能仅适用于第三方代开发权限，需人工检查微信管理后台，不能当成未配置。
- MINIAPP_OPENAPI=FAIL reason=appid_mismatch_with_project：严禁使用非本项目的 AppID 做版本、审核或域名查询。

正式发布还需与 Git SHA 对应的微信开发者工具和 Android 真机测试截图，Web 后端探针成功不等于小程序交互成功。严禁在没有证据的情况下输出真机验收 PASS。
