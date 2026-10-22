import { useEffect, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, authStore, ensureWechatSession } from '../../services/api'
import { canStartFullExam, makeExamLoginPath, makeExamPath } from '../../services/exam-access'
import { openWorldEvent } from '../../services/world-event-navigation'

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
  const retryWechat=async()=>{
    setWechatConnection('connecting')
    try{await ensureWechatSession(true,false);setUser(authStore.user());setWechatConnection('ready')}
    catch(e){setWechatConnection('failed');Taro.showToast({title:e instanceof Error?e.message:'微信身份连接失败',icon:'none'})}
  }
  const greeting=user?.username==='guest'?'同学':user?.username==='wechat'?'同学':user?.name||'同学'
  useEffect(()=>{api('/api/student/analytics').then(setAnalytics).catch(()=>{})},[])

  const openRecommendedExam=async(id:string)=>{
    try {
      if(!authStore.token())await ensureWechatSession()
      const url=canStartFullExam(authStore.user())?makeExamPath(id):makeExamLoginPath(id)
      await Taro.navigateTo({url})
    }catch(e){
      Taro.showToast({title:e instanceof Error?e.message:'无法打开试卷，请重试',icon:'none'})
    }
  }

  const openArithmetic=async()=>{
    try{
      // Auth must be established before an activity; never create a surprise guest.
      if(!authStore.token() || authStore.user()?.username==='guest')await ensureWechatSession(false,false)
      await Taro.switchTab({url:'/pages/arithmetic/index'})
    }
    catch{
      try{await Taro.reLaunch({url:'/pages/arithmetic/index'})}
      catch{Taro.showToast({title:'计算训练暂时无法打开，请重试',icon:'none'})}
    }
  }

  const arithmeticSessions=Number(analytics?.arithmetic?.sessions||0)
  const examAttempts=Number(analytics?.overview?.examAttempts||0)
  const accuracy=Math.round(Number(analytics?.overview?.accuracy||0)*100)
  const nextPlan=(analytics?.nextPlan||[]).slice(0,2)
  const recommendedExams=(analytics?.recommendedExams||[]).slice(0,2)
  const arithmeticSummary=(analytics?.arithmetic?.plan?.summaryZh||[]).slice(0,2)
  const hasHistory=arithmeticSessions>0||examAttempts>0

  return <View className='page'>
    {wechatConnection==='failed'&&<View className='card' role='alert'>
      <View className='card-title'>微信身份暂时未连接</View>
      <View className='muted'>网络恢复后可以一键重试。为避免学习记录丢失，系统不会自动给你创建新的游客账号。</View>
      <Button className='primary' onClick={()=>void retryWechat()}>重新连接微信</Button>
    </View>}
    <View className='hero'>
      <View className='muted' style='color:#cbd5e1'>你好，{greeting}</View>
      <View className='stage-strip' aria-label='覆盖小学初中高中'>
        <Text className='stage-chip'>小学 · 1–6 年级</Text>
        <Text className='stage-chip'>初中 · 7–9 年级</Text>
        <Text className='stage-chip'>高中 · 10–12 年级</Text>
      </View>
      <Text className='big'>{hasHistory?'继续今天的计算训练':'选年级，立即开始计算'}</Text>
      <View><Text>{hasHistory?'按当前年级继续训练；做完再看真实表现和下一步建议。':'覆盖小学、初中、高中，不用先填资料；直接做题、即时判题。'}</Text></View>
      <Button className='primary hero-primary' onClick={openArithmetic}>{hasHistory?'继续计算训练':'开始计算训练'}</Button>
      <Button className='hero-secondary' onClick={()=>Taro.switchTab({url:'/pages/competitions/index'})}>参加竞赛模拟</Button>
      <Button className='hero-secondary' onClick={()=>void openWorldEvent().catch(()=>Taro.showToast({title:'赛事暂时无法打开',icon:'none'}))}>探索全球数学赛事</Button>
    </View>

    {hasHistory?<View className='card'>
      <View className='card-title'>下一步练什么</View>
      {nextPlan.length?nextPlan.map((x:any,i:number)=><View className='learning-next-item' key={i}>
        <View>{x.title}</View>
        {x.action&&<View className='muted'>{x.action}</View>}
      </View>):<View className='muted'>先完成一组计算训练，积累真实作答后，再给出有依据的练习建议。</View>}
      {arithmeticSummary.length>0&&<View className='learning-evidence'>
        <View className='muted'>计算练习发现</View>
        {arithmeticSummary.map((item:string,i:number)=><View className='muted' key={i}>{item}</View>)}
      </View>}
      <Button className='primary' onClick={openArithmetic}>练下一组</Button>
    </View>:<View className='card'>
      <View className='card-title'>第一次练习，从这里开始</View>
      <View className='muted'>选择小学、初中或高中对应年级，先做一组题。未完成练习前，不给孩子贴能力标签。</View>
      <Button className='secondary' onClick={openArithmetic}>去选年级</Button>
    </View>}

    {hasHistory&&<View className='card'>
      <View className='card-title'>我的练习记录</View>
      <View className='muted'>已完成计算训练 {arithmeticSessions} 轮、竞赛试卷 {examAttempts} 套。</View>
      {examAttempts>0&&<View className='learning-evidence'>
        <View className='row'><Text>竞赛题累计正确率</Text><Text>{accuracy}%</Text></View>
        <View className='muted'>只反映已完成试卷，不等于全部数学能力。</View>
      </View>}
    </View>}

    {recommendedExams.length>0&&<View className='card'>
      <View className='card-title'>推荐下一套试卷</View>
      {recommendedExams.map((ex:any)=><View key={ex.id} style='margin-top:16rpx'><View>{ex.name}</View><View className='muted'>{ex.country||''} · {ex.year||''} · {ex.questionCount} 题</View><Button className='secondary' onClick={()=>void openRecommendedExam(String(ex.id))}>开始这套</Button></View>)}
    </View>}

    <View className='card'><View className='card-title'>我的比赛</View><View className='muted'>倒计时 · 模考 · 考前清单 · 成绩</View><Button className='secondary' onClick={()=>void openWorldEvent().catch(()=>Taro.showToast({title:'赛事暂时无法打开',icon:'none'}))}>进入赛事服务</Button></View>
  </View>
}
