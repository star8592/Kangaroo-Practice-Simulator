import { useEffect, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, authStore, ensureWechatSession } from '../../services/api'
import { canStartFullExam, makeExamLoginPath, makeExamPath } from '../../services/exam-access'
import { openWorldEvent } from '../../services/world-event-navigation'
import { learnerNextAction } from '../../services/learning-home-copy'

export default function HomePage(){
  const [analytics,setAnalytics]=useState<any>(null)
  const [user,setUser]=useState<any>(authStore.user())
  const [wechatConnection,setWechatConnection]=useState<'connecting'|'ready'|'failed'>('connecting')
  useEffect(()=>{
    let current=true
    const connect=async()=>{
      try{
        await ensureWechatSession(false,false)
        if(current){setUser(authStore.user());setWechatConnection('ready')}
      }catch{
        if(current){setUser(authStore.user());setWechatConnection('failed')}
      }
    }
    void connect()
    return ()=>{current=false}
  },[])
  useEffect(()=>{
    if(wechatConnection!=='ready'||!user?.id)return
    let current=true
    api('/api/student/analytics').then(data=>{if(current)setAnalytics(data)}).catch(()=>{})
    return ()=>{current=false}
  },[wechatConnection,user?.id])
  const retryWechat=async()=>{
    setWechatConnection('connecting')
    try{await ensureWechatSession(true,false);setUser(authStore.user());setAnalytics(null);setWechatConnection('ready')}
    catch(e){setWechatConnection('failed');void Taro.showToast({title:e instanceof Error?e.message:'微信身份连接失败',icon:'none'})}
  }
  const greeting=user?.username==='guest'||user?.username==='wechat'?'同学':user?.name||'同学'
  const next=learnerNextAction(analytics)
  const sessionCount=Number(analytics?.arithmetic?.sessions||0)
  const examCount=Number(analytics?.overview?.examAttempts||0)
  const hasHistory=sessionCount>0||examCount>0
  const openRecommendedExam=async(id:string)=>{
    try {
      if(!authStore.token())await ensureWechatSession()
      const url=canStartFullExam(authStore.user())?makeExamPath(id):makeExamLoginPath(id)
      await Taro.navigateTo({url})
    }catch(e){void Taro.showToast({title:e instanceof Error?e.message:'无法打开试卷，请重试',icon:'none'})}
  }
  const openArithmetic=async()=>{
    try{
      if(!authStore.token()||authStore.user()?.username==='guest')await ensureWechatSession(false,false)
      await Taro.switchTab({url:'/pages/arithmetic/index'})
    }catch{
      try{await Taro.reLaunch({url:'/pages/arithmetic/index'})}
      catch{void Taro.showToast({title:'计算训练暂时无法打开，请重试',icon:'none'})}
    }
  }
  const openProfile=()=>Taro.switchTab({url:'/pages/profile/index'})
  const recommendedExams=(analytics?.recommendedExams||[]).slice(0,1)
  return <View className='page'>
    {wechatConnection==='failed'&&<View className='card' role='alert'>
      <View className='card-title'>微信身份暂时未连接</View>
      <View className='muted'>连接恢复后可重试，系统不会为你悄悄换成一个新的游客身份。</View>
      <Button className='primary' onClick={()=>void retryWechat()}>重新连接微信</Button>
    </View>}
    <View className='hero'>
      <View className='muted' style='color:#cbd5e1'>你好，{greeting}</View>
      <Text className='big'>计算训练，直接开始</Text>
      <View className='hero-copy'>小学 · 初中 · 高中均可练</View>
      <Button className='primary hero-primary' onClick={()=>void openArithmetic()}>开始计算训练</Button>
    </View>
    {hasHistory&&<View className='card learning-action-card'>
      <View className='card-title'>今天最值得做什么</View>
      <Text className='learning-action-title'>{next.title}</Text>
      <View className='muted'>{next.detail}</View>
      <Button className='primary' onClick={()=>void openArithmetic()}>{next.action}</Button>
      <Button className='text-action' onClick={()=>void openProfile()}>查看推荐依据 →</Button>
    </View>}
    {hasHistory&&<View className='card'>
      <View className='card-title'>最近练习有变化吗？</View>
      <View className='muted'>{analytics?.arithmetic?.recentChange?.descriptionZh||'还没有足够的同年级、同模式练习可比较。暂时不推断孩子进步或退步。'}</View>
      <Button className='secondary' onClick={()=>void openProfile()}>看学习情况和下一步</Button>
    </View>}
    <View className='card'>
      <View className='card-title'>想参加数学竞赛？</View>
      <View className='muted'>计算训练和竞赛模拟是两件事。可以自主进入试卷，或用赛事管家安排报名和考前准备。</View>
      <Button className='secondary' onClick={()=>Taro.switchTab({url:'/pages/competitions/index'})}>进入竞赛模拟</Button>
      <Button className='text-action' onClick={()=>void openWorldEvent().catch(()=>Taro.showToast({title:'赛事暂时无法打开',icon:'none'}))}>探索全球数学赛事 →</Button>
    </View>
    {recommendedExams.map((ex:any)=><View className='card' key={ex.id}>
      <View className='card-title'>有一份适合当前年级的试卷</View>
      <View>{ex.name}</View>
      <View className='muted'>{ex.country||''} · {ex.year||''} · {ex.questionCount} 题</View>
      <Button className='secondary' onClick={()=>void openRecommendedExam(String(ex.id))}>打开这套试卷</Button>
    </View>)}
  </View>
}
