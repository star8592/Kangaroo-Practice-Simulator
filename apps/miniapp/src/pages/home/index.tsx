import { useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { api, authStore, ensureWechatSession } from '../../services/api'

export default function HomePage(){
  const [analytics,setAnalytics]=useState<any>(null)
  const [user,setUser]=useState<any>(()=>authStore.user())
  const [connectionError,setConnectionError]=useState('')
  const greeting=user?.username==='guest'?'同学':user?.username==='wechat'?'同学':user?.name||'同学'
  const load=async()=>{
    setConnectionError('')
    try{
      await ensureWechatSession()
      setUser(authStore.user())
      setAnalytics(await api('/api/student/analytics'))
    }catch(e){
      setUser(authStore.user())
      setConnectionError(e instanceof Error?e.message:'小程序无法连接服务器，请检查网络')
    }
  }
  useDidShow(()=>{void load()})

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
      <View className='muted' style='color:#cbd5e1'>你好，{greeting}</View>
      <View className='identity-hint'>{user?.username==='wechat'?'✓ 微信身份已连接':user?.username==='guest'?'临时游客体验 · 尚未连接微信学习档案':user?.id?'已登录学生账号':'正在连接学习服务…'}</View>
      <Text className='big'>{hasHistory?'继续今天的数学训练':'从今天的计算训练开始'}</Text>
      <View><Text>{hasHistory?'保持计算手感，也可以直接进入竞赛实战。':'无需注册或填写资料，直接开始计算，做完就能看到成绩和讲解。'}</Text></View>
      <Button className='primary hero-primary' onClick={openArithmetic}>{hasHistory?'继续计算训练':'开始计算训练'}</Button>
      <Button className='hero-secondary' onClick={()=>Taro.switchTab({url:'/pages/competitions/index'})}>进入竞赛实战</Button>
    </View>

    {!!connectionError&&<View className='card error-card'>
      <View className='card-title'>学习服务尚未连接</View>
      <View className='bad network-error'>{connectionError}</View>
      <Button className='primary' onClick={()=>{void load()}}>重新连接</Button>
    </View>}
    {hasHistory&&<View className='grid2'>
      <View className='card'><View className='card-title'>计算训练</View><Text className='big'>{arithmeticSessions}</Text><View className='muted'>累计训练轮次</View></View>
      <View className='card'><View className='card-title'>竞赛实战</View><Text className='big'>{examAttempts}</Text><View className='muted'>已完成试卷</View></View>
    </View>}

    {hasHistory&&<View className='grid2'>
      <View className='card'><View className='card-title'>综合训练指数</View><Text className='big'>{readiness===null||readiness===undefined?'—':readiness}</Text><View className='muted'>{readiness===null||readiness===undefined?'数据积累后显示':'满分 100'}</View></View>
      <View className='card'><View className='card-title'>数据置信度</View><Text className='big'>{dataConfidence}%</Text><View className='muted'>基于完整训练记录</View></View>
    </View>}

    {hasHistory&&<View className='card'>
      <View className='card-title'>最近学习画像</View>
      <View className='row'><Text>竞赛题正确率</Text><Text>{examAttempts?accuracy+'%':'—'}</Text></View>
      <View className='muted'>训练、竞赛和复盘使用与 Web 相同的数据与评分规则。</View>
    </View>}

    {hasHistory&&<View className='card'>
      <View className='card-title'>下一步怎么练</View>
      {nextPlan.length?nextPlan.map((x:any,i:number)=><View key={i} style='margin-top:16rpx'><View>{x.title}</View><View className='muted'>{x.action}</View></View>):<View className='muted'>继续完成训练后，系统会根据稳定证据给出优先级。</View>}
    </View>}

    {hasHistory&&<View className='card'>
      <View className='card-title'>计算画像</View>
      {arithmeticSummary.length?arithmeticSummary.map((x:string,i:number)=><View className='muted' key={i}>{x}</View>):<View className='muted'>完成一次计算诊断后生成。</View>}
      <Button className='secondary' onClick={openArithmetic}>进入计算训练</Button>
    </View>}

    {!hasHistory&&<View className='card'><View className='card-title'>第一次来？</View><View className='muted'>从计算训练开始，不用先填注册表。训练后查看成绩和标准讲解；如需找回网站上的既有成绩，可从“我的”切换到原学生账号；跨端绑定功能正在完善。</View></View>}

    {recommendedExams.length>0&&<View className='card'>
      <View className='card-title'>推荐下一套试卷</View>
      {recommendedExams.map((ex:any)=><View key={ex.id} style='margin-top:16rpx'><View>{ex.name}</View><View className='muted'>{ex.country||''} · {ex.year||''} · {ex.questionCount} 题</View><Button className='secondary' onClick={()=>Taro.navigateTo({url:`/pages/exam/index?examId=${encodeURIComponent(ex.id)}`})}>开始这套</Button></View>)}
    </View>}

    <View className='card'><View className='card-title'>我的比赛</View><View className='muted'>倒计时 · 模考 · 考前清单 · 成绩</View><Button className='secondary' onClick={()=>Taro.navigateTo({url:'/pages/events/index'})}>进入赛事服务</Button></View>
  </View>
}
