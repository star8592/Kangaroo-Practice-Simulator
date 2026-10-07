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

let guestPending: Promise<void> | null = null
export async function ensureGuestSession(force = false): Promise<void> {
  if (!force && authStore.token()) return
  if (!guestPending) {
    guestPending = (async () => {
      const res = await Taro.request<any>({url: BASE + '/api/auth/miniapp/guest',method:'POST',header:{'content-type':'application/json'}})
      if (res.statusCode < 200 || res.statusCode >= 300 || !res.data?.accessToken) throw new Error('游客会话暂不可用，请稍后重试')
      authStore.save(res.data.accessToken,res.data.user)
    })().finally(() => { guestPending = null })
  }
  return guestPending
}
export async function api<T = any>(path: string, options: { method?: 'GET'|'POST'|'PATCH'; data?: unknown; auth?: boolean } = {}): Promise<T> {
  // Public catalogues must remain available even if identity services are unavailable.
  const request = async (token: string) => Taro.request<T>({
    url: BASE + path, method: options.method || 'GET', data: options.data,
    header: {'content-type':'application/json', ...(options.auth === false || !token ? {} : {Authorization: `Bearer ${token}`})}
  })
  let token = authStore.token()
  if (!token && options.auth !== false) {
    try { await ensureGuestSession(); token = authStore.token() } catch { /* Public endpoints may still succeed. */ }
  }
  let res = await request(token)
  if (res.statusCode === 401 && options.auth !== false) {
    const isGuest = authStore.user()?.username === 'guest' || authStore.user()?.candidateNo === 'GUEST'
    const method = options.method || 'GET'
    const data = options.data as Record<string, unknown> | undefined
    // A stale guest token is safe to replace only before a new activity starts.
    // Never rotate identity during check/finish or other stateful writes: their
    // server tickets are bound to the original guest identity.
    const safeGuestRetry = method === 'GET' || (
      method === 'POST' &&
      (path === '/api/miniapp/arithmetic/session' && data?.action === 'start')
    )
    if (isGuest && safeGuestRetry) {
      authStore.clear()
      try { await ensureGuestSession(true); res = await request(authStore.token()) } catch { /* preserve original response */ }
    }
  }
  if (res.statusCode === 401 && options.auth !== false && authStore.user()?.username !== 'guest') {
    throw new Error('登录已失效，请重新登录；当前作答不会被自动清除')
  }
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error((res.data as any)?.error || `请求失败（${res.statusCode}）`)
  }
  return res.data
}
export const goLoginIfNeeded = () => false
