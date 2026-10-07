import { useEffect, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, authStore, goLoginIfNeeded } from '../../services/api'

export default function HomePage(){
  const [analytics,setAnalytics]=useState<any>(null)
  const user=authStore.user()
  useEffect(()=>{api('/api/student/analytics').then(setAnalytics).catch(()=>{})},[])
  const accuracy=Math.round(Number(analytics?.overview?.accuracy||0)*100)
  return <View className='page'>
    <View className='hero'><View className='muted' style='color:#cbd5e1'>你好，{user?.name||'同学'}</View><Text className='big'>今天先完成 10 分钟计算</Text><View><Text>保持计算手感，再去打竞赛实战。</Text></View><Button className='primary' style='background:#fff;color:#111827' onClick={()=>Taro.switchTab({url:'/pages/arithmetic/index'})}>开始今日计算</Button></View>
    <View className='grid2'>
      <View className='card'><View className='card-title'>计算训练</View><Text className='big'>{analytics?.arithmetic?.sessions||0}</Text><View className='muted'>累计训练轮次</View></View>
      <View className='card'><View className='card-title'>竞赛实战</View><Text className='big'>{analytics?.overview?.examAttempts||0}</Text><View className='muted'>已完成试卷</View></View>
    </View>
    <View className='card'><View className='card-title'>我的比赛</View><View className='muted'>倒计时 · 模考 · 考前清单 · 成绩</View><Button className='secondary' onClick={()=>Taro.navigateTo({url:'/pages/events/index'})}>进入赛事服务</Button></View>
    <View className='card'><View className='card-title'>最近学习画像</View><View className='row'><Text>竞赛题正确率</Text><Text>{accuracy?accuracy+'%':'—'}</Text></View><View className='muted'>完整分析保留在 Web，小程序只呈现下一步最有用的信息。</View></View>
  </View>
}
