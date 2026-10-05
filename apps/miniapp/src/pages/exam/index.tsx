import { useState } from 'react'
import { Button, Image, Input, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { api } from '../../services/api'

export default function ExamPage(){
  const [examId,setExamId]=useState('')
  const [bundle,setBundle]=useState<any>(null)
  const [sessionId,setSessionId]=useState('')
  const [idx,setIdx]=useState(0)
  const [answers,setAnswers]=useState<Record<string,string>>({})
  const [events,setEvents]=useState<any[]>([])
  const [result,setResult]=useState<any>(null)
  const [busy,setBusy]=useState(false)

  useLoad(async params=>{
    const id=decodeURIComponent(String(params.examId||''));setExamId(id)
    try{
      const session:any=await api('/api/exam-sessions',{method:'POST',data:{examId:id}})
      const data:any=await api(`/api/exams/${encodeURIComponent(id)}`)
      if((data.profile?.timingSections||[]).length){Taro.showModal({title:'分段赛制',content:'该试卷目前请先在 Web 端完成分段计时实战。',showCancel:false});return}
      setSessionId(session.session?.id||'');setBundle(data)
      if(data.questions?.[0])setEvents([{type:'question_enter',questionId:data.questions[0].id,at:Date.now()}])
    }catch(e){Taro.showToast({title:e instanceof Error?e.message:'载入失败',icon:'none'})}
  })
  if(!bundle)return <View className='page'><View className='card'>正在载入试卷…</View></View>
  if(result)return <View className='page'><View className='hero'><Text className='big'>{result.score} / {result.maxScore}</Text><View>答对 {result.correct} · 答错 {result.wrong} · 空白 {result.blank}</View></View><Button className='primary' onClick={()=>Taro.redirectTo({url:`/pages/review/index?attemptId=${encodeURIComponent(result.attemptId)}`})}>逐题复盘</Button><Button className='secondary' onClick={()=>Taro.switchTab({url:'/pages/competitions/index'})}>返回竞赛</Button></View>

  const q=bundle.questions[idx]
  const choose=(value:string)=>{setAnswers(x=>({...x,[q.id]:value}));setEvents(x=>[...x,{type:'answer_selected',questionId:q.id,value,at:Date.now()}])}
  const move=(n:number)=>{const next=Math.max(0,Math.min(bundle.questions.length-1,n));if(next===idx)return;setEvents(x=>[...x,{type:'question_leave',questionId:q.id,at:Date.now()},{type:'question_enter',questionId:bundle.questions[next].id,at:Date.now()}]);setIdx(next)}
  const submit=async()=>{setBusy(true);try{const r:any=await api('/api/grade',{method:'POST',data:{examId,sessionId,answers,events,lang:'zh'}});setResult(r)}catch(e){Taro.showToast({title:e instanceof Error?e.message:'交卷失败',icon:'none'})}finally{setBusy(false)}}
  const asset=q.assetUrlZh||q.assetUrl
  return <View className='page'>
    <View className='row'><Text>{bundle.profile.nameZh||bundle.profile.name}</Text><Text>{idx+1}/{bundle.questions.length}</Text></View>
    <View className='progress'><View style={{width:`${((idx+1)/bundle.questions.length)*100}%`}}/></View>
    <View className='card'><View className='muted'>第 {q.questionNo} 题 · {q.points} 分</View><View className='card-title' style='margin-top:20rpx'>{q.stem}</View>{asset&&<Image mode='widthFix' style='width:100%' src={asset.startsWith('/')?'https://socthink.cn'+asset:asset}/>}
    {(q.choices||[]).length?q.choices.map((c:any)=><View key={c.key} className={`choice ${answers[q.id]===c.key?'selected':''}`} onClick={()=>choose(c.key)}><Text>{c.key}. {c.label}</Text></View>):<Input className='input' value={answers[q.id]||''} placeholder='输入答案' onInput={e=>choose(e.detail.value)}/>}</View>
    <View className='grid2'><Button className='secondary' disabled={idx===0} onClick={()=>move(idx-1)}>上一题</Button>{idx<bundle.questions.length-1?<Button className='primary' onClick={()=>move(idx+1)}>下一题</Button>:<Button className='primary' loading={busy} onClick={submit}>交卷</Button>}</View>
  </View>
}
