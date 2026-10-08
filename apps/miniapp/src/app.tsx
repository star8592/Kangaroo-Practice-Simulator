import type { PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'
import { ensureWechatSession } from './services/api'
import './app.css'

export default function App({ children }: PropsWithChildren) {
  // Establish the stable WeChat learning identity in the background before the
  // user reaches a training surface. Existing student-account sessions are kept.
  useLaunch(() => { void ensureWechatSession().catch(() => {}) })
  return children
}
