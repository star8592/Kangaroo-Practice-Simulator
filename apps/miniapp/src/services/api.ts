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
export async function ensureGuestSession(): Promise<void> {
  if (authStore.token()) return
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
    // Never redirect away from an active exam or erase its answers.
    // Only safe GETs may be retried: POSTs can have side effects or be bound to an existing exam session.
    if ((options.method || 'GET') === 'GET') {
      authStore.clear()
      try { await ensureGuestSession(); res = await request(authStore.token()) } catch { /* preserve original response */ }
    }
  }
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error((res.data as any)?.error || `请求失败（${res.statusCode}）`)
  }
  return res.data
}
export const goLoginIfNeeded = () => false
