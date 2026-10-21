import { useState } from 'react'
import { Button, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { readAIEntryTarget, takeAgentHandoff } from '../../services/ai-entry-intent'
import { navigateFromAIEntry } from '../../services/ai-entry-navigation'

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
    Taro.nextTick(() => {
      void navigateFromAIEntry(target, {
        save: (key, value) => Taro.setStorageSync(key, value),
        remove: key => Taro.removeStorageSync(key),
        switchTab: url => Taro.switchTab({url})
      }).catch(() => {
        setError('页面暂时打不开，请返回数学首页重新进入。')
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
