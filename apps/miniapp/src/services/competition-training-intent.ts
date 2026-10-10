/**
 * One-time navigation from a worldwide event profile to matching on-device papers.
 * The destination is a tab page: switchTab does not support ordinary query params.
 * Keep the intent brief and scoped; do not persist user identity, scores or answers.
 */
export const TRAINING_INTENT_KEY = 'socthink_training_event_intent_v1'
export const TRAINING_INTENT_TTL_MS = 2 * 60 * 1000

export const TRAINABLE_EVENT_IDS = [
  'kangaroo', 'australian-amc', 'maa-amc', 'cemc',
] as const

export type TrainingEventId = typeof TRAINABLE_EVENT_IDS[number]
export type TrainingIntent = { eventId: TrainingEventId; issuedAt: number }

export function asTrainingEventId(value: unknown): TrainingEventId | null {
  return typeof value === 'string' &&
    (TRAINABLE_EVENT_IDS as readonly string[]).includes(value)
    ? value as TrainingEventId : null
}

export function makeTrainingIntent(id: unknown, now = Date.now()): TrainingIntent | null {
  const eventId = asTrainingEventId(id)
  return eventId && Number.isFinite(now) && now >= 0
    ? {eventId, issuedAt: now} : null
}

export function readTrainingIntent(value: unknown, now = Date.now()): TrainingEventId | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const input = value as Record<string, unknown>
  const id = asTrainingEventId(input.eventId)
  if (!id || typeof input.issuedAt !== 'number' ||
      !Number.isFinite(input.issuedAt) || !Number.isFinite(now)) return null
  const age = now - input.issuedAt
  return age >= 0 && age <= TRAINING_INTENT_TTL_MS ? id : null
}
