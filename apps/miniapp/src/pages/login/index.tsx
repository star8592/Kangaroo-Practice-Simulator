import { useState } from 'react'
import { Button, Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, authStore } from '../../services/api'

export default function LoginPage() {
  const [account,setAccount]=useState('')
  const [pin,setPin]=useState('')
  const [busy,setBusy]=useState(false)
  const login=async()=>{
    if(!account.trim()||!pin.trim()) return Taro.showToast({title:'请输入账号和 PIN',icon:'none'})
    setBusy(true)
    try{
      const data=await api<any>('/api/auth/miniapp/login',{method:'POST',auth:false,data:{username:account,pin}})
      authStore.save(data.accessToken,data.user)
      Taro.switchTab({url:'/pages/home/index'})
    }catch(e){Taro.showToast({title:e instanceof Error?e.message:'登录失败',icon:'none'})}
    finally{setBusy(false)}
  }
  return <View className='page'>
    <View className='hero'><Text className='big'>数学训练与竞赛</Text><View><Text>每天练计算，随时打真题，比赛准备有人管。</Text></View></View>
    <View className='card'>
      <View className='card-title'>学生登录</View>
      <Input className='input' placeholder='用户名或准考证号' value={account} onInput={e=>setAccount(e.detail.value)}/>
      <Input className='input' password placeholder='PIN' value={pin} onInput={e=>setPin(e.detail.value)}/>
      <Button className='primary' loading={busy} onClick={login}>进入训练</Button>
      <View className='muted'>第一版先复用现有学生账号。微信一键登录会在 AppID 配置完成后接入。</View>
    </View>
  </View>
}
