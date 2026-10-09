import { useEffect, useMemo, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { api, authStore, ensureWechatSession } from '../../services/api'
import { canStartFullExam, makeExamLoginPath, makeExamPath } from '../../services/exam-access'

const groups=[
  {id:'all',label:'全部'},
  {id:'kangaroo',label:'袋鼠数学'},
  {id:'australian-amc',label:'澳洲 AMC'},
  {id:'maa-amc',label:'美国 AMC'},
  {id:'cemc',label:'加拿大 CEMC'},
]

export default function CompetitionsPage(){
  const [exams,setExams]=useState<any[]>([])
  const [competition,setCompetition]=useState('all')
  const [limit,setLimit]=useState(24)
  const [loading,setLoading]=useState(true)
  const [loadError,setLoadError]=useState('')
  const [registered,setRegistered]=useState(canStartFullExam(authStore.user()))

  const loadExams=async()=>{
    setLoading(true);setLoadError('')
    try {
      const data=await api<any>('/api/miniapp/exams')
      if(!Array.isArray(data.exams))throw new Error('试卷列表格式异常')
      setExams(data.exams)
    } catch(e) {
      setLoadError(e instanceof Error?e.message:'试卷列表暂时不可用')
      setExams([])
    } finally {
      setRegistered(canStartFullExam(authStore.user()))
      setLoading(false)
    }
  }
  useEffect(()=>{void loadExams()},[])
  useDidShow(()=>setRegistered(canStartFullExam(authStore.user())))

  const openExam=async(ex:any)=>{
    const examId=ex.paperType==='smart'?String(ex.id)+'--'+Date.now().toString(36):String(ex.id)
    try {
      if(!authStore.token())await ensureWechatSession()
      if(!canStartFullExam(authStore.user())){
        await Taro.navigateTo({url:makeExamLoginPath(examId)})
        return
      }
      await Taro.navigateTo({url:makeExamPath(examId)})
    }catch(e){
      Taro.showToast({title:e instanceof Error?e.message:'无法打开试卷，请重试',icon:'none'})
    }
  }
  const openWebExam=async(id:string)=>{
    try {
      await Taro.setClipboardData({data:'https://socthink.cn/exam/'+encodeURIComponent(id)})
      await Taro.showModal({title:'已复制网页版地址',content:'这套考试有分段计时要求，需要在浏览器打开。链接已复制，请粘贴到浏览器继续。',showCancel:false,confirmText:'知道了'})
    }catch{
      Taro.showToast({title:'复制失败，请稍后重试',icon:'none'})
    }
  }
  const filtered=useMemo(()=>competition==='all'?exams:exams.filter(x=>x.competitionId===competition),[exams,competition])
  return <View className='page'>
    <View className='hero'><View className='eyebrow'>竞赛实战</View><Text className='big'>选赛事，再选一套试卷</Text><View className='hero-copy'>与 Web 使用同一套题库、赛制和评分规则；智能组卷也只在同一赛制内选题。</View></View>
    <View className='competition-tabs'>{groups.filter(g=>g.id==='all'||exams.some(x=>x.competitionId===g.id)).map(g=><Button key={g.id} className={competition===g.id?'competition-tab active':'competition-tab'} onClick={()=>{setCompetition(g.id);setLimit(24)}}>{g.label}</Button>)}</View>
    <View className='card'><View className='card-title'>赛事服务</View><View className='muted'>何时模考、当天带什么、官方流程，一条时间线管到底。</View><Button className='secondary' onClick={()=>Taro.navigateTo({url:'/pages/events/index'})}>查看我的比赛</Button><Button className='secondary' onClick={()=>Taro.navigateTo({url:'/pages/events/index?section=china'})}>中国数学赛事（华杯·希望杯·走美杯）</Button></View>
    <View className='section-title'>{competition==='all'?'可训练试卷':groups.find(g=>g.id===competition)?.label}</View>
    <View className='muted list-summary'>{loading?'正在读取试卷…':loadError?'试卷加载失败，可重试':`共 ${filtered.length} 套，先展示最相关的 ${Math.min(limit,filtered.length)} 套`}</View>
    {filtered.slice(0,limit).map(ex=><View className='card exam-card' key={ex.id}><View className='row'><View className='exam-card-title'><View className='card-title'>{ex.name}</View><View className='muted'>{ex.year||''} · {ex.grades} · {ex.questionCount} 题</View></View><Text className={ex.miniappReady?'status-ready':'status-web'}>{ex.miniappReady?(registered?'可实战':'登录后可实战'):'Web'}</Text></View><Button className={ex.miniappReady?'primary':'secondary'} onClick={()=>ex.miniappReady?void openExam(ex):void openWebExam(String(ex.id))}>{ex.miniappReady?(registered?'开始实战':'登录后实战'):'复制网页版考试链接'}</Button></View>)}
    {!loading&&loadError&&<View className='card'><View className='card-title'>试卷暂时无法载入</View><View className='muted'>{loadError}</View><Button className='primary' onClick={()=>void loadExams()}>重新加载试卷</Button></View>}
    {!loading&&!loadError&&filtered.length===0&&<View className='card'><View className='card-title'>暂无可训练试卷</View><View className='muted'>可以切换到其他赛事。</View></View>}
    {limit<filtered.length&&<Button className='secondary load-more' onClick={()=>setLimit(x=>x+24)}>再显示 24 套</Button>}
  </View>
}
