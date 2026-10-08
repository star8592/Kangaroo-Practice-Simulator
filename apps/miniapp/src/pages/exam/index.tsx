import { useRef, useState } from 'react'
import { Button, Image, Input, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { api, authStore, ensureWechatSession } from '../../services/api'
import { canStartFullExam, makeExamLoginPath, parseRequestedExam } from '../../services/exam-access'

type Draft={examId:string;sessionId:string;userId:string;idx:number;answers:Record<string,string>;events:any[];savedAt:number}
const key=(id:string)=>`socthink_exam_draft_v2:${id}`
const readDraft=(id:string):Draft|null=>{
  try{const v=Taro.getStorageSync(key(id));return v&&v.examId===id&&typeof v.sessionId==='string'&&typeof v.userId==='string'?v:null}catch{return null}
}
const saveDraft=(d:Draft)=>{try{Taro.setStorageSync(key(d.examId),d)}catch{/* Storage may be full: in-memory state remains usable. */}}
const clearDraft=(id:string)=>{try{Taro.removeStorageSync(key(id))}catch{/* Nonfatal */}}

export default function ExamPage(){
  const [examId,setExamId]=useState('')
  const [bundle,setBundle]=useState<any>(null)
  const [sessionId,setSessionId]=useState('')
  const [idx,setIdx]=useState(0)
  const [answers,setAnswers]=useState<Record<string,string>>({})
  const [events,setEvents]=useState<any[]>([])
  const [result,setResult]=useState<any>(null)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [requiresLogin,setRequiresLogin]=useState(false)
  const current=useRef<Draft|null>(null)
  const persist=(patch:Partial<Draft>)=>{
    if(!current.current)return
    const d={...current.current,...patch,savedAt:Date.now()};current.current=d;saveDraft(d)
  }

  useLoad(async params=>{
    const id=parseRequestedExam(params.examId);setExamId(id)
    if(!id){setError('试卷编号缺失或无效，请返回竞赛列表重新选择。');return}
    try{
      if(!authStore.token())await ensureWechatSession()
      if(!canStartFullExam(authStore.user())){
        setRequiresLogin(true)
        setError('完整竞赛考试需要微信或正式学生账号登录；游客可以继续使用基础计算。')
        return
      }
      // Reject unsupported split timing before creating a server-side session.
      const data:any=await api('/api/exams/'+encodeURIComponent(id))
      if((data.profile?.timingSections||[]).length){setError('这套试卷采用分段计时，请在 Web 端完成。');return}
      // Server session is authoritative. Match the active exam to this identity.
      const active:any=await api('/api/exam-sessions?examId='+encodeURIComponent(id))
      const server=active.session || (await api<any>('/api/exam-sessions',{method:'POST',data:{examId:id}})).session
      if(!server?.id)throw new Error('无法建立考试会话')
      const uid=String(authStore.user()?.id||'')
      const saved=readDraft(id)
      const restored=saved && saved.sessionId===server.id && saved.userId===uid?saved:null
      if(saved&&!restored)clearDraft(id)
      const first=data.questions?.[0]
      const draft:Draft=restored||{examId:id,sessionId:server.id,userId:uid,idx:0,answers:{},events:first?[{type:'question_enter',questionId:first.id,at:Date.now()}]:[],savedAt:Date.now()}
      current.current=draft;saveDraft(draft)
      setSessionId(server.id);setBundle(data);setIdx(Math.min(Math.max(0,draft.idx),Math.max(0,(data.questions?.length||1)-1)))
      setAnswers(draft.answers);setEvents(draft.events)
    }catch(e){setError(e instanceof Error?e.message:'试卷载入失败')}
  })
  if(error)return <View className='page'><View className='card'><View className='card-title'>{requiresLogin?'登录后继续考试':'暂时无法继续考试'}</View><View>{error}</View>{requiresLogin&&<Button className='primary' onClick={()=>Taro.redirectTo({url:makeExamLoginPath(examId)})}>微信登录后继续</Button>}<Button className='secondary' onClick={()=>Taro.switchTab({url:'/pages/competitions/index'})}>返回竞赛列表</Button></View></View>
  if(!bundle)return <View className='page'><View className='card'>正在载入试卷与恢复作答记录…</View></View>
  if(result)return <View className='page'><View className='hero'><Text className='big'>{result.score} / {result.maxScore}</Text><View>答对 {result.correct} · 答错 {result.wrong} · 空白 {result.blank}</View></View><Button className='primary' onClick={()=>Taro.redirectTo({url:`/pages/review/index?attemptId=${encodeURIComponent(result.attemptId)}`})}>逐题复盘</Button><Button className='secondary' onClick={()=>Taro.switchTab({url:'/pages/competitions/index'})}>返回竞赛</Button></View>

  const q=bundle.questions[idx]
  const choose=(value:string)=>{
    const next={...answers,[q.id]:value},ev={type:'answer_selected',questionId:q.id,value,at:Date.now()}
    const nextEvents=[...events,ev];setAnswers(next);setEvents(nextEvents);persist({answers:next,events:nextEvents})
  }
  const move=(n:number)=>{
    const next=Math.max(0,Math.min(bundle.questions.length-1,n));if(next===idx)return
    const nextEvents=[...events,{type:'question_leave',questionId:q.id,at:Date.now()},{type:'question_enter',questionId:bundle.questions[next].id,at:Date.now()}]
    setEvents(nextEvents);setIdx(next);persist({idx:next,events:nextEvents})
  }
  const submit=async()=>{
    if(busy)return
    const confirmed=await Taro.showModal({title:'确认交卷',content:`已作答 ${Object.values(answers).filter(x=>x.trim()).length}/${bundle.questions.length} 题。交卷后不能修改，确定提交吗？`})
    if(!confirmed.confirm)return
    setBusy(true)
    try{
      const snapshot=current.current
      const r:any=await api('/api/grade',{method:'POST',data:{examId,sessionId,answers:snapshot?.answers||answers,events:snapshot?.events||events,lang:'zh'}})
      clearDraft(examId);current.current=null;setResult(r)
    }catch(e){Taro.showToast({title:e instanceof Error?e.message:'交卷失败，答案已保存在本机',icon:'none'})}
    finally{setBusy(false)}
  }
  const asset=q.assetUrlZh||q.assetUrl
  return <View className='page'>
    <View className='row'><Text>{bundle.profile.nameZh||bundle.profile.name}</Text><Text>{idx+1}/{bundle.questions.length}</Text></View>
    <View className='progress'><View style={{width:`${((idx+1)/bundle.questions.length)*100}%`}}/></View>
    <View className='card'><View className='muted'>第 {q.questionNo} 题 · {q.points} 分</View><View className='card-title' style='margin-top:20rpx'>{q.stem}</View>{asset&&<Image mode='widthFix' style='width:100%' src={asset.startsWith('/')?'https://socthink.cn'+asset:asset}/>}
    {(q.choices||[]).length?q.choices.map((c:any)=><View key={c.key} className={`choice ${answers[q.id]===c.key?'selected':''}`} onClick={()=>choose(c.key)}><Text>{c.key}. {c.label}</Text></View>):<Input className='input' value={answers[q.id]||''} placeholder='输入答案' onInput={e=>choose(e.detail.value)}/>}</View>
    <View className='grid2'><Button className='secondary' disabled={idx===0} onClick={()=>move(idx-1)}>上一题</Button>{idx<bundle.questions.length-1?<Button className='primary' onClick={()=>move(idx+1)}>下一题</Button>:<Button className='primary' loading={busy} disabled={busy} onClick={submit}>交卷</Button>}</View>
  </View>
}
