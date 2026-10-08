import { useEffect, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api } from '../../services/api'

export default function EventsPage(){
  const [rows,setRows]=useState<any[]>([])
  const load=()=>api<any>('/api/miniapp/companions').then(x=>setRows(x.companions||[])).catch(()=>{})
  useEffect(()=>{load()},[])
  const toggle=async(c:any,t:any)=>{const done=(c.progress?.completedTaskIds||[]).includes(t.id);try{await api('/api/competition-companion/progress',{method:'PATCH',data:{companionId:c.id,taskId:t.id,completed:!done}});load()}catch(e){Taro.showToast({title:e instanceof Error?e.message:'保存失败',icon:'none'})}}
  return <View className='page'><View className='hero'><Text className='big'>我的比赛</Text><View>准备、模考、考试当天和赛后结果统一管理。</View></View>{rows.length===0?<View className='card'><View className='card-title'>暂时没有进行中的赛事服务</View><View className='muted'>关注赛事后会自动生成时间线。</View></View>:rows.map(c=><View key={c.id}><View className='section-title'>{c.titleZh}</View>{c.tasks.map((t:any)=>{const done=(c.progress?.completedTaskIds||[]).includes(t.id);return <View className='card' key={t.id}><View className='card-title'>{done?'✓ ':''}{t.titleZh}</View><View className='muted'>{t.date}{t.time?` · ${t.time}`:''}</View><View>{t.detailZh}</View>{(t.checklistZh||[]).map((x:string)=><View className='muted' key={x}>• {x}</View>)}<Button className={done?'secondary':'primary'} onClick={()=>toggle(c,t)}>{done?'标记为未完成':'完成此任务'}</Button></View>})}</View>)}</View>
}
