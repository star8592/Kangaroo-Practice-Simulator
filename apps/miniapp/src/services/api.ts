import Taro from '@tarojs/taro'

const BASE = process.env.TARO_APP_API_BASE || 'https://socthink.cn'
const TOKEN_KEY = 'socthink_access_token'
const USER_KEY = 'socthink_user'

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

async function miniappRequest<T>(path: string, settings: Parameters<typeof Taro.request<T>>[0]) {
  try { return await Taro.request<T>({ ...settings, timeout: 12000 }) }
  catch (error) {
    const issue = normalizeMiniappNetworkError(error)
    console.error('[miniapp/network]', path, issue.message)
    throw issue
  }
}

export const authStore = {
  token: () => String(Taro.getStorageSync(TOKEN_KEY) || ''),
  user: () => Taro.getStorageSync(USER_KEY) || null,
  save(token: string, user: unknown) { Taro.setStorageSync(TOKEN_KEY, token); Taro.setStorageSync(USER_KEY, user) },
  clear() { Taro.removeStorageSync(TOKEN_KEY); Taro.removeStorageSync(USER_KEY) }
}

let loginPending: Promise<void> | null = null
// Explicit account switching must not fall back to a NEW guest identity:
// that would hide the existing student's or guest's prior records.
export async function ensureWechatSession(force = false, allowGuestFallback = true): Promise<void> {
  if (!force && authStore.token()) return
  if (!loginPending) {
    loginPending = (async () => {
      let primaryError = '微信登录暂不可用，请稍后重试'
      try {
        const login = await Taro.login()
        if (!login.code) throw new Error('微信登录失败，请重试')
        const res = await miniappRequest<any>('/api/auth/miniapp/wechat', {
          url: BASE + '/api/auth/miniapp/wechat',
          method: 'POST',
          data: { code: login.code },
          header: { 'content-type': 'application/json' }
        })
        if (res.statusCode >= 200 && res.statusCode < 300 && res.data?.accessToken) {
          authStore.save(res.data.accessToken, res.data.user)
          return
        }
        primaryError = res.data?.error || primaryError
      } catch (error) {
        primaryError = error instanceof Error ? error.message : primaryError
      }

      if (!allowGuestFallback) throw new Error(primaryError)

      // Availability safety net: students must still be able to train when the
      // WeChat identity endpoint, credentials, or backend release is unavailable.
      const guest = await miniappRequest<any>('/api/auth/miniapp/guest', {
        url: BASE + '/api/auth/miniapp/guest',
        method: 'POST',
        header: { 'content-type': 'application/json' }
      })
      if (guest.statusCode >= 200 && guest.statusCode < 300 && guest.data?.accessToken) {
        authStore.save(guest.data.accessToken, guest.data.user)
        return
      }
      throw new Error(guest.data?.error || primaryError)
    })().finally(() => { loginPending = null })
  }
  return loginPending
}

export async function api<T = any>(path: string, options: { method?: 'GET'|'POST'|'PATCH'; data?: unknown; auth?: boolean } = {}): Promise<T> {
  const request = async (token: string) => miniappRequest<T>(path, {
    url: BASE + path, method: options.method || 'GET', data: options.data,
    header: {'content-type':'application/json', ...(options.auth === false || !token ? {} : {Authorization: `Bearer ${token}`})}
  })
  let token = authStore.token()
  if (!token && options.auth !== false) {
    await ensureWechatSession(); token = authStore.token()
  }
  let res = await request(token)
  if (res.statusCode === 401 && options.auth !== false) {
    const user = authStore.user()
    const renewableIdentity =
      user?.username === 'wechat' || user?.candidateNo === 'WECHAT' ||
      user?.username === 'guest' || user?.candidateNo === 'GUEST'
    const method = options.method || 'GET'
    const data = options.data as Record<string, unknown> | undefined
    // Identity rotation is safe only before a new activity starts. Never rotate
    // during check/finish because server tickets are bound to the original user.
    const safeRetry = method === 'GET' || (
      method === 'POST' &&
      path === '/api/miniapp/arithmetic/session' &&
      data?.action === 'start'
    )
    if (renewableIdentity && safeRetry) {
      authStore.clear()
      try { await ensureWechatSession(true); res = await request(authStore.token()) } catch { /* preserve original response */ }
    }
  }
  if (res.statusCode === 401 && options.auth !== false) {
    throw new Error('登录已失效，请重新登录；当前作答不会被自动清除')
  }
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error((res.data as any)?.error || `请求失败（${res.statusCode}）`)
  }
  return res.data
}

export const goLoginIfNeeded = () => false
