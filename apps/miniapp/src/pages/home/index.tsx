import { useEffect, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, authStore } from '../../services/api'

export default function HomePage(){
  const [analytics,setAnalytics]=useState<any>(null)
  const user=authStore.user()
  useEffect(()=>{api('/api/student/analytics').then(setAnalytics).catch(()=>{})},[])

  const openArithmetic=async()=>{
    try{await Taro.switchTab({url:'/pages/arithmetic/index'})}
    catch{
      try{await Taro.reLaunch({url:'/pages/arithmetic/index'})}
      catch{Taro.showToast({title:'计算训练暂时无法打开，请重试',icon:'none'})}
    }
  }

  const arithmeticSessions=Number(analytics?.arithmetic?.sessions||0)
  const examAttempts=Number(analytics?.overview?.examAttempts||0)
  const accuracy=Math.round(Number(analytics?.overview?.accuracy||0)*100)
  const readiness=analytics?.readiness
  const dataConfidence=Number(analytics?.dataConfidence||0)
  const nextPlan=(analytics?.nextPlan||[]).slice(0,2)
  const recommendedExams=(analytics?.recommendedExams||[]).slice(0,2)
  const arithmeticSummary=(analytics?.arithmetic?.plan?.summaryZh||[]).slice(0,2)
  const hasHistory=arithmeticSessions>0||examAttempts>0

  return <View className='page'>
    <View className='hero'>
      <View className='muted' style='color:#cbd5e1'>你好，{user?.name||'同学'}</View>
      <Text className='big'>{hasHistory?'继续今天的数学训练':'先完成一次能力诊断'}</Text>
      <View><Text>{hasHistory?'保持计算手感，也可以直接进入竞赛实战。':'不需要先填资料，完成后立即看到本次结果。'}</Text></View>
      <Button className='primary' style='background:#fff;color:#111827' onClick={openArithmetic}>{hasHistory?'继续计算训练':'开始能力诊断'}</Button>
    </View>

    <View className='grid2'>
      <View className='card'><View className='card-title'>计算训练</View><Text className='big'>{arithmeticSessions}</Text><View className='muted'>累计训练轮次</View></View>
      <View className='card'><View className='card-title'>竞赛实战</View><Text className='big'>{examAttempts}</Text><View className='muted'>已完成试卷</View></View>
    </View>

    <View className='grid2'>
      <View className='card'><View className='card-title'>综合训练指数</View><Text className='big'>{readiness===null||readiness===undefined?'—':readiness}</Text><View className='muted'>{readiness===null||readiness===undefined?'数据积累后显示':'满分 100'}</View></View>
      <View className='card'><View className='card-title'>数据置信度</View><Text className='big'>{dataConfidence}%</Text><View className='muted'>基于完整训练记录</View></View>
    </View>

    <View className='card'>
      <View className='card-title'>最近学习画像</View>
      <View className='row'><Text>竞赛题正确率</Text><Text>{examAttempts?accuracy+'%':'—'}</Text></View>
      <View className='muted'>训练、竞赛和复盘使用与 Web 相同的数据与评分规则。</View>
    </View>

    <View className='card'>
      <View className='card-title'>下一步怎么练</View>
      {nextPlan.length?nextPlan.map((x:any,i:number)=><View key={i} style='margin-top:16rpx'><View>{x.title}</View><View className='muted'>{x.action}</View></View>):<View className='muted'>继续完成训练后，系统会根据稳定证据给出优先级。</View>}
    </View>

    <View className='card'>
      <View className='card-title'>计算画像</View>
      {arithmeticSummary.length?arithmeticSummary.map((x:string,i:number)=><View className='muted' key={i}>{x}</View>):<View className='muted'>完成一次计算诊断后生成。</View>}
      <Button className='secondary' onClick={openArithmetic}>进入计算训练</Button>
    </View>

    {recommendedExams.length>0&&<View className='card'>
      <View className='card-title'>推荐下一套试卷</View>
      {recommendedExams.map((ex:any)=><View key={ex.id} style='margin-top:16rpx'><View>{ex.name}</View><View className='muted'>{ex.country||''} · {ex.year||''} · {ex.questionCount} 题</View><Button className='secondary' onClick={()=>Taro.navigateTo({url:`/pages/exam/index?examId=${encodeURIComponent(ex.id)}`})}>开始这套</Button></View>)}
    </View>}

    <View className='card'><View className='card-title'>我的比赛</View><View className='muted'>倒计时 · 模考 · 考前清单 · 成绩</View><Button className='secondary' onClick={()=>Taro.navigateTo({url:'/pages/events/index'})}>进入赛事服务</Button></View>
  </View>
}
