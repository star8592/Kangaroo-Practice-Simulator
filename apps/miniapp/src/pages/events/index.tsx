import { useEffect, useMemo, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, authStore, ensureWechatSession } from '../../services/api'

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
  const [region,setRegion]=useState('all')
  const [stage,setStage]=useState('all')
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [saving,setSaving]=useState('')
  const [followError,setFollowError]=useState('')
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
  useEffect(()=>{void load()},[])
  useEffect(()=>{
    if(rows.length&&Taro.getCurrentInstance().router?.params?.competition){
      void Taro.pageScrollTo({selector:'#world-detail',duration:150}).catch(()=>{})
    }
  },[rows.length])
  const visible=useMemo(()=>rows.filter(x=>(region==='all'||x.event.region===region)&&(stage==='all'||!x.event.referenceStages||x.event.referenceStages.includes(stage))),[rows,region,stage])
  const chosen=rows.find(x=>x.event.id===selected)||visible[0]
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
      await load()
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
