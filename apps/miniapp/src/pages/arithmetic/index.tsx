import { useRef, useState } from 'react'
import { Button, Input, Picker, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, authStore } from '../../services/api'

type Q={id:string;prompt:string;skillId:string;expectedMs:number}
type ResponseRow={questionId:string;answer:string;responseMs:number;firstInputMs:number;edits:number;backspaces:number}

export default function ArithmeticPage(){
  const user=authStore.user()
  const isInstantIdentity=user?.candidateNo==='GUEST'||user?.username==='guest'||user?.candidateNo==='WECHAT'||user?.username==='wechat'
  const [grade,setGrade]=useState(Math.min(12,Math.max(1,Number(user?.grade)||1)))
  const [session,setSession]=useState<any>(null)
  const [idx,setIdx]=useState(0)
  const [raw,setRaw]=useState('')
  const [feedback,setFeedback]=useState<any>(null)
  const responsesRef=useRef<ResponseRow[]>([])
  const [result,setResult]=useState<any>(null)
  const started=useRef(Date.now()); const firstInput=useRef<number|null>(null)
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
      const s=await api('/api/miniapp/arithmetic/session',{method:'POST',data:{action:'start',grade,mode}})
      if(!s||!Array.isArray(s.questions)||!s.questions.length||!s.token)throw new Error('训练题目未能载入，请重试')
      setSession(s);setIdx(0);setRaw('');setFeedback(null);responsesRef.current=[];setResult(null)
      started.current=Date.now();firstInput.current=null
    }catch(e){Taro.showToast({title:e instanceof Error?e.message:'无法开始',icon:'none'})}
  })
  const q:Q|undefined=session?.questions?.[idx]
  const check=async()=>{
    if(!q||!raw.trim()||feedback)return
    return once(async()=>{
      const now=Date.now()
      const row={questionId:q.id,answer:raw,responseMs:Math.max(1,now-started.current),firstInputMs:Math.max(0,(firstInput.current||now)-started.current),edits:0,backspaces:0}
      try{
        const f=await api('/api/miniapp/arithmetic/session',{method:'POST',data:{action:'check',token:session.token,index:idx,...row}})
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
          setResult(r)
        }catch(e){Taro.showToast({title:e instanceof Error?e.message:'保存失败，点击完成本轮可重试',icon:'none'})}
        return
      }
      setIdx(x=>x+1);setRaw('');setFeedback(null);started.current=Date.now();firstInput.current=null
    })
  }

  if(result)return <View className='page'><View className='hero'><Text className='big'>本轮完成</Text><View>{result.correct}/{result.total} · {Math.round(result.accuracy*100)}%</View></View><View className='card'><View className='card-title'>下一轮怎么练</View>{(result.plan?.summary||[]).map((x:string)=><View className='muted' key={x}>{x}</View>)}<Button className='primary' loading={busy} disabled={busy} onClick={()=>void start('adaptive')}>开始个性化下一轮</Button></View></View>

  if(!session)return <View className='page'><View className='hero'><Text className='big'>计算训练</Text><View>{isInstantIdentity?'不用填资料，选年级就能开始；做完立即看成绩。':'系统根据历史正确率、速度和错误习惯安排下一轮。'}</View></View><View className='card'><View className='card-title'>训练年级</View><Picker mode='selector' range={Array.from({length:12},(_,i)=>`${i+1} 年级`)} value={grade-1} onChange={e=>setGrade(Number(e.detail.value)+1)}><View className='input'>{grade} 年级</View></Picker>{isInstantIdentity?<><Button className='primary' loading={busy} disabled={busy} onClick={()=>void start('diagnostic')}>立即开始 · 20 题能力诊断</Button><Button className='secondary' loading={busy} disabled={busy} onClick={()=>void start('adaptive')}>快速练一组</Button></>:<><Button className='primary' loading={busy} disabled={busy} onClick={()=>void start('adaptive')}>开始个性化训练</Button><Button className='secondary' loading={busy} disabled={busy} onClick={()=>void start('diagnostic')}>做 20 题基线诊断</Button></>}</View></View>

  return <View className='page'>
    <View className='row'><Text>第 {idx+1}/{session.questions.length} 题</Text><Text className='muted'>{q?.skillId}</Text></View>
    <View className='progress'><View style={{width:`${((idx+1)/session.questions.length)*100}%`}}/></View>
    <View className='card'>
      <View className='question'>{q?.prompt}</View>
      <Input className='input' value={raw} disabled={busy||Boolean(feedback)} placeholder='输入答案' onInput={e=>{if(firstInput.current===null&&e.detail.value)firstInput.current=Date.now();setRaw(e.detail.value)}}/>
      {feedback?<><View className={feedback.correct?'good':'bad'}>{feedback.correct?'✓ 答对了':`✕ 正确答案：${feedback.correctAnswer}`}</View><Button className='primary' loading={busy} disabled={busy} onClick={()=>void next()}>{idx+1===session.questions.length?'完成本轮':'下一题'}</Button></>:<Button className='primary' loading={busy} disabled={busy||!raw.trim()} onClick={()=>void check()}>提交答案</Button>}
    </View>
  </View>
}
