import { useRef, useState } from 'react'
import { Button, Input, Picker, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, authStore } from '../../services/api'

type Q={id:string;prompt:string;skillId:string;expectedMs:number}
type ResponseRow={questionId:string;answer:string;responseMs:number;firstInputMs:number;edits:number;backspaces:number}

export default function ArithmeticPage(){
  const user=authStore.user()
  const isGuest=user?.candidateNo==='GUEST'||user?.username==='guest'
  const [grade,setGrade]=useState(Math.min(12,Math.max(1,Number(user?.grade)||1)))
  const [session,setSession]=useState<any>(null)
  const [idx,setIdx]=useState(0)
  const [raw,setRaw]=useState('')
  const [feedback,setFeedback]=useState<any>(null)
  const [responses,setResponses]=useState<ResponseRow[]>([])
  const responsesRef=useRef<ResponseRow[]>([])
  const [result,setResult]=useState<any>(null)
  const started=useRef(Date.now()); const firstInput=useRef<number|null>(null)

  const start=async(mode='adaptive')=>{
    try{
      const s=await api('/api/miniapp/arithmetic/session',{method:'POST',data:{action:'start',grade,mode}})
      setSession(s);setIdx(0);setRaw('');setFeedback(null);setResponses([]);responsesRef.current=[];setResult(null)
      started.current=Date.now();firstInput.current=null
    }catch(e){Taro.showToast({title:e instanceof Error?e.message:'无法开始',icon:'none'})}
  }
  const q:Q|undefined=session?.questions?.[idx]
  const check=async()=>{
    if(!q||!raw.trim())return
    const now=Date.now()
    const row={questionId:q.id,answer:raw,responseMs:Math.max(1,now-started.current),firstInputMs:Math.max(0,(firstInput.current||now)-started.current),edits:0,backspaces:0}
    try{
      const f=await api('/api/miniapp/arithmetic/session',{method:'POST',data:{action:'check',token:session.token,index:idx,...row}})
      setFeedback(f);responsesRef.current=[...responsesRef.current,row];setResponses(responsesRef.current)
    }catch(e){Taro.showToast({title:e instanceof Error?e.message:'提交失败',icon:'none'})}
  }
  const next=async()=>{
    if(idx+1>=session.questions.length){
      try{
        const r=await api('/api/miniapp/arithmetic/session',{method:'POST',data:{action:'finish',token:session.token,responses:responsesRef.current}})
        setResult(r)
      }catch(e){Taro.showToast({title:e instanceof Error?e.message:'保存失败',icon:'none'})}
      return
    }
    setIdx(x=>x+1);setRaw('');setFeedback(null);started.current=Date.now();firstInput.current=null
  }

  if(result)return <View className='page'><View className='hero'><Text className='big'>本轮完成</Text><View>{result.correct}/{result.total} · {Math.round(result.accuracy*100)}%</View></View><View className='card'><View className='card-title'>下一轮怎么练</View>{(result.plan?.summary||[]).map((x:string)=><View className='muted' key={x}>{x}</View>)}<Button className='primary' onClick={()=>start('adaptive')}>开始个性化下一轮</Button></View></View>

  if(!session)return <View className='page'><View className='hero'><Text className='big'>计算训练</Text><View>{isGuest?'不用注册，选年级就能开始；做完立即看成绩。登录只用于长期保存。':'系统根据历史正确率、速度和错误习惯安排下一轮。'}</View></View><View className='card'><View className='card-title'>训练年级</View><Picker mode='selector' range={Array.from({length:12},(_,i)=>`${i+1} 年级`)} value={grade-1} onChange={e=>setGrade(Number(e.detail.value)+1)}><View className='input'>{grade} 年级</View></Picker>{isGuest?<><Button className='primary' onClick={()=>start('diagnostic')}>立即开始 · 20 题能力诊断</Button><Button className='secondary' onClick={()=>start('adaptive')}>快速练一组</Button></>:<><Button className='primary' onClick={()=>start('adaptive')}>开始个性化训练</Button><Button className='secondary' onClick={()=>start('diagnostic')}>做 20 题基线诊断</Button></>}</View></View>

  return <View className='page'>
    <View className='row'><Text>第 {idx+1}/{session.questions.length} 题</Text><Text className='muted'>{q?.skillId}</Text></View>
    <View className='progress'><View style={{width:`${((idx+1)/session.questions.length)*100}%`}}/></View>
    <View className='card'>
      <View className='question'>{q?.prompt}</View>
      <Input className='input' value={raw} placeholder='输入答案' onInput={e=>{if(firstInput.current===null&&e.detail.value)firstInput.current=Date.now();setRaw(e.detail.value)}}/>
      {feedback?<><View className={feedback.correct?'good':'bad'}>{feedback.correct?'✓ 答对了':`✕ 正确答案：${feedback.correctAnswer}`}</View><Button className='primary' onClick={next}>{idx+1===session.questions.length?'完成本轮':'下一题'}</Button></>:<Button className='primary' disabled={!raw.trim()} onClick={check}>提交答案</Button>}
    </View>
  </View>
}
