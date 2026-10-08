import { useEffect, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api } from '../../services/api'

export default function HomePage(){
  const openArithmetic=async()=>{
    try{
      await Taro.switchTab({url:'/pages/arithmetic/index'})
    }catch{
      try{await Taro.reLaunch({url:'/pages/arithmetic/index'})}
      catch{Taro.showToast({title:'计算训练暂时无法打开，请重试',icon:'none'})}
    }
  }
  const [analytics,setAnalytics]=useState<any>(null)
  useEffect(()=>{api('/api/student/analytics').then(setAnalytics).catch(()=>{})},[])
  const arithmeticSessions=Number(analytics?.arithmetic?.sessions||0)
  const examAttempts=Number(analytics?.overview?.examAttempts||0)
  const accuracy=Math.round(Number(analytics?.overview?.accuracy||0)*100)
  const hasHistory=arithmeticSessions>0||examAttempts>0
  return <View className='page'>
    <View className='hero'>
      <View className='eyebrow'>数学训练与竞赛</View>
      <Text className='big'>{hasHistory?'继续今天的数学训练':'先知道哪里卡住，再决定怎么练'}</Text>
      <View className='hero-copy'><Text>{hasHistory?'继续保持计算手感，也可以直接进入竞赛实战。':'微信里直接开始，不需要先填一堆资料；完成后马上看到本次结果。'}</Text></View>
      <Button className='primary hero-primary' onClick={openArithmetic}>{hasHistory?'继续计算训练':'开始能力诊断'}</Button>
      <Button className='hero-secondary' onClick={()=>Taro.switchTab({url:'/pages/competitions/index'})}>进入竞赛实战</Button>
    </View>
    <View className='grid2'>
      <View className='card'><View className='card-title'>计算训练</View><Text className='big'>{arithmeticSessions}</Text><View className='muted'>累计训练轮次</View></View>
      <View className='card'><View className='card-title'>竞赛实战</View><Text className='big'>{examAttempts}</Text><View className='muted'>已完成试卷</View></View>
    </View>
    <View className='card'><View className='card-title'>我的比赛</View><View className='muted'>倒计时 · 模考 · 考前清单 · 成绩</View><Button className='secondary' onClick={()=>Taro.navigateTo({url:'/pages/events/index'})}>进入赛事服务</Button></View>
    <View className='card'><View className='card-title'>最近学习画像</View><View className='row'><Text>竞赛题正确率</Text><Text>{examAttempts&&accuracy?accuracy+'%':'—'}</Text></View><View className='muted'>先显示最有用的结论；训练、竞赛和复盘使用与 Web 相同的数据与评分规则。</View></View>
  </View>
}
