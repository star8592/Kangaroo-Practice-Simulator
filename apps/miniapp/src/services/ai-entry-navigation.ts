import {
  AI_ARITHMETIC_INTENT_KEY, makeAIArithmeticIntent, type AIEntryTarget
} from './ai-entry-intent'
import { WORLD_EVENT_INTENT_KEY, makeWorldEventIntent } from './world-event-intent'

/**
 * Strictly a one-time navigation action. No test session, exam, or payment API
 * is invoked. Roll back ephemeral intent if switchTab fails so a later manual
 * visit cannot consume an unrelated AI recommendation.
 */
export type AIEntryNavigationActions = {
  save: (key: string, value: unknown) => void
  remove: (key: string) => void
  switchTab: (url: string) => Promise<unknown>
}

export async function navigateFromAIEntry(
  target: AIEntryTarget,
  actions: AIEntryNavigationActions,
  now = Date.now()
): Promise<'arithmetic' | 'events'> {
  const arithmetic = target.mode === 'arithmetic'
  const url = arithmetic ? '/pages/arithmetic/index' : '/pages/events/index'
  const key = arithmetic ? AI_ARITHMETIC_INTENT_KEY : WORLD_EVENT_INTENT_KEY
  const intent = arithmetic
    ? (target.grade === null ? null : makeAIArithmeticIntent(target.grade, now))
    : (target.eventId === null ? null : makeWorldEventIntent(target.eventId, now))

  // A supplied but invalid value must never be silently downgraded.
  if ((arithmetic && target.grade !== null && !intent) ||
      (!arithmetic && target.eventId !== null && !intent)) {
    throw new Error('AI handoff target is invalid')
  }

  if (intent !== null) actions.save(key, intent)
  try {
    await actions.switchTab(url)
  } catch (error) {
    if (intent !== null) {
      try { actions.remove(key) } catch { /* preserve original navigation error */ }
    }
    throw error
  }
  return target.mode
}
