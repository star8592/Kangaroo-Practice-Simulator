// wx.request domain validation can block requests before they reach the server.
export function normalizeMiniappNetworkError(error: unknown): Error {
  const message = String((error as { errMsg?: string; message?: string })?.errMsg
    || (error as Error)?.message || error || '')
  if (/domain list|request.*(合法域名|域名)|not in domain|url not in/i.test(message)) {
    return new Error('微信阻止了网络请求，请联系管理员检查小程序服务器合法域名配置。')
  }
  if (/timeout|timed out/i.test(message)) return new Error('连接服务器超时，请检查网络并重试。')
  if (/request:fail|network|connect|fetch|ERR_/i.test(message)) {
    return new Error('无法连接服务器，请重试；持续失败请联系管理员检查微信网络配置。')
  }
  return error instanceof Error ? error : new Error(message || '无法连接服务，请重试。')
}

