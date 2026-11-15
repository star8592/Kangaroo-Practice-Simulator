# SOC THINK 微信单手机网页授权排障与工程验收（2026-11-15）

## 唯一登录系统
- 微信内网页：公众号网页授权 `/connect/oauth2/authorize`，`snsapi_base`，回调 `https://socthink.cn/api/auth/parent/wechat/callback`；必须使用公众号 AppID 和密钥。
- PC 网页：已批准网站应用的 `/connect/qrconnect` 和 `snsapi_login`，沿用现有一次性 QR ticket；绝不能用扫码 AppID 兑换公众号 code。
- 手机普通浏览器：引导用同一手机分享到微信中打开，绝不生成无法自拍的 PC 二维码。
- 登录成功回到原教师工作台/具体学生作业；未拿到真实微信回调前，模拟浏览器通过不代表真机授权成功。

## 微信官方资料与配置要求
- 公众号网页授权：https://developers.weixin.qq.com/doc/offiaccount/OA_Web_Apps/Wechat_webpage_authorization.html
- 网站应用微信登录：https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login/Wechat_Login.html
- 微信支付官方排障（10003/10005）：https://pay.wechatpay.cn/doc/v3/partner/4012525474
- 公众号后台 https://mp.weixin.qq.com ：检查当前用于 `WECHAT_OPEN_APPID` 的**同一个公众号**，网页授权接口权限、网页授权回调域名 **socthink.cn**（不能填写协议、端口和 URL 路径），以及域名验证文件是否仍能由正式站根路径访问。
- 微信开放平台 https://open.weixin.qq.com ：检查公众号和网站应用是否绑定**同一个开放平台主体/帐号**，及官网实际返回的 UnionID；不允许通过 OpenID、昵称或头像推测两端同一人。

## 生产日志证据（从 Nginx URL、状态码与 UA 汇总，不输出 OAuth 凭证）
- 2026-11-15 10:48–10:53：微信客户端向公众号网页授权入口发起 6 次 GET，均 307 到微信官方；没有对应的手机 callback。
- 同小时：网站 QR 回调 HTTP 200 共两次，不能据此判断公众号授权已成功。
- 14:00 有两次 `/login?wechat=failed`，属于授权失败展示记录；无法仅靠此证明微信官方错误码。服务日志未出现可可靠定位的真实手机回调。
- `/MP_verify_*.txt` 文件存在，但存在不等于当前公众号的网页授权域名、接口权限或 AppID 均正确。

## 修复范围
- 移动端授权必须明确使用 `official_account` 的 AppID 和密钥；与全局网站模式设置解耦。
- 新版使用服务器签名的单浏览器多授权状态 Cookie；至少覆盖多窗口同时打开教师和作业、不同 next 路径、10 分钟 TTL、非法/篡改签名拒绝。旧版单状态 Cookie 仅暂时作为已有授权流程兼容读取。
- 微信用户身份按真实 OAuth 来源分别记网站 OpenID / 公众号 OpenID；跨 AppID 只能依据官方返回的 UnionID 统一。UnionID 缺失时不自行合并记录或授予教师权限；查出身份冲突时拒绝自动合并，保留已有成绩和授权。
- 成功日志只报告授权类型及是否返回 UnionID，不记录 OAuth code、OpenID、UnionID、AppSecret、AccessToken 或个人信息。

## 验收状态
- 程序隔离模拟：两次并发授权的 state/next 无覆盖，篡改/过期拒绝，官网 AppID 模式强制正确，公众号/网站 UnionID 同人身份合并和冲突保护。
- 发布后必须核对部署 SHA、线上页面、未登录边界和旧 PC QR；正式手机微信完成一次由微信官方签发的 code 真实回调，最终能打开教师工作台、保留教师权限。没有这种原始回执，不得宣称手机微信授权彻底解决。
- 若微信弹 10003，先核对当前公众号网页授权域名是否填写为 `socthink.cn`；10005，核对接口权限及账号主体认证。不能在代码层用其它 AppID/签名绕过微信官方的权限。
