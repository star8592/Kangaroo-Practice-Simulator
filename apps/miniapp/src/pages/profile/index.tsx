import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { authStore } from '../../services/api'

export default function ProfilePage(){
  const u=authStore.user()
  const isWechat=u?.username==='wechat'||u?.candidateNo==='WECHAT'
  return <View className='page'>
    <View className='hero'><View className='eyebrow'>我的学习档案</View><Text className='big'>{isWechat?'微信学习档案':u?.name||'我的'}</Text><View className='hero-copy'>{isWechat?'无需单独注册，当前微信身份用于持续保存小程序学习记录。':u?.school||'训练记录、竞赛和复盘统一保存在这里。'}</View></View>
    {isWechat?<View className='card'><View className='row'><Text>身份状态</Text><Text className='good'>微信已连接</Text></View><View className='row profile-row'><Text>训练年级</Text><Text>每次训练可自由选择</Text></View><View className='muted'>这里不展示虚假的准考证号或默认年级。需要使用学校/机构学生账号时，可以切换到学生账号登录。</View></View>:<View className='card'><View className='row'><Text>年级</Text><Text>{u?.grade||'—'}</Text></View><View className='row profile-row'><Text>准考证号</Text><Text>{u?.candidateNo||'—'}</Text></View></View>}
    <Button className='secondary' onClick={()=>Taro.navigateTo({url:'/pages/login/index'})}>{isWechat?'切换到学生账号':'切换登录方式'}</Button>
  </View>
}
