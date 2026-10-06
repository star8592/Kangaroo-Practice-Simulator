import { useState } from 'react'
import { Button, Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, authStore } from '../../services/api'

export default function LoginPage() {
  const [account,setAccount]=useState('')
  const [pin,setPin]=useState('')
  const [busy,setBusy]=useState(false)
  const guest=async()=>{setBusy(true);try{const data=await api<any>('/api/auth/miniapp/guest',{method:'POST',auth:false});authStore.save(data.accessToken,data.user);Taro.switchTab({url:'/pages/home/index'})}catch(e){Taro.showToast({title:e instanceof Error?e.message:'体验模式暂不可用',icon:'none'})}finally{setBusy(false)}}
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
      <Button className='secondary' disabled={busy} onClick={guest}>游客体验</Button>
      <View className='muted'>无需账号可先体验；正式学习记录请使用学生账号登录。</View>
    </View>
  </View>
}
