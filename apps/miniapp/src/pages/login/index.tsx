import { useState } from 'react'
import { Button, Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, authStore, ensureWechatSession } from '../../services/api'

export default function LoginPage() {
  const [account,setAccount]=useState('')
  const [pin,setPin]=useState('')
  const [busy,setBusy]=useState(false)
  const [showLegacy,setShowLegacy]=useState(false)

  const wechat=async()=>{
    const current=authStore.user()
    if(current&&(current.username==='guest'||current.candidateNo==='GUEST'||(current.username!=='wechat'&&current.candidateNo!=='WECHAT'))){
      const guest=current.username==='guest'||current.candidateNo==='GUEST'
      const choice=await Taro.showModal({
        title:'切换到微信学习档案',
        content:guest?'当前是临时游客，旧游客成绩不会自动并入微信档案。请先完成正在做的题目。确定切换吗？':'站内学生账号与微信学习档案尚未自动关联。切换后不会显示原学生账号的成绩，确定切换吗？',
        confirmText:'切换',
        cancelText:'暂不'
      })
      if(!choice.confirm)return
    }
    setBusy(true)
    try{
      await ensureWechatSession(true, false)
      const verified=authStore.user()
      if(verified?.username!=='wechat'&&verified?.candidateNo!=='WECHAT'){
        throw new Error('微信身份暂未连接，已保留原来的登录状态')
      }
      await Taro.switchTab({url:'/pages/home/index'})
    }catch(e){
      Taro.showToast({title:e instanceof Error?e.message:'微信登录暂不可用',icon:'none'})
    }finally{setBusy(false)}
  }

  const login=async()=>{
    if(!account.trim()||!pin.trim()) return Taro.showToast({title:'请输入账号和 PIN',icon:'none'})
    setBusy(true)
    try{
      const data=await api<any>('/api/auth/miniapp/login',{method:'POST',auth:false,data:{username:account,pin}})
      authStore.save(data.accessToken,data.user)
      await Taro.switchTab({url:'/pages/home/index'})
    }catch(e){
      Taro.showToast({title:e instanceof Error?e.message:'登录失败',icon:'none'})
    }finally{setBusy(false)}
  }

  return <View className='page login-page'>
    <View className='login-intro'>
      <View className='eyebrow'>学习身份</View>
      <Text className='login-title'>微信里直接开始学习</Text>
      <View className='login-copy'><Text>无需注册、无需填写资料。微信身份会自动建立独立学习档案，训练记录可以连续保存。</Text></View>
      <Button className='primary login-primary' loading={busy&&!showLegacy} disabled={busy} onClick={wechat}>继续使用微信身份</Button>
    </View>

    <View className='login-switch-card'>
      <View>
        <View className='card-title login-switch-title'>已经有学生账号？</View>
        <View className='muted'>仅当老师或家长已经给你分配了登录名和 PIN 时使用。</View>
      </View>
      <Button className='text-action' disabled={busy} onClick={()=>setShowLegacy(v=>!v)}>{showLegacy?'收起':'使用已有学生账号'}</Button>
    </View>

    {showLegacy&&<View className='card login-form-card'>
      <View className='card-title'>学生账号登录</View>
      <Input className='input' placeholder='用户名或准考证号' value={account} onInput={e=>setAccount(e.detail.value)}/>
      <Input className='input' password placeholder='PIN' value={pin} onInput={e=>setPin(e.detail.value)}/>
      <Button className='primary' loading={busy} disabled={busy} onClick={login}>登录并继续</Button>
      <View className='muted login-help'>忘记账号或 PIN，请联系家长或老师重置；不影响直接使用微信身份训练。</View>
    </View>}

    <Button className='ghost-back' onClick={()=>Taro.switchTab({url:'/pages/home/index'})}>返回首页</Button>
  </View>
}
