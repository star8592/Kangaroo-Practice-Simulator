import { useState } from 'react'
import { Button, Image, Input, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { api } from '../../services/api'

export default function ReviewPage(){
  const [data,setData]=useState<any>(null)
  const [retry,setRetry]=useState<Record<string,string>>({})
  const [revealed,setRevealed]=useState<Record<string,boolean>>({})
  const [attemptId,setAttemptId]=useState('')
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(true)
  const load=async(id:string)=>{
    setError('');setLoading(true)
    try{
      if(!id)throw new Error('缺少复盘编号，请从成绩页重新进入')
      const response:any=await api('/api/miniapp/review?attemptId='+encodeURIComponent(id))
      if(!Array.isArray(response?.questions)||!response?.grade)throw new Error('复盘内容格式异常')
      setData(response)
    }catch(e){
      setError(e instanceof Error?e.message:'复盘内容暂时不可用')
    }finally{setLoading(false)}
  }
  useLoad(params=>{const id=String(params.attemptId||'');setAttemptId(id);void load(id)})
  if(error)return <View className='page'><View className='card'><View className='card-title'>复盘暂时无法载入</View><View>{error}</View><Button className='primary' disabled={loading||!attemptId} onClick={()=>void load(attemptId)}>重新加载复盘</Button><Button className='secondary' onClick={()=>Taro.switchTab({url:'/pages/competitions/index'})}>返回竞赛</Button></View></View>
  if(!data)return <View className='page'><View className='card'>正在恢复原题与作答记录…</View></View>
  const grade=new Map((data.grade?.items||[]).map((x:any)=>[x.questionId,x]))
  const blankPaper=data.grade?.blank===data.questions.length && data.questions.length>0
  return <View className='page'><View className='hero'><Text className='big'>{blankPaper?'交白卷 · 自愿查看解析':'逐题复盘'}</Text><View>{blankPaper?'本次没有作答行为，以下直接提供参考答案与解析；无需逐题重做。':'错题可先自己再做一次，也可以直接查看答案；空题不算答错。'}</View></View>{data.questions.map((q:any)=>{const g:any=grade.get(q.id);const blank=g?.correct===null||g?.selected===null;const wrong=!blank&&g?.correct!==true;const show=blank||!wrong||revealed[q.id];const asset=q.assetUrlZh||q.assetUrl;return <View className='card' key={q.id}><View className='row'><View className='card-title'>第 {q.questionNo} 题</View><Text className={blank?'muted':g?.correct?'good':'bad'}>{blank?'未作答':g?.correct?'原作答正确':'建议复盘'}</Text></View><View>{q.stem}</View>{asset&&<Image mode='widthFix' style='width:100%;margin-top:20rpx' src={asset.startsWith('/')?'https://socthink.cn'+asset:asset}/>}
      {wrong&&!show&&<View><View className='muted' style='margin-top:20rpx'>先不看答案，再做一次。</View>{(q.choices||[]).length?q.choices.map((c:any)=><View key={c.key} className={`choice ${retry[q.id]===c.key?'selected':''}`} onClick={()=>setRetry(x=>({...x,[q.id]:c.key}))}>{c.key}. {c.label}</View>):<Input className='input' placeholder='重新输入答案' value={retry[q.id]||''} onInput={e=>setRetry(x=>({...x,[q.id]:e.detail.value}))}/>}<Button className='primary' disabled={!retry[q.id]} onClick={()=>setRevealed(x=>({...x,[q.id]:true}))}>提交重做</Button><Button className='secondary' onClick={()=>setRevealed(x=>({...x,[q.id]:true}))}>直接看答案</Button></View>}
      {show&&<View style='margin-top:20rpx'><View>原作答：{g?.selected||'未作答'}</View><View className='good'>正确答案：{g?.correctAnswer}</View>{wrong&&retry[q.id]&&<View className={retry[q.id]===g?.correctAnswer?'good':'bad'}>{retry[q.id]===g?.correctAnswer?'这次答对了':'这次仍需再看解法'}</View>}<View className='muted'>{g?.solution||'当前暂无经过核验的文字解析；不生成臆测步骤。'}</View></View>}
    </View>})}</View>
}
