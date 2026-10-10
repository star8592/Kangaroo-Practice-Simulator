import { useRef, useState } from 'react'
import { Button, Image, Input, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { api, authStore, ensureWechatSession } from '../../services/api'
import { canStartFullExam, makeExamLoginPath, parseRequestedExam } from '../../services/exam-access'
import { examAnswerProgress, localizedExamQuestion, type ExamLanguage } from '../../services/exam-view'

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
  const [language,setLanguage]=useState<ExamLanguage>('zh')
  const current=useRef<Draft|null>(null)
  const submitting=useRef(false)
  const persist=(patch:Partial<Draft>)=>{
    if(!current.current)return
    const d={...current.current,...patch,savedAt:Date.now()};current.current=d;saveDraft(d)
  }

  const findCommittedResult=async(id:string,sid:string)=>{
    const response:any=await api('/api/exam-sessions/recovery?examId='+encodeURIComponent(id)+'&sessionId='+encodeURIComponent(sid))
    return response?.status==='completed'&&response?.result?.attemptId?response.result:null
  }
  const acceptResult=(id:string,data:any)=>{
    clearDraft(id);current.current=null;setResult(data)
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
      // A lost grading response can leave a committed result under a saved
      // session. Recover before creating any new sitting.
      const saved=readDraft(id)
      const uid=String(authStore.user()?.id||'')
      if(saved&&saved.userId===uid){
        try{
          const recovered=await findCommittedResult(id,saved.sessionId)
          if(recovered){setSessionId(saved.sessionId);acceptResult(id,recovered);return}
        }catch(e){
          if(!(e instanceof Error&&(e.message.includes('404')||e.message.includes('考试会话不存在'))))throw e
        }
      }
      // Reject unsupported split timing before creating a server-side session.
      const data:any=await api('/api/exams/'+encodeURIComponent(id))
      if((data.profile?.timingSections||[]).length){setError('这套试卷采用分段计时，请在 Web 端完成。');return}
      // Server session is authoritative. Match the active exam to this identity.
      const active:any=await api('/api/exam-sessions?examId='+encodeURIComponent(id))
      const server=active.session || (await api<any>('/api/exam-sessions',{method:'POST',data:{examId:id}})).session
      if(!server?.id)throw new Error('无法建立考试会话')
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
  if(result)return <View className='page'><View className='hero'><Text className='big'>{result.score} / {result.maxScore}</Text><View>答对 {result.correct} · 答错 {result.wrong} · 空白 {result.blank}</View></View><Button className='primary' onClick={()=>Taro.redirectTo({url:`/pages/review/index?attemptId=${encodeURIComponent(result.attemptId)}`})}>逐题复盘</Button><Button className='secondary' onClick={()=>Taro.switchTab({url:'/pages/competitions/index'})}>返回竞赛</Button></View>

  if(!bundle)return <View className='page'><View className='card'>正在载入试卷与恢复作答记录…</View></View>
  const q=bundle.questions[idx]
  const choose=(value:string)=>{
    if(busy||submitting.current)return
    const next={...answers,[q.id]:value},ev={type:'answer_selected',questionId:q.id,value,at:Date.now()}
    const nextEvents=[...events,ev];setAnswers(next);setEvents(nextEvents);persist({answers:next,events:nextEvents})
  }
  const move=(n:number)=>{
    if(busy||submitting.current)return
    const next=Math.max(0,Math.min(bundle.questions.length-1,n));if(next===idx)return
    const nextEvents=[...events,{type:'question_leave',questionId:q.id,at:Date.now()},{type:'question_enter',questionId:bundle.questions[next].id,at:Date.now()}]
    setEvents(nextEvents);setIdx(next);persist({idx:next,events:nextEvents})
    Taro.nextTick(()=>{void Taro.pageScrollTo({selector:'#exam-question-card',duration:150}).catch(()=>{})})
  }
  const submit=async()=>{
    if(submitting.current)return
    submitting.current=true
    try{
      const confirmed=await Taro.showModal({title:'确认交卷',content:`已作答 ${Object.values(answers).filter(x=>x.trim()).length}/${bundle.questions.length} 题。交卷后不能修改，确定提交吗？`})
      if(!confirmed.confirm)return
      setBusy(true)
      try{
        const snapshot=current.current
        const data:any=await api('/api/grade',{method:'POST',data:{examId,sessionId,answers:snapshot?.answers||answers,events:snapshot?.events||events,lang:'zh'}})
        if(!data?.attemptId)throw new Error('成绩回执无效，请尝试恢复')
        acceptResult(examId,data)
      }catch(e){
        // A server may commit the grade before the phone loses its connection.
        try{
          const recovered=await findCommittedResult(examId,sessionId)
          if(recovered){acceptResult(examId,recovered);return}
        }catch{/* Preserve the original error and local answer draft. */}
        Taro.showToast({title:e instanceof Error?e.message:'交卷失败，答案已保存在本机',icon:'none'})
      }
    }finally{
      setBusy(false);submitting.current=false
    }
  }
  const display=localizedExamQuestion(q,language)
  const progress=examAnswerProgress(bundle.questions,answers)
  const questionCount=bundle.questions.length
  return <View className='page'>
    <View className='row'><Text>{bundle.profile.nameZh||bundle.profile.name}</Text><Text>{idx+1}/{questionCount}</Text></View>
    <View className='progress'><View style={{width:`${((idx+1)/questionCount)*100}%`}}/></View>
    <View className='row exam-summary'>
      <Text>已答 {progress.answered} / {progress.total} 题</Text>
      <Text>未答 {progress.blank} 题</Text>
    </View>
    <View className='competition-tabs' role='group'>
      <Button className={language==='zh'?'competition-tab active':'competition-tab'} onClick={()=>setLanguage('zh')}>中文</Button>
      <Button className={language==='en'?'competition-tab active':'competition-tab'} onClick={()=>setLanguage('en')}>English</Button>
    </View>
    <View id='exam-question-card' className='card'>
      <View className='muted'>第 {q.questionNo} 题 · {q.points} 分</View>
      <View className='card-title exam-stem'>{display.stem}</View>
      {display.assetUrl&&<Image mode='widthFix' style='width:100%' src={display.assetUrl.startsWith('/')?'https://socthink.cn'+display.assetUrl:display.assetUrl}/>}
      {display.choices.length
        ?display.choices.map(c=><View key={c.key} className={`choice ${answers[q.id]===c.key?'selected':''}`} onClick={()=>choose(c.key)}><Text>{c.key}. {c.label}</Text></View>)
        :<Input className='input' value={answers[q.id]||''} placeholder={language==='zh'?'输入答案':'Enter your answer'} onInput={e=>choose(e.detail.value)}/>}
    </View>
    <View id='exam-answer-sheet' className='card'>
      <View className='card-title'>答题卡 · 点击题号跳转</View>
      <View className='muted'>深色为当前题，橙色边框表示已作答。答案会自动保存在本机草稿。</View>
      <View className='exam-question-grid'>
        {bundle.questions.map((item:any,n:number)=>{
          const answered=Boolean((answers[item.id]||'').trim())
          return <Button key={item.id}
            className={`exam-question-number ${idx===n?'current':''} ${answered?'answered':''}`}
            disabled={busy}
            onClick={()=>move(n)}>{n+1}</Button>
        })}
      </View>
    </View>
    <View className='grid2'>
      <Button className='secondary' disabled={idx===0||busy} onClick={()=>move(idx-1)}>上一题</Button>
      {idx<questionCount-1
        ?<Button className='primary' disabled={busy} onClick={()=>move(idx+1)}>下一题</Button>
        :<Button className='secondary' onClick={()=>void Taro.pageScrollTo({selector:'#exam-answer-sheet',duration:150}).catch(()=>{})}>查看答题卡</Button>}
    </View>
    <Button className='primary exam-submit' loading={busy} disabled={busy} onClick={submit}>
      交卷 · 已答 {progress.answered}/{progress.total} 题
    </Button>
  </View>
}
