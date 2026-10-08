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
  const [responses,setResponses]=useState<ResponseRow[]>([])
  const responsesRef=useRef<ResponseRow[]>([])
  const [result,setResult]=useState<any>(null)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const started=useRef(Date.now()); const firstInput=useRef<number|null>(null)

  const start=async(mode='adaptive')=>{
    if(busy)return
    setError('');setBusy(true)
    try{
      const s=await api('/api/miniapp/arithmetic/session',{method:'POST',data:{action:'start',grade,mode}})
      if(!s?.token||!Array.isArray(s.questions)||s.questions.length===0)throw new Error('训练题目没有正确加载，请重试')
      setSession(s);setIdx(0);setRaw('');setFeedback(null);setResponses([]);responsesRef.current=[];setResult(null)
      started.current=Date.now();firstInput.current=null
    }catch(e){setError(e instanceof Error?e.message:'无法开始训练，请重试')}
    finally{setBusy(false)}
  }
  const q:Q|undefined=session?.questions?.[idx]
  const check=async()=>{
    if(!q||!raw.trim())return
    const now=Date.now()
    const row={questionId:q.id,answer:raw,responseMs:Math.max(1,now-started.current),firstInputMs:Math.max(0,(firstInput.current||now)-started.current),edits:0,backspaces:0}
    try{
      setError('')
      const f=await api('/api/miniapp/arithmetic/session',{method:'POST',data:{action:'check',token:session.token,index:idx,...row}})
      setFeedback(f);responsesRef.current=[...responsesRef.current,row];setResponses(responsesRef.current)
    }catch(e){setError(e instanceof Error?e.message:'提交答案失败，请重试')}
  }
  const next=async()=>{
    if(idx+1>=session.questions.length){
      try{
        setError('')
        const r=await api('/api/miniapp/arithmetic/session',{method:'POST',data:{action:'finish',token:session.token,responses:responsesRef.current}})
        setResult(r)
      }catch(e){setError(e instanceof Error?e.message:'保存成绩失败，请重试')}
      return
    }
    setIdx(x=>x+1);setRaw('');setFeedback(null);setError('');started.current=Date.now();firstInput.current=null
  }

  if(result)return <View className='page'><View className='hero'><Text className='big'>本轮完成</Text><View>{result.correct}/{result.total} · {Math.round(result.accuracy*100)}%</View></View><View className='card'><View className='card-title'>下一轮怎么练</View>{(result.plan?.summary||[]).map((x:string)=><View className='muted' key={x}>{x}</View>)}<Button className='primary' onClick={()=>start('adaptive')}>开始个性化下一轮</Button></View></View>

  if(!session)return <View className='page'><View className='hero'><Text className='big'>计算训练</Text><View>{isInstantIdentity?'不用填资料，选年级就能开始；做完立即看成绩。':'系统根据历史正确率、速度和错误习惯安排下一轮。'}</View></View><View className='card'><View className='card-title'>训练年级</View>{!!error&&<View className='bad network-error'>{error}</View>}<Picker mode='selector' range={Array.from({length:12},(_,i)=>`${i+1} 年级`)} value={grade-1} onChange={e=>setGrade(Number(e.detail.value)+1)}><View className='input'>{grade} 年级</View></Picker>{isInstantIdentity?<><Button className='primary' disabled={busy} loading={busy} onClick={()=>start('diagnostic')}>立即开始 · 20 题能力诊断</Button><Button className='secondary' disabled={busy} onClick={()=>start('adaptive')}>快速练一组</Button></>:<><Button className='primary' disabled={busy} loading={busy} onClick={()=>start('adaptive')}>开始个性化训练</Button><Button className='secondary' disabled={busy} onClick={()=>start('diagnostic')}>做 20 题基线诊断</Button></>}</View></View>

  return <View className='page'>
    <View className='row'><Text>第 {idx+1}/{session.questions.length} 题</Text><Text className='muted'>{q?.skillId}</Text></View>
    <View className='progress'><View style={{width:`${((idx+1)/session.questions.length)*100}%`}}/></View>
    <View className='card'>
      {!!error&&<View className='bad network-error'>{error}</View>}
      <View className='question'>{q?.prompt}</View>
      <Input className='input' value={raw} placeholder='输入答案' onInput={e=>{if(firstInput.current===null&&e.detail.value)firstInput.current=Date.now();setRaw(e.detail.value)}}/>
      {feedback?<><View className={feedback.correct?'good':'bad'}>{feedback.correct?'✓ 答对了':`✕ 正确答案：${feedback.correctAnswer}`}</View><Button className='primary' onClick={next}>{idx+1===session.questions.length?'完成本轮':'下一题'}</Button></>:<Button className='primary' disabled={!raw.trim()} onClick={check}>提交答案</Button>}
    </View>
  </View>
}
