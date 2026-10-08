import { useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { authStore } from '../../services/api'

export default function ProfilePage(){
  const [u,setUser]=useState<any>(()=>authStore.user())
  useDidShow(()=>setUser(authStore.user()))
  const isWechat=u?.username==='wechat'||u?.candidateNo==='WECHAT'
  const isGuest=u?.username==='guest'||u?.candidateNo==='GUEST'
  return <View className='page'>
    <View className='hero'><View className='eyebrow'>我的学习档案</View><Text className='big'>{isWechat?'微信学习档案':isGuest?'游客临时体验':u?.name||'我的'}</Text><View className='hero-copy'>{isWechat?'无需单独注册，当前微信身份用于保存小程序学习记录。':isGuest?'当前是临时游客身份；记录可能随会话到期失效。可使用微信身份创建独立学习档案。':u?.school||'训练记录、竞赛和复盘统一保存在这里。'}</View></View>
    {isGuest?<View className='card'><View className='card-title'>当前为临时游客</View><View className='muted'>微信身份不可用时自动进入游客模式。请勿将它误认为已保存的微信或站内学生账号；切换身份后，旧游客数据不会自动合并。</View></View>:isWechat?<View className='card'><View className='row'><Text>身份状态</Text><Text className='good'>微信已连接</Text></View><View className='row profile-row'><Text>训练年级</Text><Text>每次训练可自由选择</Text></View><View className='muted'>微信身份与网站已有学生账号不会自动合并。需要原来的成绩，请先使用已有学生账号登录；跨端关联须在双方身份验证后进行。</View></View>:<View className='card'><View className='row'><Text>年级</Text><Text>{u?.grade||'—'}</Text></View><View className='row profile-row'><Text>准考证号</Text><Text>{u?.candidateNo||'—'}</Text></View></View>}
    <Button className='secondary' onClick={()=>Taro.navigateTo({url:'/pages/login/index'})}>{isGuest?'连接微信或使用已有学生账号':isWechat?'使用已有学生账号':'切换登录方式'}</Button>
  </View>
}
