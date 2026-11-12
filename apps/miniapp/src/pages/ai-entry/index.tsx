import { useRef, useState } from 'react'
import { Button, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { readAIEntryTarget, takeAgentHandoff, type AIEntryTarget } from '../../services/ai-entry-intent'
import { navigateFromAIEntry } from '../../services/ai-entry-navigation'

/** Non-TabBar landing page for official AI Handoff. It only navigates; no lesson starts. */
export default function AIEntryPage() {
  const [error, setError] = useState('')
  const [caption, setCaption] = useState('正在打开数学学习服务…')
  const targetRef = useRef<AIEntryTarget | null>(null)
  const navigating = useRef(false)

  const openTarget = () => {
    const target = targetRef.current
    if (!target || navigating.current) return
    navigating.current = true
    setError('')
    setCaption(target.mode === 'arithmetic' ? '正在打开计算训练…' : '正在打开国际赛事管家…')
    Taro.nextTick(() => {
      void navigateFromAIEntry(target, {
        save: (key, value) => Taro.setStorageSync(key, value),
        remove: key => Taro.removeStorageSync(key),
        switchTab: url => Taro.switchTab({url})
      }).catch(() => {
        setError('页面暂时打不开，请重试。')
      }).finally(() => {
        navigating.current = false
      })
    })
  }

  useLoad((params) => {
    // Consume the callback at most once, even when route params take precedence.
    const callbackTarget = takeAgentHandoff()
    const target = readAIEntryTarget(params) || callbackTarget
    if (!target) {
      setError('微信 AI 入口信息不完整，请返回首页选择服务。')
      return
    }
    targetRef.current = target
    openTarget()
  })

  return <View className='page'>
    <View className='hero'>{error || caption}</View>
    {error && targetRef.current && <Button className='primary' onClick={openTarget}>
      重新打开服务
    </Button>}
    {error && <Button className='secondary' onClick={() => void Taro.switchTab({url:'/pages/home/index'})}>
      返回数学首页
    </Button>}
  </View>
}
