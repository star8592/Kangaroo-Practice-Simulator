import { useEffect, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, authStore } from '../../services/api'
import { learnerNextAction } from '../../services/learning-home-copy'

export default function ProfilePage(){
  const u=authStore.user()
  const [data,setData]=useState<any>(null)
  const [loading,setLoading]=useState(true)
  const [showNumbers,setShowNumbers]=useState(false)
  const [loadError,setLoadError]=useState(false)
  const isWechat=u?.username==='wechat'||u?.candidateNo==='WECHAT'
  const isGuest=u?.username==='guest'||u?.candidateNo==='GUEST'
  const load=()=>{
    setLoading(true);setLoadError(false)
    api('/api/student/analytics').then(result=>setData(result)).catch(()=>setLoadError(true)).finally(()=>setLoading(false))
  }
  useEffect(()=>{if(u?.id)load();else setLoading(false)},[u?.id])
  const next=learnerNextAction(data)
  const sessions=Number(data?.arithmetic?.sessions||0)
  const exams=Number(data?.overview?.examAttempts||0)
  const attention=(data?.nextPlan||[]).find((x:any)=>x.title&&x.action)
  const arithmeticInsight=(data?.arithmetic?.plan?.summaryZh||[]).find((x:string)=>typeof x==='string'&&x.trim())
  const goArithmetic=()=>Taro.switchTab({url:'/pages/arithmetic/index'})
  return <View className='page'>
    <View className='hero'>
      <View className='eyebrow'>我的学习档案</View>
      <Text className='big'>{isWechat?'微信学习档案':isGuest?'游客临时体验':u?.name||'我的'}</Text>
      <View className='hero-copy'>这里不考核刷了多少题，只帮助你确定现在怎么练、为什么练。</View>
    </View>
    <View className='card learning-action-card'>
      <View className='card-title'>下一步最值得做什么</View>
      {loading?<View className='muted'>正在整理当前账号的练习情况…</View>:<>
        <Text className='learning-action-title'>{next.title}</Text>
        <View className='muted'>{next.detail}</View>
        <Button className='primary' onClick={()=>void goArithmetic()}>{sessions?'继续一组针对性训练':'选年级，做一次计算诊断'}</Button>
        {loadError&&<View className='muted'>暂时无法读取历史记录；建议仅作通用入口使用，不代表已经完成诊断。</View>}
      </>}
    </View>
    {(sessions>0||exams>0)&&<View className='card'>
      <View className='card-title'>目前知道什么、还不知道什么</View>
      {arithmeticInsight&&<View className='profile-row'><View className='muted'>来自计算训练</View><View>{arithmeticInsight}</View></View>}
      {attention&&<View className='profile-row'><View className='muted'>来自正式模拟</View><View>{attention.title}</View><View className='muted'>{attention.action}</View>{attention.evidence&&<View className='muted'>依据：{attention.evidence}</View>}</View>}
      {!arithmeticInsight&&!attention&&<View className='muted'>练习次数还不足以稳定判断弱项。系统不会把偶尔错一道题当作持续问题。</View>}
    </View>}
    <View className='card'>
      <View className='card-title'>练习数据，需要时再看</View>
      <View className='muted'>数字是解释建议的证据，不是要孩子每天追逐的排名；计算练习与竞赛模拟分别统计。</View>
      <Button className='secondary' onClick={()=>setShowNumbers(x=>!x)}>{showNumbers?'收起详细记录':'展开详细记录与依据'}</Button>
      {showNumbers&&<View className='profile-data-details'>
        {data?<><View className='row profile-row'><Text>完成的计算训练</Text><Text>{sessions} 轮</Text></View>
        <View className='row profile-row'><Text>正式模拟</Text><Text>{exams} 套</Text></View>
        <View className='row profile-row'><Text>正式模拟已作答正确</Text><Text>{data.overview?.totalQuestions?String(data.overview.correct||0)+'/'+data.overview.totalQuestions:'暂无样本'}</Text></View>
        <View className='muted'>留空题单独统计，不算作答错；不同竞赛的评分和难度不能直接比较。</View></>:
        <View className='muted'>{loading?'正在读取…':'当前没有可展示的数据记录。'}</View>}
        {loadError&&<Button className='text-action' onClick={load}>重新读取</Button>}
      </View>}
    </View>
    {isGuest?<View className='card'><View className='card-title'>当前为临时游客</View><View className='muted'>临时体验记录可能随会话失效，切换身份后不会自动合并旧数据。</View></View>:
      isWechat?<View className='card'><View className='row'><Text>身份状态</Text><Text className='good'>微信已连接</Text></View><View className='muted'>微信记录暂不自动合并网站已有学生账号；如需找回旧记录，请先验证原账号。</View></View>:
      <View className='card'><View className='row'><Text>训练年级</Text><Text>{u?.grade||'—'}</Text></View></View>}
    <Button className='secondary' onClick={()=>Taro.navigateTo({url:'/pages/login/index'})}>{isGuest?'连接微信或使用已有学生账号':isWechat?'使用已有学生账号':'切换登录方式'}</Button>
  </View>
}
