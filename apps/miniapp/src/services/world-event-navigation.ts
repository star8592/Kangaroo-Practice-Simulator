import Taro from '@tarojs/taro'
import { WORLD_EVENT_INTENT_KEY, makeWorldEventIntent } from './world-event-intent'

/** Every call to the tab destination must use switchTab, even with a selected event.
 * A failed navigation clears only its one-shot marker; it never changes user data.
 */
export async function openWorldEvent(value?: unknown): Promise<void> {
  const requested = value !== undefined && value !== null
  const intent = requested ? makeWorldEventIntent(value) : null
  if(requested && !intent)throw new Error('赛事编号无效，无法打开')
  try{
    if(intent) Taro.setStorageSync(WORLD_EVENT_INTENT_KEY,intent)
    else Taro.removeStorageSync(WORLD_EVENT_INTENT_KEY)
    await Taro.switchTab({url:'/pages/events/index'})
  }catch(e){
    try{Taro.removeStorageSync(WORLD_EVENT_INTENT_KEY)}catch{/* do not mask navigation error */}
    throw e
  }
}
