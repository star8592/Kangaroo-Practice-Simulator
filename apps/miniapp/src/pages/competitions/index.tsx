import { useEffect, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, goLoginIfNeeded } from '../../services/api'

export default function CompetitionsPage(){
  const [exams,setExams]=useState<any[]>([])
  useEffect(()=>{if(goLoginIfNeeded())return;api<any>('/api/miniapp/exams').then(x=>setExams(x.exams||[])).catch(()=>{})},[])
  return <View className='page'>
    <View className='hero'><Text className='big'>竞赛实战</Text><View>按正式比赛流程完成一场训练，而不是只浏览题库。</View></View>
    <View className='card'><View className='card-title'>赛事服务</View><View className='muted'>何时模考、当天带什么、官方流程，一条时间线管到底。</View><Button className='secondary' onClick={()=>Taro.navigateTo({url:'/pages/events/index'})}>查看我的比赛</Button></View>
    <View className='section-title'>可训练试卷</View>
    {exams.slice(0,60).map(ex=><View className='card' key={ex.id}><View className='row'><View><View className='card-title'>{ex.name}</View><View className='muted'>{ex.year||''} · {ex.grades} · {ex.questionCount} 题</View></View><Text>{ex.miniappReady?'可实战':'分段赛制'}</Text></View><Button className={ex.miniappReady?'primary':'secondary'} disabled={!ex.miniappReady} onClick={()=>Taro.navigateTo({url:`/pages/exam/index?examId=${encodeURIComponent(ex.id)}`})}>{ex.miniappReady?'开始实战':'暂在 Web 完成'}</Button></View>)}
  </View>
}
