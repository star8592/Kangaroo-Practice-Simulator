/** Sanitized auth.code2Session error classifications.
 * Never accept/report a code, AppSecret, OpenID or session_key here.
 */
export type WechatCode2SessionIssue={
  reason:string;
  status:number;
  publicMessage:string;
}
export function classifyWechatCode2SessionError(code:number):WechatCode2SessionIssue {
  if (code===40029||code===40163) return {
    reason:'invalid_one_time_code',status:401,
    publicMessage:'微信临时登录凭证无效，请重新进入小程序再试'
  }
  if (code===45011) return {
    reason:'wechat_rate_limit',status:429,
    publicMessage:'微信登录请求过于频繁，请稍后重试'
  }
  if (code===40164) return {
    reason:'wechat_ip_whitelist',status:503,
    publicMessage:'微信服务器接口尚未配置访问白名单，请联系管理员'
  }
  if (code===40125||code===40001||code===40013) return {
    reason:'wechat_configuration',status:503,
    publicMessage:'微信小程序身份服务配置异常，请联系管理员'
  }
  if (code===-1) return {
    reason:'wechat_busy',status:503,
    publicMessage:'微信服务器暂时繁忙，请稍后重试'
  }
  return {
    reason:'wechat_unknown_error',status:502,
    publicMessage:'微信身份验证服务异常，请稍后重试'
  }
}
