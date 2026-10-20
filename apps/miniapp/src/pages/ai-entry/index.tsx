import { useState } from 'react'
import { Button, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import {
  AI_ARITHMETIC_INTENT_KEY, makeAIArithmeticIntent, readAIEntryTarget, takeAgentHandoff
} from '../../services/ai-entry-intent'
import { WORLD_EVENT_INTENT_KEY, makeWorldEventIntent } from '../../services/world-event-intent'

/** Non-TabBar landing page for official AI Handoff. It only navigates; no lesson starts. */
export default function AIEntryPage() {
  const [error, setError] = useState('')
  const [caption, setCaption] = useState('正在打开数学学习服务…')
  useLoad((params) => {
    const callbackTarget = takeAgentHandoff()
    const target = readAIEntryTarget(params) || callbackTarget
    if (!target) {
      setError('微信 AI 入口信息不完整，请返回首页选择服务。')
      return
    }
    const isTraining = target.mode === 'arithmetic'
    setCaption(isTraining ? '正在打开计算训练…' : '正在打开国际赛事管家…')
    try {
      if (isTraining && target.grade !== null) {
        const gradeIntent = makeAIArithmeticIntent(target.grade)
        if (gradeIntent) Taro.setStorageSync(AI_ARITHMETIC_INTENT_KEY, gradeIntent)
      } else if (target.mode === 'events' && target.eventId !== null) {
        const eventIntent = makeWorldEventIntent(target.eventId)
        if (eventIntent) Taro.setStorageSync(WORLD_EVENT_INTENT_KEY, eventIntent)
      }
    } catch {
      setError('暂时无法保存导航信息，请从首页重新进入。')
      return
    }
    const url = isTraining ? '/pages/arithmetic/index' : '/pages/events/index'
    Taro.nextTick(() => {
      void Taro.switchTab({url}).catch(() => {
        setError('页面暂时打不开，请点击下面的按钮重试。')
      })
    })
  })
  return <View className='page'>
    <View className='hero'>{error || caption}</View>
    {error && <Button className='primary' onClick={() => void Taro.switchTab({url:'/pages/home/index'})}>
      返回数学首页
    </Button>}
  </View>
}
