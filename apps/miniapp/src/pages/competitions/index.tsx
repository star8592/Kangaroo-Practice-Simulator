import { useEffect, useMemo, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api } from '../../services/api'

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
  useEffect(()=>{api<any>('/api/miniapp/exams').then(x=>setExams(x.exams||[])).catch(()=>Taro.showToast({title:'试卷列表暂时不可用',icon:'none'})).finally(()=>setLoading(false))},[])
  const filtered=useMemo(()=>competition==='all'?exams:exams.filter(x=>x.competitionId===competition),[exams,competition])
  return <View className='page'>
    <View className='hero'><View className='eyebrow'>竞赛实战</View><Text className='big'>选赛事，再选一套试卷</Text><View className='hero-copy'>与 Web 使用同一套题库、赛制和评分规则；智能组卷也只在同一赛制内选题。</View></View>
    <View className='competition-tabs'>{groups.filter(g=>g.id==='all'||exams.some(x=>x.competitionId===g.id)).map(g=><Button key={g.id} className={competition===g.id?'competition-tab active':'competition-tab'} onClick={()=>{setCompetition(g.id);setLimit(24)}}>{g.label}</Button>)}</View>
    <View className='card'><View className='card-title'>赛事服务</View><View className='muted'>何时模考、当天带什么、官方流程，一条时间线管到底。</View><Button className='secondary' onClick={()=>Taro.navigateTo({url:'/pages/events/index'})}>查看我的比赛</Button></View>
    <View className='section-title'>{competition==='all'?'可训练试卷':groups.find(g=>g.id===competition)?.label}</View>
    <View className='muted list-summary'>{loading?'正在读取试卷…':`共 ${filtered.length} 套，先展示最相关的 ${Math.min(limit,filtered.length)} 套`}</View>
    {filtered.slice(0,limit).map(ex=><View className='card exam-card' key={ex.id}><View className='row'><View className='exam-card-title'><View className='card-title'>{ex.name}</View><View className='muted'>{ex.year||''} · {ex.grades} · {ex.questionCount} 题</View></View><Text className={ex.miniappReady?'status-ready':'status-web'}>{ex.miniappReady?'可实战':'Web'}</Text></View><Button className={ex.miniappReady?'primary':'secondary'} disabled={!ex.miniappReady} onClick={()=>{const examId=ex.paperType==='smart'?`${ex.id}--${Date.now().toString(36)}`:ex.id;Taro.navigateTo({url:`/pages/exam/index?examId=${encodeURIComponent(examId)}`})}}>{ex.miniappReady?'开始实战':'分段赛制请在 Web 完成'}</Button></View>)}
    {!loading&&filtered.length===0&&<View className='card'><View className='card-title'>暂无可训练试卷</View><View className='muted'>可以切换到其他赛事。</View></View>}
    {limit<filtered.length&&<Button className='secondary load-more' onClick={()=>setLimit(x=>x+24)}>再显示 24 套</Button>}
  </View>
}
