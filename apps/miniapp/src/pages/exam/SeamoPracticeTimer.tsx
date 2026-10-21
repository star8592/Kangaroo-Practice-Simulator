import {useEffect,useRef,useState} from 'react'
import {Text,View} from '@tarojs/components'
import {seamoClockLabel,seamoRemainingSeconds} from '../../services/seamo-timer'

type Props={sessionId:string;startedAt:number;durationSeconds:number;serverClockOffset:number;onElapsed:()=>void}
/** Recomputes from absolute server time after background/resume. Fires automatic hand-in once. */
export default function SeamoPracticeTimer({sessionId,startedAt,durationSeconds,serverClockOffset,onElapsed}:Props){
  const [seconds,setSeconds]=useState(()=>seamoRemainingSeconds(startedAt,durationSeconds,Date.now()+serverClockOffset))
  const onElapsedRef=useRef(onElapsed)
  const fired=useRef(false)
  useEffect(()=>{onElapsedRef.current=onElapsed},[onElapsed])
  useEffect(()=>{
    fired.current=false
    const tick=()=>{
      const next=seamoRemainingSeconds(startedAt,durationSeconds,Date.now()+serverClockOffset)
      setSeconds(next)
      if(next===0&&!fired.current){fired.current=true;onElapsedRef.current()}
    }
    const timer=setInterval(tick,500)
    return()=>clearInterval(timer)
  },[sessionId,startedAt,durationSeconds,serverClockOffset])
  return <View className={`seamo-native-timer ${seconds<=60?'seamo-native-timer-urgent':''}`} role='timer'>
    <Text>{seconds>0?'剩余时间 / Time left':'计时结束 · 正在自动交卷'}</Text>
    <Text className='seamo-timer-clock'>{seamoClockLabel(seconds)}</Text>
  </View>
}
