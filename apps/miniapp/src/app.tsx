import type { PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'
import { ensureWechatSession } from './services/api'
import { noteAgentHandoff } from './services/ai-entry-intent'
import './app.css'

export default function App({ children }: PropsWithChildren) {
  // Establish the stable WeChat learning identity in the background before the
  // user reaches a training surface. Existing student-account sessions are kept.
  useLaunch(() => {
    // Official WeChat AI handoff callback may fire before the landing page onLoad.
    // Store only a validated, ephemeral navigation intent; ignore arbitrary payload.
    const runtime = (globalThis as typeof globalThis & {
      wx?: { onAgentHandoff?: (handler: (event: unknown) => void) => void }
    }).wx
    if (typeof runtime?.onAgentHandoff === 'function') {
      runtime.onAgentHandoff(event => { noteAgentHandoff(event) })
    }
    void ensureWechatSession().catch(() => {})
  })
  return children
}
