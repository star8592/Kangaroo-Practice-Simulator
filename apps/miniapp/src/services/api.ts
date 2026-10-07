import Taro from '@tarojs/taro'

const BASE = process.env.TARO_APP_API_BASE || 'https://socthink.cn'
const TOKEN_KEY = 'socthink_access_token'
const USER_KEY = 'socthink_user'

export const authStore = {
  token: () => String(Taro.getStorageSync(TOKEN_KEY) || ''),
  user: () => Taro.getStorageSync(USER_KEY) || null,
  save(token: string, user: unknown) { Taro.setStorageSync(TOKEN_KEY, token); Taro.setStorageSync(USER_KEY, user) },
  clear() { Taro.removeStorageSync(TOKEN_KEY); Taro.removeStorageSync(USER_KEY) }
}

let loginPending: Promise<void> | null = null
export async function ensureWechatSession(force = false): Promise<void> {
  if (!force && authStore.token()) return
  if (!loginPending) {
    loginPending = (async () => {
      const login = await Taro.login()
      if (!login.code) throw new Error('微信登录失败，请重试')
      const res = await Taro.request<any>({url: BASE + '/api/auth/miniapp/wechat',method:'POST',data:{code:login.code},header:{'content-type':'application/json'}})
      if (res.statusCode < 200 || res.statusCode >= 300 || !res.data?.accessToken) throw new Error(res.data?.error || '微信登录暂不可用，请稍后重试')
      authStore.save(res.data.accessToken,res.data.user)
    })().finally(() => { loginPending = null })
  }
  return loginPending
}
export async function api<T = any>(path: string, options: { method?: 'GET'|'POST'|'PATCH'; data?: unknown; auth?: boolean } = {}): Promise<T> {
  // Public catalogues must remain available even if identity services are unavailable.
  const request = async (token: string) => Taro.request<T>({
    url: BASE + path, method: options.method || 'GET', data: options.data,
    header: {'content-type':'application/json', ...(options.auth === false || !token ? {} : {Authorization: `Bearer ${token}`})}
  })
  let token = authStore.token()
  if (!token && options.auth !== false) {
    await ensureWechatSession(); token = authStore.token()
  }
  let res = await request(token)
  if (res.statusCode === 401 && options.auth !== false) {
    const isWechat = authStore.user()?.username === 'wechat' || authStore.user()?.candidateNo === 'WECHAT'
    const method = options.method || 'GET'
    const data = options.data as Record<string, unknown> | undefined
    // A stale WeChat token is safe to replace only before a new activity starts.
    // Never rotate identity during check/finish or other stateful writes: their
    // server tickets are bound to the original guest identity.
    const safeWechatRetry = method === 'GET' || (
      method === 'POST' &&
      (path === '/api/miniapp/arithmetic/session' && data?.action === 'start')
    )
    if (isWechat && safeWechatRetry) {
      authStore.clear()
      try { await ensureWechatSession(true); res = await request(authStore.token()) } catch { /* preserve original response */ }
    }
  }
  if (res.statusCode === 401 && options.auth !== false && authStore.user()?.username !== 'wechat') {
    throw new Error('登录已失效，请重新登录；当前作答不会被自动清除')
  }
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error((res.data as any)?.error || `请求失败（${res.statusCode}）`)
  }
  return res.data
}
export const goLoginIfNeeded = () => false
