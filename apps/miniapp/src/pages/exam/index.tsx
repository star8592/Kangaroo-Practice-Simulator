import { useRef, useState } from 'react'
import { Button, Image, Input, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { api, authStore, ensureWechatSession } from '../../services/api'
import { canStartFullExam, makeExamLoginPath, parseRequestedExam } from '../../services/exam-access'
import { examAnswerProgress, localizedExamQuestion, type ExamLanguage } from '../../services/exam-view'
import ExamVoicePlayer from './ExamVoicePlayer'
import SeamoPracticeTimer from './SeamoPracticeTimer'
import {seamoRemainingSeconds} from '../../services/seamo-timer'
import { examSubmissionCopy, isBlankPaper } from '../../services/exam-submission-copy'

type Draft={examId:string;sessionId:string;userId:string;idx:number;answers:Record<string,string>;events:any[];savedAt:number}
const key=(id:string)=>`socthink_exam_draft_v2:${id}`
const readDraft=(id:string):Draft|null=>{
  try{const v=Taro.getStorageSync(key(id));return v&&v.examId===id&&typeof v.sessionId==='string'&&typeof v.userId==='string'?v:null}catch{return null}
}
const saveDraft=(d:Draft):boolean=>{try{Taro.setStorageSync(key(d.examId),d);return true}catch{return false}}
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
  const [sessionStartedAt,setSessionStartedAt]=useState(0)
  const [serverClockOffset,setServerClockOffset]=useState(0)
  const [timeExpired,setTimeExpired]=useState(false)
  const [webFallback,setWebFallback]=useState(false)
  const current=useRef<Draft|null>(null)
  const submitting=useRef(false)
  const timeoutWhileConfirming=useRef(false)
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
      if(data.profile?.competitionId==='seamo' && (
        !/^(seamo-original-g[12]-revised-1)$/.test(id) ||
        !Array.isArray(data.questions) || data.questions.length!==data.profile.questionCount ||
        !data.questions.every((q:any)=>q.readingAudioZh?.startsWith('/exam-read-aloud/v1/') && q.readingAudioEn?.startsWith('/exam-read-aloud/v1/'))
      )){
        setWebFallback(true)
        setError('这套 SEAMO 练习的原生双语读题音频尚未全部就绪，可先使用已上线的网页版。')
        return
      }
      // Server session is authoritative. Match the active exam to this identity.
      const active:any=await api('/api/exam-sessions?examId='+encodeURIComponent(id))
      const envelope:any=active.session?active:await api<any>('/api/exam-sessions',{method:'POST',data:{examId:id}})
      const server=envelope.session
      if(!server?.id)throw new Error('无法建立考试会话')
      if(data.profile?.competitionId==='seamo') {
        if(!Number.isFinite(server.startedAt) || server.startedAt<=0)throw new Error('服务器尚未返回有效的练习计时起点')
        setSessionStartedAt(server.startedAt)
        setServerClockOffset(Number.isFinite(envelope.serverNow)?envelope.serverNow-Date.now():0)
        setTimeExpired(false)
        timeoutWhileConfirming.current=false
      }
      const restored=saved && saved.sessionId===server.id && saved.userId===uid?saved:null
      if(saved&&!restored)clearDraft(id)
      const first=data.questions?.[0]
      const draft:Draft=restored||{examId:id,sessionId:server.id,userId:uid,idx:0,answers:{},events:first?[{type:'question_enter',questionId:first.id,at:Date.now()}]:[],savedAt:Date.now()}
      current.current=draft;saveDraft(draft)
      setSessionId(server.id);setBundle(data);setIdx(Math.min(Math.max(0,draft.idx),Math.max(0,(data.questions?.length||1)-1)))
      setAnswers(draft.answers);setEvents(draft.events)
    }catch(e){setError(e instanceof Error?e.message:'试卷载入失败')}
  })
  if(error)return <View className='page'><View className='card'><View className='card-title'>{requiresLogin?'登录后继续考试':'暂时无法继续考试'}</View><View>{error}</View>{requiresLogin&&<Button className='primary' onClick={()=>Taro.redirectTo({url:makeExamLoginPath(examId)})}>微信登录后继续</Button>}{webFallback&&<Button className='primary' onClick={()=>void Taro.setClipboardData({data:'https://socthink.cn/exam/'+encodeURIComponent(examId)}).then(()=>Taro.showToast({title:'网页版链接已复制',icon:'success'}))}>复制网页版练习链接</Button>}<Button className='secondary' onClick={()=>Taro.switchTab({url:'/pages/competitions/index'})}>返回竞赛列表</Button></View></View>
  if(result)return <View className='page'><View className='hero'><Text className='big'>{result.score} / {result.maxScore}</Text><View>答对 {result.correct} · 答错 {result.wrong} · 空白 {result.blank}</View></View>
    {isBlankPaper(result.correct,result.wrong,result.blank)
      ? <View className='card'><View className='card-title'>本次交白卷已记录</View><View className='muted'>按本赛事评分规则结算。本次没有作答行为，不能据此判断知识掌握程度；无需强制重做题目。</View></View>
      : <View className='card'><View className='muted'>成绩已保存。你可以选择复盘，或直接返回模考列表。</View></View>}
    <Button className='primary' onClick={()=>Taro.redirectTo({url:`/pages/review/index?attemptId=${encodeURIComponent(result.attemptId)}`})}>{isBlankPaper(result.correct,result.wrong,result.blank)?'按需查看原题与答案解析':'逐题复盘'}</Button>
    <Button className='secondary' onClick={()=>Taro.switchTab({url:'/pages/competitions/index'})}>返回模考列表</Button>
  </View>

  if(!bundle)return <View className='page'><View className='card'>正在载入试卷与恢复作答记录…</View></View>
  const q=bundle.questions[idx]
  const choose=(value:string)=>{
    if(busy||submitting.current||timeExpired||(bundle.profile?.competitionId==='seamo'&&seamoRemainingSeconds(sessionStartedAt,bundle.profile.durationSeconds,Date.now()+serverClockOffset)===0))return
    const next={...answers,[q.id]:value},ev={type:'answer_selected',questionId:q.id,value,at:Date.now()}
    const nextEvents=[...events,ev];setAnswers(next);setEvents(nextEvents);persist({answers:next,events:nextEvents})
  }
  const move=(n:number)=>{
    if(busy||submitting.current||timeExpired)return
    const next=Math.max(0,Math.min(bundle.questions.length-1,n));if(next===idx)return
    const nextEvents=[...events,{type:'question_leave',questionId:q.id,at:Date.now()},{type:'question_enter',questionId:bundle.questions[next].id,at:Date.now()}]
    setEvents(nextEvents);setIdx(next);persist({idx:next,events:nextEvents})
    Taro.nextTick(()=>{void Taro.pageScrollTo({selector:'#exam-question-card',duration:150}).catch(()=>{})})
  }
  const saveAndLeave=async()=>{
    if(submitting.current||busy)return
    const progress=examAnswerProgress(bundle.questions,answers)
    const confirmation=await Taro.showModal({
      title:'保存并退出模考？',
      content:'已作答 '+progress.answered+'/'+progress.total+' 题。当前进度将保存到此设备，下次打开同一试卷可继续；如果试卷正在计时，退出不会暂停计时。',
      confirmText:'保存退出',cancelText:'继续答题'
    })
    if(!confirmation.confirm)return
    if(!current.current || !saveDraft({...current.current,idx,answers,events,savedAt:Date.now()})){
      void Taro.showToast({title:'进度暂存失败，请继续留在考试页',icon:'none'})
      return
    }
    try{await Taro.switchTab({url:'/pages/competitions/index'})}
    catch{void Taro.showToast({title:'返回模考列表失败，请重试',icon:'none'})}
  }
  const submit=async(auto=false)=>{
    if(submitting.current)return
    submitting.current=true
    try{
      if(!auto && !timeExpired){
        const progress=examAnswerProgress(bundle.questions,answers)
        const copy=examSubmissionCopy(progress.total,progress.answered)
        const confirmed=await Taro.showModal(copy)
        if(!confirmed.confirm && !timeoutWhileConfirming.current && !(bundle.profile?.competitionId==='seamo' && seamoRemainingSeconds(sessionStartedAt,bundle.profile.durationSeconds,Date.now()+serverClockOffset)===0))return
      }
      if(auto || timeoutWhileConfirming.current)setTimeExpired(true)
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
  const onSeamoTimeElapsed=()=>{
    setTimeExpired(true)
    if(submitting.current){timeoutWhileConfirming.current=true;return}
    void submit(true)
  }
  const display=localizedExamQuestion(q,language)
  const progress=examAnswerProgress(bundle.questions,answers)
  const questionCount=bundle.questions.length
  const gradeLabel=String(bundle.profile?.gradesEn||bundle.profile?.grades||bundle.profile?.gradesZh||'').toLowerCase().replace(/[–—~～]/g,'-').replace(/\s+/g,' ').trim()
  const lowerPrimary=bundle.profile?.gradeBand==='1-2'||gradeLabel==='pre-a'||/^grades?\s*[12]$/.test(gradeLabel)||/^grades?\s*1\s*-\s*2$/.test(gradeLabel)||/^[12]\s*年级$/.test(gradeLabel)
  return <View className='page'>
    <View className='row exam-header-row'>
      <Text>{bundle.profile.nameZh||bundle.profile.name}</Text>
      <Button className='text-action' disabled={busy||timeExpired} onClick={()=>void saveAndLeave()}>保存并退出</Button>
    </View>
    <View className='row'><Text className='muted'>第 {idx+1}/{questionCount} 题</Text><Text className='muted'>可用下方答题卡跳转题号</Text></View>
    {bundle.profile?.competitionId==='seamo' && sessionStartedAt>0 && <SeamoPracticeTimer sessionId={sessionId} startedAt={sessionStartedAt} durationSeconds={bundle.profile.durationSeconds} serverClockOffset={serverClockOffset} onElapsed={onSeamoTimeElapsed}/>}
    {timeExpired && <View className='muted'>练习计时已结束，答案已经锁定。如网络中断，请点击下方交卷按钮恢复提交。</View>}
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
      {lowerPrimary&&<ExamVoicePlayer key={q.id+language} questionId={q.id} language={language} audioZh={q.readingAudioZh} audioEn={q.readingAudioEn}/>}
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
            disabled={busy||timeExpired}
            onClick={()=>move(n)}>{n+1}</Button>
        })}
      </View>
    </View>
    <View className='grid2'>
      <Button className='secondary' disabled={idx===0||busy||timeExpired} onClick={()=>move(idx-1)}>上一题</Button>
      {idx<questionCount-1
        ?<Button className='primary' disabled={busy||timeExpired} onClick={()=>move(idx+1)}>下一题</Button>
        :<Button className='secondary' onClick={()=>void Taro.pageScrollTo({selector:'#exam-answer-sheet',duration:150}).catch(()=>{})}>查看答题卡</Button>}
    </View>
    <Button className='primary exam-submit' loading={busy} disabled={busy} onClick={()=>void submit()}>
      {timeExpired?'计时结束 · 交卷或重试':progress.answered===0?'交白卷':progress.blank>0?'提前交卷':'交卷'} · 已答 {progress.answered}/{progress.total} 题
    </Button>
    <View className='muted exam-action-hint'>不想交卷？点击页面顶部「保存并退出」，稍后可继续作答。计时试卷离开后计时仍会继续。</View>
  </View>
}
