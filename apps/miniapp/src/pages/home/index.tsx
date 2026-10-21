import { useEffect, useState } from 'react'
import { Button, Picker, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, authStore, ensureWechatSession } from '../../services/api'
import { canStartFullExam, makeExamLoginPath, makeExamPath } from '../../services/exam-access'
import { openWorldEvent } from '../../services/world-event-navigation'
import {CALC_START_INTENT_KEY,CALC_GRADE_KEY,GRADE_LABELS,preferredGrade} from '../../services/calculation-entry'

export default function HomePage(){
  const [analytics,setAnalytics]=useState<any>(null)
  const [showDetails,setShowDetails]=useState(false)
  const [chosenGrade,setChosenGrade]=useState<number|null>(()=>preferredGrade(authStore.user(),Taro.getStorageSync(CALC_GRADE_KEY)))
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
      const selected=preferredGrade(authStore.user(),chosenGrade)
      if(selected===null){Taro.showToast({title:'先选择孩子的年级',icon:'none'});return}
      Taro.setStorageSync(CALC_GRADE_KEY,selected)
      Taro.setStorageSync(CALC_START_INTENT_KEY,{grade:selected,at:Date.now()})
      await Taro.switchTab({url:'/pages/arithmetic/index'})
    }
    catch{Taro.showToast({title:'暂时无法开始计算，请重试',icon:'none'})}
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
    {wechatConnection==='failed'&&<View className='card' role='alert'>
      <View className='card-title'>微信身份暂时未连接</View>
      <View className='muted'>网络恢复后可以一键重试。为避免学习记录丢失，系统不会自动给你创建新的游客账号。</View>
      <Button className='primary' onClick={()=>void retryWechat()}>重新连接微信</Button>
    </View>}
    <View className='hero'>
      <View className='muted' style='color:#cbd5e1'>你好，{greeting}</View>
      <Text className='big'>打开就算，每一道题都有价值</Text>
      <View className='hero-copy'>做得稳就少做，遇到卡点再针对性练。</View>
      <Picker mode='selector' range={GRADE_LABELS} value={chosenGrade===null?0:chosenGrade-1} onChange={e=>{const n=Number(e.detail.value)+1;setChosenGrade(n);Taro.setStorageSync(CALC_GRADE_KEY,n)}}><View className='calc-grade-choice'>{chosenGrade===null?'首次使用 · 请选择年级':GRADE_LABELS[chosenGrade-1]+' · 点击可切换'}　⌄</View></Picker>
      <Button className='primary hero-primary' onClick={openArithmetic}>{hasHistory?'继续做题 →':'立即开始计算 →'}</Button>
      <View className='calc-hero-foot'>少做无效题 · 自动批改 · 智能安排下一题</View>
    </View>

    {hasHistory&&<Button className='secondary' onClick={()=>setShowDetails(x=>!x)}>{showDetails?'收起学习详情':'查看学习详情'}</Button>}

    {hasHistory&&showDetails&&<View className='grid2'>
      <View className='card'><View className='card-title'>计算训练</View><Text className='big'>{arithmeticSessions}</Text><View className='muted'>累计训练轮次</View></View>
      <View className='card'><View className='card-title'>竞赛实战</View><Text className='big'>{examAttempts}</Text><View className='muted'>已完成试卷</View></View>
    </View>}

    {hasHistory&&showDetails&&<View className='grid2'>
      <View className='card'><View className='card-title'>综合训练指数</View><Text className='big'>{readiness===null||readiness===undefined?'—':readiness}</Text><View className='muted'>{readiness===null||readiness===undefined?'数据积累后显示':'满分 100'}</View></View>
      <View className='card'><View className='card-title'>数据置信度</View><Text className='big'>{dataConfidence}%</Text><View className='muted'>基于完整训练记录</View></View>
    </View>}

    {hasHistory&&showDetails&&<View className='card'>
      <View className='card-title'>最近学习画像</View>
      <View className='row'><Text>竞赛题正确率</Text><Text>{examAttempts?accuracy+'%':'—'}</Text></View>
      <View className='muted'>训练、竞赛和复盘使用与 Web 相同的数据与评分规则。</View>
    </View>}

    {hasHistory&&showDetails&&<View className='card'>
      <View className='card-title'>下一步怎么练</View>
      {nextPlan.length?nextPlan.map((x:any,i:number)=><View key={i} style='margin-top:16rpx'><View>{x.title}</View><View className='muted'>{x.action}</View></View>):<View className='muted'>继续完成训练后，系统会根据稳定证据给出优先级。</View>}
    </View>}

    {hasHistory&&showDetails&&<View className='card'>
      <View className='card-title'>计算画像</View>
      {arithmeticSummary.length?arithmeticSummary.map((x:string,i:number)=><View className='muted' key={i}>{x}</View>):<View className='muted'>完成一次计算诊断后生成。</View>}
      <Button className='secondary' onClick={openArithmetic}>进入计算训练</Button>
    </View>}

    {!hasHistory&&<View className='card'><View className='card-title'>第一次来？</View><View className='muted'>从计算训练开始，不用先填注册表。训练后查看成绩和标准讲解；如需找回网站上的既有成绩，可从“我的”切换到原学生账号；跨端绑定功能正在完善。</View></View>}

    {recommendedExams.length>0&&<View className='card'>
      <View className='card-title'>推荐下一套试卷</View>
      {recommendedExams.map((ex:any)=><View key={ex.id} style='margin-top:16rpx'><View>{ex.name}</View><View className='muted'>{ex.country||''} · {ex.year||''} · {ex.questionCount} 题</View><Button className='secondary' onClick={()=>void openRecommendedExam(String(ex.id))}>开始这套</Button></View>)}
    </View>}

    <View className='card'><View className='card-title'>我的比赛</View><View className='muted'>倒计时 · 模考 · 考前清单 · 成绩</View><Button className='secondary' onClick={()=>void openWorldEvent().catch(()=>Taro.showToast({title:'赛事暂时无法打开',icon:'none'}))}>进入赛事服务</Button></View>
  </View>
}
