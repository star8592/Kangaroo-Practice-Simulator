import { useEffect, useRef, useState } from 'react'
import { Button, Slider, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { ExamLanguage } from '../../services/exam-view'

type Props = {
  questionId: string
  language: ExamLanguage
  audioZh?: string
  audioEn?: string
}
const origin = process.env.TARO_APP_API_BASE || 'https://socthink.cn'
const audioUrl = (path?: string) => path && (path.startsWith('https://') ? path : path.startsWith('/') ? origin + path : '')
const fmt = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--'
  return Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0')
}

/** Uses WeChat's native audio engine; seek/time are actual MP3 positions. */
export default function ExamVoicePlayer({ questionId, language, audioZh, audioEn }: Props) {
  const source = audioUrl(language === 'zh' ? audioZh : audioEn)
  const context = useRef<ReturnType<typeof Taro.createInnerAudioContext> | null>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    setPlaying(false); setTime(0); setDuration(0); setError('')
    if (!source) return
    const audio = Taro.createInnerAudioContext()
    audio.autoplay = false
    audio.src = source
    audio.onPlay(() => setPlaying(true))
    audio.onPause(() => setPlaying(false))
    audio.onStop(() => setPlaying(false))
    audio.onEnded(() => { setPlaying(false); setTime(audio.duration || 0) })
    audio.onCanplay(() => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0))
    audio.onTimeUpdate(() => {
      setTime(audio.currentTime || 0)
      if (audio.duration > 0) setDuration(audio.duration)
    })
    audio.onError(() => {
      setPlaying(false)
      setError('音频暂时无法播放，请检查网络后重试')
    })
    context.current = audio
    return () => { audio.stop(); audio.destroy(); if (context.current === audio) context.current = null }
  }, [questionId, source])

  if (!source) {
    return <View className='exam-voice-card'>
      <Text>🔊 {language === 'zh' ? '中文' : 'English'}朗读</Text>
      <Text className='muted'>该题音频尚未准备好，暂不可播放</Text>
    </View>
  }
  return <View className='exam-voice-card'>
    <View className='row'>
      <Text>🔊 {language === 'zh' ? '听完整题目与选项' : 'Full question and options'}</Text>
      <Text className='muted'>{fmt(time)} / {fmt(duration)}</Text>
    </View>
    <View className='row exam-voice-controls'>
      <Button className='secondary' onClick={() => {
        const audio = context.current
        if (!audio) return
        if (playing) audio.pause()
        else audio.play()
      }}>{playing ? 'Ⅱ 暂停' : '▶ 播放'}</Button>
      <Slider
        min={0} max={100} step={1}
        value={duration > 0 ? Math.round(time / duration * 100) : 0}
        disabled={!duration}
        activeColor='#327554'
        backgroundColor='#d9e4dc'
        onChange={e => {
          const audio = context.current
          if (!audio || duration <= 0) return
          audio.seek(duration * e.detail.value / 100)
          setTime(duration * e.detail.value / 100)
        }}
      />
      <Button className='secondary' onClick={() => {
        const audio = context.current
        if (!audio) return
        audio.seek(0); setTime(0); audio.play()
      }}>重播</Button>
    </View>
    {error && <Text className='muted'>{error}</Text>}
  </View>
}
