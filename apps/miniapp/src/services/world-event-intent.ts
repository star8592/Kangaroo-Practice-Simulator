/** A short-lived, one-shot selection for a Taro TabBar destination.
 * switchTab cannot carry ordinary URL search params. Never store account data here.
 */
export const WORLD_EVENT_INTENT_KEY = 'socthink_world_event_intent_v1'
export const WORLD_EVENT_INTENT_TTL_MS = 2 * 60 * 1000
export type WorldEventIntent = { eventId: string; issuedAt: number }

export function safeWorldEventId(value: unknown): string | null {
  return typeof value === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(value) ? value : null
}

export function makeWorldEventIntent(value: unknown, now = Date.now()): WorldEventIntent | null {
  const eventId = safeWorldEventId(value)
  return eventId && Number.isFinite(now) && now >= 0 ? {eventId, issuedAt:now} : null
}

export function readWorldEventIntent(value: unknown, now = Date.now()): string | null {
  if(!value || typeof value !== 'object' || Array.isArray(value))return null
  const input = value as Record<string,unknown>
  const eventId = safeWorldEventId(input.eventId)
  if(!eventId || typeof input.issuedAt !== 'number' ||
    !Number.isFinite(input.issuedAt) || !Number.isFinite(now))return null
  const age = now - input.issuedAt
  return age >= 0 && age <= WORLD_EVENT_INTENT_TTL_MS ? eventId : null
}
