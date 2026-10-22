import { useEffect, useRef, useState } from 'react'
import { Button, Input, Picker, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, authStore } from '../../services/api'
import ArithmeticAnswerPad from '../../components/ArithmeticAnswerPad'
import { gradeChoices } from '../../services/grade-stage'
import { editMathAnswer, backspaceMathAnswer, type MathAnswerKind } from '../../services/math-answer-keypad'
import { arithmeticDraftKey, validateArithmeticDraft, type ArithmeticDraft } from '../../services/arithmetic-training-draft'

type Q={id:string;prompt:string;skillId:string;expectedMs:number;answerKind?:MathAnswerKind;requireSimplified?:boolean}
type ResponseRow={questionId:string;answer:string;responseMs:number;firstInputMs:number;edits:number;backspaces:number}

export default function ArithmeticPage(){
  const user=authStore.user()
  const isInstantIdentity=user?.candidateNo==='GUEST'||user?.username==='guest'||user?.candidateNo==='WECHAT'||user?.username==='wechat'

  const ownerId=String(user?.id||'')
  const readDraft=():ArithmeticDraft|null=>{
    if(!ownerId)return null
    try{return validateArithmeticDraft(Taro.getStorageSync(arithmeticDraftKey(ownerId)),ownerId)}
    catch{return null}
  }
  const [savedDraft,setSavedDraft]=useState<ArithmeticDraft|null>(()=>readDraft())
  const draftStartedAt=useRef(Date.now())
  const writeDraft=(d:ArithmeticDraft):boolean=>{
    try{Taro.setStorageSync(arithmeticDraftKey(ownerId),d);return true}catch{return false}
  }
  const removeDraft=()=>{try{Taro.removeStorageSync(arithmeticDraftKey(ownerId))}catch{/* Expired drafts remain unreadable. */}}
  const [grade,setGrade]=useState(Math.min(12,Math.max(1,Number(user?.grade)||1)))
  const [session,setSession]=useState<any>(null)
  const [idx,setIdx]=useState(0)
  const [raw,setRaw]=useState('')
  const cursor=useRef(0)
  const [feedback,setFeedback]=useState<any>(null)
  const responsesRef=useRef<ResponseRow[]>([])
  const [result,setResult]=useState<any>(null)
  const started=useRef(Date.now()); const firstInput=useRef<number|null>(null)

  useEffect(()=>{
    if(!ownerId||!session||result)return
    writeDraft({
      userId:ownerId,startedAt:draftStartedAt.current,savedAt:Date.now(),
      session,idx,raw,feedback,responses:responsesRef.current
    })
  },[ownerId,session,idx,raw,feedback,result])
  const resumeDraft=()=>{
    const d=validateArithmeticDraft(savedDraft,ownerId)
    if(!d){setSavedDraft(null);removeDraft();void Taro.showToast({title:'训练已过期，请重新开始',icon:'none'});return}
    draftStartedAt.current=d.startedAt
    setSession(d.session);setGrade(d.session.grade);setIdx(d.idx)
    setRaw(d.raw);cursor.current=d.raw.length
    setFeedback(d.feedback);responsesRef.current=d.responses
    setResult(null);started.current=Date.now();firstInput.current=null;setSavedDraft(null)
  }
  const leaveTraining=async()=>{
    if(!session||busy)return
    const confirm=await Taro.showModal({
      title:'暂存本轮训练',
      content:'已进行到第 '+(idx+1)+'/'+session.questions.length+' 题。本轮保存在此设备，可在开始后约 3 小时 45 分钟内继续。要保存并返回吗？',
      confirmText:'保存退出',cancelText:'继续做题'
    })
    if(!confirm.confirm)return
    const d:ArithmeticDraft={
      userId:ownerId,startedAt:draftStartedAt.current,savedAt:Date.now(),
      session,idx,raw,feedback,responses:responsesRef.current
    }
    if(!ownerId||!writeDraft(d)){void Taro.showToast({title:'暂存失败，请留在当前题目重试',icon:'none'});return}
    setSavedDraft(d);setSession(null);setFeedback(null);setRaw('')
  }
  const discardDraft=async()=>{
    const decision=await Taro.showModal({
      title:'放弃暂存进度？',
      content:'放弃后不能恢复上轮的未完成题目，已经正式完成的成绩不会受影响。',
      confirmText:'放弃进度',cancelText:'保留'
    })
    if(!decision.confirm)return
    removeDraft();setSavedDraft(null)
  }
  const inFlight=useRef(false)
  const [busy,setBusy]=useState(false)
  // A state-only guard is insufficient: two taps can run before a re-render.
  const once=async(task:()=>Promise<void>)=>{
    if(inFlight.current)return
    inFlight.current=true;setBusy(true)
    try{await task()}finally{inFlight.current=false;setBusy(false)}
  }

  const start=async(mode='adaptive')=>once(async()=>{
    try{
      if(savedDraft){
        const decision=await Taro.showModal({
          title:'已有未完成训练',
          content:'开始新一轮将替换本机暂存的上轮进度。确定开始吗？',
          confirmText:'开始新一轮',cancelText:'返回'
        })
        if(!decision.confirm)return
      }
      const s=await api('/api/miniapp/arithmetic/session',{method:'POST',data:{action:'start',grade,mode}})
      if(!s||!Array.isArray(s.questions)||!s.questions.length||!s.token)throw new Error('训练题目未能载入，请重试')
      removeDraft();setSavedDraft(null);draftStartedAt.current=Date.now()
      setSession(s);setIdx(0);setRaw('');cursor.current=0;setFeedback(null);responsesRef.current=[];setResult(null)
      started.current=Date.now();firstInput.current=null
    }catch(e){Taro.showToast({title:e instanceof Error?e.message:'无法开始',icon:'none'})}
  })
  const q:Q|undefined=session?.questions?.[idx]
  const insertMathKey=(insert:string)=>{
    if(busy||feedback||!q)return
    if(firstInput.current===null)firstInput.current=Date.now()
    setRaw(previous=>{
      const result=editMathAnswer(previous,insert,cursor.current)
      cursor.current=result.cursor
      return result.value
    })
  }
  const backspaceMathKey=()=>{
    if(busy||feedback)return
    setRaw(previous=>{
      const result=backspaceMathAnswer(previous,cursor.current)
      cursor.current=result.cursor
      return result.value
    })
  }
  const check=async()=>{
    if(!q||!raw.trim()||feedback)return
    return once(async()=>{
      const now=Date.now()
      const row={questionId:q.id,answer:raw,responseMs:Math.max(1,now-started.current),firstInputMs:Math.max(0,(firstInput.current||now)-started.current),edits:0,backspaces:0}
      try{
        const f=await api('/api/miniapp/arithmetic/session',{method:'POST',data:{action:'check',token:session.token,index:idx,...row}})
        if(f?.needsSimplification){Taro.showToast({title:'数值正确，请化成题目要求的最简形式',icon:'none'});return}
        if(typeof f?.correct!=='boolean')throw new Error('判题响应异常，请重新提交')
        setFeedback(f);responsesRef.current=[...responsesRef.current,row]
      }catch(e){Taro.showToast({title:e instanceof Error?e.message:'提交失败',icon:'none'})}
    })
  }
  const next=async()=>{
    if(!feedback||!session)return
    return once(async()=>{
      if(idx+1>=session.questions.length){
        try{
          // A lost response can be safely retried: backend persists this ticket once.
          const r=await api('/api/miniapp/arithmetic/session',{method:'POST',data:{action:'finish',token:session.token,responses:responsesRef.current}})
          if(r?.ok!==true)throw new Error('成绩确认失败，请重试')
          removeDraft();setResult(r)
        }catch(e){Taro.showToast({title:e instanceof Error?e.message:'保存失败，点击完成本轮可重试',icon:'none'})}
        return
      }
      setIdx(x=>x+1);setRaw('');cursor.current=0;setFeedback(null);started.current=Date.now();firstInput.current=null
    })
  }

  if(result)return <View className='page'><View className='hero'><Text className='big'>本轮完成</Text><View>{result.correct}/{result.total} · {Math.round(result.accuracy*100)}%</View></View><View className='card'><View className='card-title'>下一轮怎么练</View>{(result.plan?.summary||[]).map((x:string)=><View className='muted' key={x}>{x}</View>)}<Button className='primary' loading={busy} disabled={busy} onClick={()=>void start('adaptive')}>开始个性化下一轮</Button><Button className='secondary' onClick={()=>{setSession(null);setResult(null)}}>返回训练选择</Button></View></View>

  if(!session)return <View className='page'><View className='hero'><View className='stage-strip'><Text className='stage-chip'>小学</Text><Text className='stage-chip'>初中</Text><Text className='stage-chip'>高中</Text></View><Text className='big'>计算训练 · 1–12 年级</Text><View>{isInstantIdentity?'不用填资料，选年级就能开始；做完立即看成绩。':'系统根据历史正确率、速度和错误习惯安排下一轮。'}</View></View><View className='card'><View className='card-title'>训练年级</View>{savedDraft&&<View className='arithmetic-resume-card'>
      <View className='card-title'>上次训练尚未完成</View>
      <View className='muted'>{savedDraft.session.grade} 年级 · 第 {savedDraft.idx+1}/{savedDraft.session.questions.length} 题 · 仅本设备暂存</View>
      <Button className='primary' onClick={resumeDraft}>继续上次训练</Button>
      <Button className='text-action' onClick={()=>void discardDraft()}>放弃上次进度</Button>
    </View>}<Picker mode='selector' range={gradeChoices.map(option=>option.label)} value={grade-1} onChange={e=>setGrade(Number(e.detail.value)+1)}><View className='input'>{gradeChoices[grade-1]?.label||'请选择年级'}　▾</View></Picker>{isInstantIdentity?<><Button className='primary' loading={busy} disabled={busy} onClick={()=>void start('diagnostic')}>立即开始 · 20 题能力诊断</Button><Button className='secondary' loading={busy} disabled={busy} onClick={()=>void start('adaptive')}>快速练一组</Button></>:<><Button className='primary' loading={busy} disabled={busy} onClick={()=>void start('adaptive')}>开始个性化训练</Button><Button className='secondary' loading={busy} disabled={busy} onClick={()=>void start('diagnostic')}>做 20 题基线诊断</Button></>}</View></View>

  return <View className='page'>
    <View className='row arithmetic-session-heading'><Text>第 {idx+1}/{session.questions.length} 题</Text>
      <Button className='text-action' disabled={busy} onClick={()=>void leaveTraining()}>暂存并退出</Button>
    </View>
    <View className='progress'><View style={{width:`${((idx+1)/session.questions.length)*100}%`}}/></View>
    <View className='card'>
      <View className='question'>{q?.prompt}</View>
      <Input className='input' type='text' value={raw} maxlength={100} disabled={busy||Boolean(feedback)} placeholder='点击下方数学键盘输入，也可手动编辑' onInput={e=>{const value=e.detail.value;if(firstInput.current===null&&value)firstInput.current=Date.now();cursor.current=typeof e.detail.cursor==='number'?e.detail.cursor:value.length;setRaw(value)}}/>
      {!feedback&&<ArithmeticAnswerPad kind={q?.answerKind||'number'} raw={raw} busy={busy} onInsert={insertMathKey} onBackspace={backspaceMathKey}/>}
      {feedback?<><View className={feedback.correct?'good':'bad'}>{feedback.correct?'✓ 答对了':`✕ 正确答案：${feedback.correctAnswer}`}</View><Button className='primary' loading={busy} disabled={busy} onClick={()=>void next()}>{idx+1===session.questions.length?'完成本轮':'下一题'}</Button></>:<Button className='primary arithmetic-session-submit' loading={busy} disabled={busy||!raw.trim()} onClick={()=>void check()}>提交答案</Button>}
    </View>
  </View>
}
