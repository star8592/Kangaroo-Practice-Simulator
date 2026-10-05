import { useState } from 'react'
import { Button, Image, Input, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { api } from '../../services/api'

export default function ReviewPage(){
  const [data,setData]=useState<any>(null)
  const [retry,setRetry]=useState<Record<string,string>>({})
  const [revealed,setRevealed]=useState<Record<string,boolean>>({})
  useLoad(async params=>{try{setData(await api(`/api/miniapp/review?attemptId=${encodeURIComponent(String(params.attemptId||''))}`))}catch(e){Taro.showToast({title:e instanceof Error?e.message:'载入复盘失败',icon:'none'})}})
  if(!data)return <View className='page'><View className='card'>正在恢复原题与作答记录…</View></View>
  const grade=new Map((data.grade?.items||[]).map((x:any)=>[x.questionId,x]))
  return <View className='page'><View className='hero'><Text className='big'>逐题复盘</Text><View>错题先重新做，再揭示原答案和解析。</View></View>{data.questions.map((q:any)=>{const g:any=grade.get(q.id);const wrong=g?.correct!==true;const show=!wrong||revealed[q.id];const asset=q.assetUrlZh||q.assetUrl;return <View className='card' key={q.id}><View className='row'><View className='card-title'>第 {q.questionNo} 题</View><Text className={g?.correct?'good':'bad'}>{g?.correct?'原作答正确':'需要复盘'}</Text></View><View>{q.stem}</View>{asset&&<Image mode='widthFix' style='width:100%;margin-top:20rpx' src={asset.startsWith('/')?'https://socthink.cn'+asset:asset}/>}
      {wrong&&!show&&<View><View className='muted' style='margin-top:20rpx'>先不看答案，再做一次。</View>{(q.choices||[]).length?q.choices.map((c:any)=><View key={c.key} className={`choice ${retry[q.id]===c.key?'selected':''}`} onClick={()=>setRetry(x=>({...x,[q.id]:c.key}))}>{c.key}. {c.label}</View>):<Input className='input' placeholder='重新输入答案' value={retry[q.id]||''} onInput={e=>setRetry(x=>({...x,[q.id]:e.detail.value}))}/>}<Button className='primary' disabled={!retry[q.id]} onClick={()=>setRevealed(x=>({...x,[q.id]:true}))}>提交重做</Button><Button className='secondary' onClick={()=>setRevealed(x=>({...x,[q.id]:true}))}>直接看答案</Button></View>}
      {show&&<View style='margin-top:20rpx'><View>原作答：{g?.selected||'未作答'}</View><View className='good'>正确答案：{g?.correctAnswer}</View>{wrong&&retry[q.id]&&<View className={retry[q.id]===g?.correctAnswer?'good':'bad'}>{retry[q.id]===g?.correctAnswer?'这次答对了':'这次仍需再看解法'}</View>}<View className='muted'>{g?.solution||'动画解析可在后续版本继续接入本题。'}</View></View>}
    </View>})}</View>
}
