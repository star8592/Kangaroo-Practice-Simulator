import { useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

const BASE = process.env.TARO_APP_API_BASE || 'https://socthink.cn'
type Step = {name:string;status:'PASS'|'FAIL';detail:string}
function previewOnly():boolean{
  try{return ['develop','trial'].includes(Taro.getAccountInfoSync().miniProgram.envVersion)}
  catch{return false}
}
function explain(e:unknown):string{
  const msg=String((e as {errMsg?:string})?.errMsg||(e as Error)?.message||e)
  if(/domain list|not in domain|request.*域名|合法域名/i.test(msg))return '微信未放行 request 合法域名：https://socthink.cn'
  if(/time.?out/i.test(msg))return '请求超时，检查网络'
  return msg.replace(/(code|access_token|openid|secret)=\S+/gi,'$1=[REDACTED]').slice(0,130)
}
export default function DiagnosticsPage(){
  const [busy,setBusy]=useState(false)
  const [steps,setSteps]=useState<Step[]>([])
  const [report,setReport]=useState('')
  const run=async()=>{
    if(busy)return
    setBusy(true);setSteps([]);setReport('')
    const rows:Step[]=[]
    const add=(name:string,status:Step['status'],detail:string)=>{
      rows.push({name,status,detail});setSteps([...rows])
    }
    let token='';let wxVerified=false
    const post=(path:string,data:unknown)=>Taro.request<any>({
      url:BASE+path,method:'POST',data,timeout:12000,
      header:{'content-type':'application/json'}
    })
    try{
      let code=''
      try{
        const login=await Taro.login()
        if(!login.code)throw Error('微信未返回登录凭证')
        code=login.code
        add('微信 wx.login','PASS','获得临时凭证（不显示）')
      }catch(e){add('微信 wx.login','FAIL',explain(e))}
      if(code){
        try{
          const r=await post('/api/auth/miniapp/wechat',{code})
          if(r.statusCode!==200||!r.data?.accessToken)throw Error('HTTP '+r.statusCode+' '+String(r.data?.error||''))
          token=String(r.data.accessToken);wxVerified=true
          add('服务端验证微信','PASS','HTTP 200，微信身份已连接')
        }catch(e){add('服务端验证微信','FAIL',explain(e))}
      }
      if(!token){
        try{
          const r=await post('/api/auth/miniapp/guest',{})
          if(r.statusCode!==200||!r.data?.accessToken)throw Error('HTTP '+r.statusCode)
          token=String(r.data.accessToken)
          add('游客回退','PASS','HTTP 200，可计算但不是微信登录')
        }catch(e){add('游客回退','FAIL',explain(e))}
      }
      if(token){
        try{
          const r=await Taro.request<any>({url:BASE+'/api/miniapp/exams',timeout:12000,
            header:{Authorization:'Bearer '+token}})
          const n=r.data?.exams?.length
          if(r.statusCode!==200||!Number.isFinite(n)||n<1)throw Error('HTTP '+r.statusCode+'，套数='+String(n))
          add('竞赛列表','PASS','HTTP 200，'+n+' 套')
        }catch(e){add('竞赛列表','FAIL',explain(e))}
        try{
          const r=await Taro.request<any>({url:BASE+'/api/miniapp/arithmetic/session',
            method:'POST',data:{action:'start',grade:1,mode:'diagnostic'},timeout:12000,
            header:{Authorization:'Bearer '+token,'content-type':'application/json'}})
          const n=r.data?.questions?.length
          if(r.statusCode!==200||!Number.isFinite(n)||n<1)throw Error('HTTP '+r.statusCode+'，题数='+String(n))
          add('启动计算','PASS','HTTP 200，'+n+' 道题，不交卷')
        }catch(e){add('启动计算','FAIL',explain(e))}
      }
    }finally{
      let env='unknown',ver='unknown'
      try{
        const info=Taro.getAccountInfoSync().miniProgram
        env=String(info.envVersion||'unknown')
        ver=String(info.version||'preview')
      }catch{/* leave versions unknown */}
      setReport(['微信小程序连接诊断','环境：'+env,'版本：'+ver,'API：'+BASE,
        '结果：'+(wxVerified&&rows.every(x=>x.status==='PASS')?'PASS':'NEEDS_ATTENTION'),
        ...rows.map(x=>x.name+'：'+x.status+'；'+x.detail)].join('\n'))
      setBusy(false)
    }
  }
  if(!previewOnly())return <View className='page'><View className='card'>连接诊断仅在开发版、体验版可用。</View></View>
  return <View className='page'>
    <View className='hero'><Text className='big'>微信连接诊断</Text>
      <View>检测手机上的真实网络请求，不改变账号、不提交成绩。</View>
    </View>
    <View className='card'><View className='card-title'>一键检查</View>
      <View className='muted'>依次检查微信登录、服务端验证、游客回退、竞赛目录和计算题目。</View>
      <Button className='primary' loading={busy} disabled={busy} onClick={()=>void run()}>
        {busy?'诊断中…':'开始连接诊断'}</Button></View>
    {steps.map((s,i)=><View className='card' key={i}>
      <View className='row'><Text className='card-title'>{s.name}</Text>
        <Text className={s.status==='PASS'?'good':'bad'}>{s.status}</Text></View>
      <View className='muted'>{s.detail}</View>
    </View>)}
    {!!report&&<View className='card'><View className='card-title'>匿名诊断报告</View>
      <Button className='secondary' onClick={()=>void Taro.setClipboardData({data:report})}>复制报告</Button></View>}
    <Button className='secondary' onClick={()=>Taro.switchTab({url:'/pages/profile/index'})}>返回我的</Button>
  </View>
}

