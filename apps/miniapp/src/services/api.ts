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

export async function api<T = any>(path: string, options: { method?: 'GET'|'POST'|'PATCH'; data?: unknown; auth?: boolean } = {}) {
  const token = authStore.token()
  const res = await Taro.request<T>({
    url: BASE + path,
    method: options.method || 'GET',
    data: options.data,
    header: {
      'content-type': 'application/json',
      ...(options.auth === false || !token ? {} : { Authorization: `Bearer ${token}` })
    }
  })
  if (res.statusCode === 401 && options.auth !== false) {
    authStore.clear()
    Taro.reLaunch({ url: '/pages/login/index' })
    throw new Error('登录已失效')
  }
  if (res.statusCode < 200 || res.statusCode >= 300) {
    const message = (res.data as any)?.error || `请求失败（${res.statusCode}）`
    throw new Error(message)
  }
  return res.data
}

export const goLoginIfNeeded = () => {
  if (!authStore.token()) {
    Taro.reLaunch({ url: '/pages/login/index' })
    return true
  }
  return false
}
