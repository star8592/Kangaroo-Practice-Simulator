import { useEffect, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api } from '../../services/api'

type ChecklistItem = {id:string;titleZh:string;detailZh:string;checklistZh?:string[]}
type DomesticEvent = {
  id:string;nameZh:string;audienceZh:string;statusZh:string;
  overviewZh:string;formatZh:string;sourceUrl:string;sourceLabelZh:string;
}
type DomesticRow = {
  event:DomesticEvent;
  companion:{id:string;tasks:ChecklistItem[]};
  progress:null|{completedTaskIds:string[]};
}
export default function EventsPage(){
  const [rows,setRows]=useState<any[]>([])
  const [domestic,setDomestic]=useState<DomesticRow[]>([])
  const [selected,setSelected]=useState('huabei')
  const [loading,setLoading]=useState(true)
  const [loadError,setLoadError]=useState('')
  const load=()=>api<any>('/api/miniapp/companions').then(x=>setRows(x.companions||[])).catch(()=>setRows([]))
  const loadDomestic=async()=>{
    setLoading(true);setLoadError('')
    try{
      const data=await api<{entries:DomesticRow[]}>('/api/miniapp/china-competitions')
      if(!Array.isArray(data.entries))throw new Error('国内赛事数据格式异常')
      setDomestic(data.entries)
    }catch(e){
      setDomestic([])
      setLoadError(e instanceof Error?e.message:'国内赛事暂时无法载入')
    }finally{setLoading(false)}
  }
  useEffect(()=>{
    void load();void loadDomestic()
    if(Taro.getCurrentInstance().router?.params?.section==='china'){
      // Scroll to the domestic directory once this page is visible.
      void Taro.pageScrollTo({selector:'#china-math-events',duration:300}).catch(()=>{})
    }
  },[])
  const toggle=async(c:any,t:any,domesticRow=false)=>{
    if(domesticRow&&!c.progress){
      Taro.showToast({title:'请登录学生账号后保存',icon:'none'})
      return
    }
    const done=(c.progress?.completedTaskIds||[]).includes(t.id)
    try{
      await api('/api/competition-companion/progress',{method:'PATCH',data:{companionId:c.id,taskId:t.id,completed:!done}})
      if(domesticRow)await loadDomestic()
      else await load()
    }catch(e){
      Taro.showToast({title:e instanceof Error?e.message:'保存失败',icon:'none'})
    }
  }
  const chosen=domestic.find(x=>x.event.id===selected)
  return <View className='page'>
    <View className='hero'><Text className='big'>我的比赛</Text><View>准备、模考、考试当天和赛后结果统一管理。</View></View>
    {rows.length===0?<View className='card'><View className='card-title'>暂无已核验的进行中赛事流程</View><View className='muted'>国内赛事备赛资料在下方；未核实报名的活动不会冒充正在进行的比赛。</View></View>:rows.map(c=><View key={c.id}><View className='section-title'>{c.titleZh}</View>{c.tasks.map((t:any)=>{const done=(c.progress?.completedTaskIds||[]).includes(t.id);return <View className='card' key={t.id}><View className='card-title'>{done?'✓ ':''}{t.titleZh}</View><View className='muted'>{t.date}{t.time?' · '+t.time:''}</View><View>{t.detailZh}</View>{(t.checklistZh||[]).map((x:string)=><View className='muted' key={x}>• {x}</View>)}<Button className={done?'secondary':'primary'} onClick={()=>toggle(c,t)}>{done?'标记为未完成':'完成此任务'}</Button></View>})}</View>)}
    <View id='china-math-events' className='section-title'>中国数学赛事管家</View>
    <View className='muted'>华杯赛、走美杯、希望杯、数学奥林匹克等。未经核验的报名时间不显示倒计时。</View>
    {loading&&<View className='card'>正在读取国内赛事…</View>}
    {loadError&&<View className='card'><View className='card-title'>赛事资料读取失败</View><View className='muted'>{loadError}</View><Button className='primary' onClick={()=>void loadDomestic()}>重新加载</Button></View>}
    {domestic.map(x=><View className='card' key={x.event.id}><View className='card-title'>{x.event.nameZh}</View><View className='muted'>{x.event.statusZh}</View><View>{x.event.audienceZh}</View><Button className={selected===x.event.id?'primary':'secondary'} onClick={()=>setSelected(x.event.id)}>{selected===x.event.id?'已选中 · 查看清单':'查看备赛流程'}</Button></View>)}
    {chosen&&<View>
      <View className='section-title'>{chosen.event.nameZh} · 备赛清单</View>
      <View className='card'><View>{chosen.event.overviewZh}</View><View className='muted'>形式：{chosen.event.formatZh}</View><View className='muted'>信息来源：{chosen.event.sourceLabelZh}</View><Button className='secondary' onClick={()=>void Taro.setClipboardData({data:chosen.event.sourceUrl})}>复制来源网址</Button></View>
      {chosen.companion.tasks.map((t,index)=>{
        const done=(chosen.progress?.completedTaskIds||[]).includes(t.id)
        return <View className='card' key={t.id}>
          <View className='card-title'>{index+1}. {t.titleZh}{done?' ✓':''}</View>
          <View className='muted'>无当届官方截止日期 · 本站准备建议</View>
          <View>{t.detailZh}</View>
          {(t.checklistZh||[]).map(x=><View className='muted' key={x}>• {x}</View>)}
          <Button className={done?'secondary':'primary'} onClick={()=>void toggle({...chosen.companion,progress:chosen.progress},t,true)}>{!chosen.progress?'登录学生账号后保存':done?'撤销完成':'完成此任务'}</Button>
        </View>
      })}
    </View>}
  </View>
}
