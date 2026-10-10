import { useEffect, useMemo, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { api, authStore, ensureWechatSession } from '../../services/api'
import { TRAINING_INTENT_KEY, availableTrainingEventIds, makeTrainingIntent, type TrainingEventId } from '../../services/competition-training-intent'
import { WORLD_EVENT_INTENT_KEY, readWorldEventIntent } from '../../services/world-event-intent'

type Notice={id:string;eventId:string;titleZh:string;date:string;daysUntil:number;detailZh:string;sourceUrl:string}
type Intelligence={region:string|null;notices:Notice[];next:Notice[];followedCount:number;reviewedEditionCount:number}
const participationRegions=[{id:'',name:'选择参赛地区'},{id:'CN',name:'中国'},{id:'US',name:'美国'},{id:'AU',name:'澳大利亚'},{id:'CA',name:'加拿大'},{id:'GB',name:'英国'}]
type WorldEntry = {
  event:{
    id:string;region:string;nameZh:string;summaryZh:string;sourceUrl:string;referenceStages?:string[];
    sourceLabelZh:string;trainingId?:string;
  };
  companion:null|{
    id:string;titleZh:string;registrationVerified?:boolean;
    tasks:Array<{id:string;titleZh:string;detailZh:string;date?:string;time?:string;checklistZh?:string[]}>;
  };
  progress:null|{completedTaskIds:string[]};
  following:null|boolean;
}
const regions=[
  {id:'all',name:'全部'}, {id:'CN',name:'中国'}, {id:'US',name:'美国'},
  {id:'AU',name:'澳大利亚'}, {id:'CA',name:'加拿大'},
  {id:'GB',name:'英国'}, {id:'global',name:'全球性'},
]
export default function EventsPage(){
  const initial=Taro.getCurrentInstance().router?.params?.competition||'kangaroo'
  const [rows,setRows]=useState<WorldEntry[]>([])
  const [selected,setSelected]=useState(initial)
  const [focusEventId,setFocusEventId]=useState<string|null>(null)
  const [region,setRegion]=useState('all')
  const [stage,setStage]=useState('all')
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [saving,setSaving]=useState('')
  const [followError,setFollowError]=useState('')
  const [intel,setIntel]=useState<Intelligence|null>(null)
  const [intelError,setIntelError]=useState('')
  const [intelBusy,setIntelBusy]=useState(false)
  const [readyTraining,setReadyTraining]=useState<TrainingEventId[]>([])
  const [trainingLoad,setTrainingLoad]=useState<'loading'|'ready'|'error'>('loading')
  const loadTraining=async()=>{
    setTrainingLoad('loading')
    try{
      const data=await api<{exams:unknown}>('/api/miniapp/exams')
      setReadyTraining(availableTrainingEventIds(data.exams))
      setTrainingLoad('ready')
    }catch{
      setReadyTraining([])
      setTrainingLoad('error')
    }
  }
  const loadIntelligence=async()=>{
    try {
      const result=await api<Intelligence>('/api/competition-intelligence')
      setIntel(result);setIntelError('')
    }catch{setIntel(null);setIntelError('登录正式微信学习档案后，可保存赛区并查看个性化情报。')}
  }

  const load=async()=>{
    setLoading(true);setError('')
    try{
      const x=await api<{entries:WorldEntry[]}>('/api/miniapp/world-competitions')
      if(!Array.isArray(x.entries))throw new Error('赛事列表格式异常')
      setRows(x.entries)
    }catch(e){
      setError(e instanceof Error?e.message:'赛事暂时无法载入')
    }finally{setLoading(false)}
  }
  useEffect(()=>{void load();void loadIntelligence();void loadTraining()},[])
  useDidShow(()=>{
    // A tab cannot receive ordinary route query params; consume at most once.
    let pending: unknown
    try{
      pending=Taro.getStorageSync(WORLD_EVENT_INTENT_KEY)
      Taro.removeStorageSync(WORLD_EVENT_INTENT_KEY)
    }catch{pending=null}
    const eventId=readWorldEventIntent(pending)
    if(eventId){
      setRegion('all');setStage('all');setSelected(eventId);setFocusEventId(eventId)
    }
    // Returning to the tab refreshes user-scoped follows and preparation progress.
    void load()
    void loadIntelligence()
  })
  useEffect(()=>{
    if(!focusEventId || !rows.length)return
    if(!rows.some(x=>x.event.id===focusEventId)){setFocusEventId(null);return}
    Taro.nextTick(()=>{void Taro.pageScrollTo({selector:'#world-detail',duration:150}).catch(()=>{})})
    setFocusEventId(null)
  },[rows,focusEventId])
  const visible=useMemo(()=>rows.filter(x=>(region==='all'||x.event.region===region)&&(stage==='all'||!x.event.referenceStages||x.event.referenceStages.includes(stage))),[rows,region,stage])
  const chosen=visible.find(x=>x.event.id===selected)||visible[0]
  const followed=rows.filter(x=>x.following===true)
  const nextFocus=followed.map(x=>{
    const done=new Set(x.progress?.completedTaskIds||[])
    return {row:x,task:x.companion?.tasks.find(t=>!done.has(t.id))}
  }).filter(x=>x.task).slice(0,3)

  const toggle=async(c:WorldEntry,t:{id:string})=>{
    if(!c.progress||!c.companion){Taro.showToast({title:'请登录学生账号后保存',icon:'none'});return}
    const done=c.progress.completedTaskIds.includes(t.id)
    setSaving(t.id)
    try{
      await api('/api/competition-companion/progress',{method:'PATCH',data:{
        companionId:c.companion.id,taskId:t.id,completed:!done,
      }})
      await load()
    }catch(e){
      Taro.showToast({title:e instanceof Error?e.message:'保存失败',icon:'none'})
    }finally{setSaving('')}
  }
  const openTraining=async(trainingId: unknown)=>{
    const intent=makeTrainingIntent(trainingId)
    if(!intent){Taro.showToast({title:'本赛事暂无可用站内模拟试卷',icon:'none'});return}
    try{
      Taro.setStorageSync(TRAINING_INTENT_KEY,intent)
      await Taro.switchTab({url:'/pages/competitions/index'})
    }catch{
      Taro.removeStorageSync(TRAINING_INTENT_KEY)
      Taro.showToast({title:'竞赛训练暂时无法打开，请重试',icon:'none'})
    }
  }
  const toggleFollow=async(item:WorldEntry)=>{
    setSaving('follow-'+item.event.id);setFollowError('')
    try{
      if(item.following===null) {
        const u=authStore.user()
        if(!authStore.token()||u?.username==='guest'||u?.candidateNo==='GUEST'){
          await ensureWechatSession(true,false)
        }
      }
      await api('/api/competition-follow',{method:'PATCH',data:{
        eventId:item.event.id,following:!item.following,
      }})
      await load();await loadIntelligence()
    }catch(e){
      const msg=e instanceof Error?e.message:'关注保存失败'
      setFollowError(msg)
      Taro.showToast({title:msg,icon:'none'})
    }finally{setSaving('')}
  }
  return <View className='page'>
    <View className='hero'><Text className='big'>全球数学赛事管家</Text>
      <View>同一套流程管理全球赛事：核实资格、报名准备、模拟、设备调试、比赛、成绩与证书。</View>
    </View>
    <View className='section-title'>赛事情报与截止提醒</View>
    <View className='card'>
      <View className='muted'>只根据已关注赛事、拟参赛赛区与可追溯的有效来源生成正式日期提醒。未核验的学校信息不会触发倒计时。</View>
      {intel ? <View>
        <View className='card-title'>计划参赛地区</View>
        <View className='competition-tabs'>
          {participationRegions.map(r=><Button key={r.id} disabled={intelBusy}
            className={(intel.region||'')===r.id?'competition-tab active':'competition-tab'}
            onClick={async()=>{
              setIntelBusy(true);setIntelError('')
              try{
                const x=await api<Intelligence>('/api/competition-intelligence',{
                  method:'PATCH',data:{region:r.id||null}
                })
                setIntel(x)
              }catch{setIntelError('保存赛区失败，请稍后重试。')}
              finally{setIntelBusy(false)}
            }}>{r.name}</Button>)}
        </View>
        {intel.next.length?intel.next.map(n=><View key={n.id} className='card'>
          <View className='card-title'>{n.titleZh}</View>
          <View>{n.date} · 还有 {n.daysUntil} 天</View><View className='muted'>{n.detailZh}</View>
          <Button className='secondary' onClick={()=>{
            setRegion('all');setStage('all');setSelected(n.eventId)
            void Taro.pageScrollTo({selector:'#world-detail',duration:150}).catch(()=>{})
          }}>查看赛事清单及来源</Button>
        </View>):<View className='muted'>{intel.region?
          '当前关注赛事暂无已核验的临近日期；备赛任务仍可正常使用。':
          '先选择拟参赛地区，才能识别当地节点。'}</View>}
      </View>:<Button className='secondary' onClick={()=>void loadIntelligence()}>登录/刷新赛事情报</Button>}
      {!!intelError&&<View className='muted'>{intelError}</View>}
      <View className='muted'>当前为站内查询，不代表微信订阅消息已开通。</View>
    </View>
    <View className='section-title'>我的关注 · {followed.length} 项</View>
    {nextFocus.length>0?<View className='card'>
      <View className='card-title'>下一步行动 · 最多三项</View>
      {nextFocus.map(x=><View key={x.row.event.id}>
        <View className='card-title'>{x.row.event.nameZh}</View>
        <View>{x.task?.titleZh}</View>
        <Button className='secondary' onClick={()=>{
          setRegion('all');setStage('all');setSelected(x.row.event.id)
          void Taro.pageScrollTo({selector:'#world-detail',duration:150}).catch(()=>{})
        }}>打开备赛清单</Button>
      </View>)}
      <View className='muted'>关注不代表报名；无官方核验日期的待办不显示倒计时。</View>
    </View>:<View className='muted'>关注任意赛事后，会在这里集中显示下一步任务。</View>}
    <View className='competition-tabs'>
      {regions.map(r=><Button key={r.id} className={region===r.id?'competition-tab active':'competition-tab'} onClick={()=>{
        setRegion(r.id)
        const first=rows.find(x=>r.id==='all'||x.event.region===r.id)
        if(first)setSelected(first.event.id)
      }}>{r.name}</Button>)}
    </View>
    <View className='competition-tabs'>
      {[{id:'all',name:'全部学段'},{id:'primary',name:'小学'},{id:'junior',name:'初中'},{id:'senior',name:'高中'}].map(g=><Button key={g.id}
        className={stage===g.id?'competition-tab active':'competition-tab'} onClick={()=>{
        setStage(g.id)
        const first=rows.find(x=>(region==='all'||x.event.region===region)&&(g.id==='all'||!x.event.referenceStages||x.event.referenceStages.includes(g.id)))
        if(first)setSelected(first.event.id)
      }}>{g.name}</Button>)}
    </View>

    <View className='muted'>学段与赛区资格须按当届官方通知核实；关注不等于报名。</View>
    {!!followError&&<View className='muted'>{followError}</View>}
    {loading&&<View className='card'>正在载入全球赛事…</View>}
    {!!error&&<View className='card'><View>{error}</View><Button className='primary' onClick={()=>void load()}>重试</Button></View>}
    {!loading&&!error&&visible.length===0&&<View className='card'>
      <View className='card-title'>没有符合条件的赛事</View>
      <View className='muted'>试试切换学段或地区；不会影响已关注赛事。</View>
      <Button className='secondary' onClick={()=>{setRegion('all');setStage('all')}}>查看全部赛事</Button>
    </View>}
    {visible.map(x=><View className='card' key={x.event.id}>
      <View className='muted'>{regions.find(r=>r.id===x.event.region)?.name||x.event.region}</View>
      <View className='card-title'>{x.event.nameZh}</View>
      <View>{x.event.summaryZh}</View>
      {x.following===true&&<View className='muted'>✓ 已关注 · 已加入个人赛事清单</View>}
      <Button className='secondary' disabled={saving==='follow-'+x.event.id} onClick={()=>void toggleFollow(x)}>
        {saving==='follow-'+x.event.id?'保存中…':x.following===null?'微信登录后关注':x.following?'取消关注':'＋ 关注赛事'}
      </Button>
      <Button className={x.event.id===chosen?.event.id?'primary':'secondary'} onClick={()=>{setSelected(x.event.id);void Taro.pageScrollTo({selector:'#world-detail',duration:150}).catch(()=>{})}}>
        {x.event.id===chosen?.event.id?'当前赛事 ✓':'查看赛事管家'}
      </Button>
    </View>)}
    {chosen&&chosen.companion&&<View id='world-detail'>
      <View className='section-title'>{chosen.event.nameZh} · 参赛流程</View>
      <View className='card'>
        <View>{chosen.companion.registrationVerified===false?'当前赛区报名信息待核验，以下为本站备赛清单。':'按当届已核验通知执行；跨赛区安排不可直接套用。'}</View>
        <View className='muted'>{chosen.event.sourceLabelZh}</View>
        <Button className='secondary' onClick={()=>void Taro.setClipboardData({data:chosen.event.sourceUrl})}>复制赛事来源网址</Button>
        {chosen.event.trainingId&&readyTraining.includes(chosen.event.trainingId as TrainingEventId)&&<Button className='primary'
          onClick={()=>void openTraining(chosen.event.trainingId)}>
          进入 {chosen.event.nameZh} 模拟训练
        </Button>}
        {trainingLoad==='loading'&&chosen.event.trainingId&&<View className='muted'>正在核对当前可用的模拟试卷…</View>}
        {trainingLoad==='error'&&chosen.event.trainingId&&<View>
          <View className='muted'>暂时无法核对试卷目录，备赛清单仍可使用。</View>
          <Button className='secondary' onClick={()=>void loadTraining()}>重试读取试卷</Button>
        </View>}
        {(!chosen.event.trainingId||(trainingLoad==='ready'&&!readyTraining.includes(chosen.event.trainingId as TrainingEventId)))&&
          <View className='muted'>本站目前没有可在小程序直接作答的该赛事试卷，仍可按清单备赛并查看官方来源。</View>}
      </View>
      {chosen.companion.tasks.map((t,index)=>{
        const done=(chosen.progress?.completedTaskIds||[]).includes(t.id)
        return <View className='card' key={t.id}>
          <View className='card-title'>{index+1}. {t.titleZh}{done?' ✓':''}</View>
          <View className='muted'>{t.date||'日期待当届公告'}{t.time?' · '+t.time:''}</View>
          <View>{t.detailZh}</View>
          {(t.checklistZh||[]).map(v=><View className='muted' key={v}>• {v}</View>)}
          <Button className={done?'secondary':'primary'} disabled={saving===t.id} onClick={()=>void toggle(chosen,t)}>
            {!chosen.progress?'登录学生账号后保存':saving===t.id?'保存中…':done?'撤销完成':'完成此任务'}
          </Button>
        </View>
      })}
    </View>}
  </View>
}
