import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { authStore, goLoginIfNeeded } from '../../services/api'
export default function ProfilePage(){const u=authStore.user();return <View className='page'><View className='hero'><Text className='big'>{u?.name||'我的'}</Text><View>{u?.school||''}</View></View><View className='card'><View className='row'><Text>年级</Text><Text>{u?.grade||'—'}</Text></View><View className='row'><Text>准考证号</Text><Text>{u?.candidateNo||'—'}</Text></View></View><Button className='secondary' onClick={()=>{authStore.clear();Taro.reLaunch({url:'/pages/login/index'})}}>退出登录</Button></View>}
