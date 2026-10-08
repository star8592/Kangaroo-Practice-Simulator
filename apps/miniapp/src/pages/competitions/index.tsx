import { useMemo, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { api, authStore } from '../../services/api'

const groups = [
  { id: 'all', label: '全部' },
  { id: 'kangaroo', label: '袋鼠数学' },
  { id: 'australian-amc', label: '澳洲 AMC' },
  { id: 'maa-amc', label: '美国 AMC' },
  { id: 'cemc', label: '加拿大 CEMC' },
]
export default function CompetitionsPage() {
  const [exams, setExams] = useState<any[]>([])
  const [competition, setCompetition] = useState('all')
  const [limit, setLimit] = useState(20)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user,setUser] = useState<any>(()=>authStore.user())
  const isGuest = !user || user.username === 'guest' || user.candidateNo === 'GUEST'
  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const payload = await api<{exams:any[]}>('/api/miniapp/exams')
      if (!Array.isArray(payload?.exams)) throw new Error('赛事列表数据格式不正确，请重试')
      setExams(payload.exams)
      setUser(authStore.user())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '试卷加载失败，请重试')
    } finally { setLoading(false) }
  }
  useDidShow(() => { void load() })
  const filtered = useMemo(
    () => competition === 'all' ? exams : exams.filter(x => x.competitionId === competition),
    [competition, exams]
  )
  const openExam = async (ex: any) => {
    const active = authStore.user()
    if(!active || active.username === 'guest' || active.candidateNo === 'GUEST'){
      const choice = await Taro.showModal({
        title:'正式竞赛需要学习账号',
        content:'可以先查看赛事与试卷目录。开始整套模拟考试，需要连接微信学习身份或已有学生账号。',
        confirmText:'去登录',
        cancelText:'继续浏览'
      })
      if(choice.confirm) await Taro.navigateTo({url:'/pages/login/index'})
      return
    }
    const examId = ex.paperType === 'smart' ? ex.id + '--' + Date.now().toString(36) : ex.id
    try { await Taro.navigateTo({ url:'/pages/exam/index?examId=' + encodeURIComponent(examId) }) }
    catch { Taro.showToast({ title:'无法打开试卷，请重试', icon:'none' }) }
  }
  return <View className='page'>
    <View className='hero'><Text className='big'>竞赛实战</Text><View>选择赛事，直接进入真题或智能组卷。</View></View>
    <View className='card'><View className='card-title'>按赛事筛选</View>
      <View className='competition-tabs'>
        {groups.map(g => <Button key={g.id} size='mini'
          className={competition===g.id?'competition-tab active':'competition-tab'}
          onClick={() => { setCompetition(g.id);setLimit(20) }}>{g.label}</Button>)}
      </View>
    </View>
    {isGuest&&!loading&&!error&&<View className='card'>
      <View className='card-title'>游客可浏览赛事与试卷</View>
      <View className='muted'>完整模拟考试需要微信学习身份或已有学生账号。计算训练无需登录。</View>
      <Button className='secondary' onClick={()=>Taro.navigateTo({url:'/pages/login/index'})}>连接微信或学生账号</Button>
    </View>}
    {loading && <View className='card'><Text>正在加载竞赛题库…</Text></View>}
    {!!error && <View className='card error-card'>
      <View className='card-title'>竞赛题库暂时无法加载</View>
      <View className='bad'>{error}</View>
      <Button className='primary' onClick={() => { void load() }}>重新加载试卷</Button>
      <View className='muted'>持续失败，请检查网络或联系管理员。</View>
    </View>}
    {!loading && !error && <>
      <View className='section-title'>可训练试卷 · {filtered.length} 套</View>
      {filtered.slice(0, limit).map(ex => <View className='card exam-card' key={ex.id}>
        <View className='row'>
          <View><View className='card-title'>{ex.name}</View><View className='muted'>{ex.year||''} · {ex.grades} · {ex.questionCount} 题</View></View>
          <Text className='muted'>{!ex.miniappReady?'Web':isGuest?'需登录':'可实战'}</Text>
        </View>
        <Button className={ex.miniappReady?'primary':'secondary'} disabled={!ex.miniappReady}
          onClick={() => { void openExam(ex) }}>{!ex.miniappReady?'暂请在网页完成':isGuest?'登录后开始实战':'开始实战'}</Button>
      </View>)}
      {!filtered.length && <View className='card'>
        <View className='card-title'>当前筛选没有试卷</View>
        <View className='muted'>可选择「全部」浏览其他赛事。</View>
      </View>}
      {limit < filtered.length && <Button className='secondary' onClick={()=>setLimit(x=>x+20)}>查看更多试卷</Button>}
    </>}
    <View className='card'><View className='card-title'>赛事服务</View>
      <View className='muted'>报名、倒计时、模考和考前准备</View>
      <Button className='secondary' onClick={()=>Taro.navigateTo({url:'/pages/events/index'})}>查看我的比赛</Button>
    </View>
  </View>
}
