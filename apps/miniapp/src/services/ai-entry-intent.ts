/**
 * Read-only, short-lived bridge from a WeChat AI card to a normal miniapp tab.
 * No identity, score, answer, or authorization material is ever carried here.
 */
import { safeWorldEventId } from './world-event-intent'

export const AI_ARITHMETIC_INTENT_KEY = 'socthink_ai_arithmetic_grade_v1'
export const AI_ARITHMETIC_INTENT_TTL_MS = 2 * 60 * 1000

export type AIEntryTarget =
  | { mode: 'arithmetic'; grade: number | null }
  | { mode: 'events'; eventId: string | null }
export type AIArithmeticIntent = { grade: number; issuedAt: number }

function gradeOf(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 12) return value
  if (typeof value !== 'string' || !/^(?:[1-9]|1[0-2])$/.test(value)) return null
  return Number(value)
}

export function readAIEntryTarget(params: unknown): AIEntryTarget | null {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return null
  const p = params as Record<string, unknown>
  if (p.mode === 'arithmetic') {
    if (p.eventId !== undefined) return null
    const grade = p.grade === undefined ? null : gradeOf(p.grade)
    return p.grade !== undefined && grade === null ? null : {mode:'arithmetic',grade}
  }
  if (p.mode === 'events') {
    if (p.grade !== undefined) return null
    const eventId = p.eventId === undefined ? null : safeWorldEventId(p.eventId)
    return p.eventId !== undefined && eventId === null ? null : {mode:'events',eventId}
  }
  return null
}

export function makeAIArithmeticIntent(value: unknown, now = Date.now()): AIArithmeticIntent | null {
  const grade = gradeOf(value)
  return grade !== null && Number.isFinite(now) && now >= 0
    ? {grade,issuedAt:now} : null
}

export function readAIArithmeticIntent(value: unknown, now = Date.now()): number | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const p = value as Record<string, unknown>
  if (typeof p.issuedAt !== 'number' || !Number.isFinite(p.issuedAt) || !Number.isFinite(now)) return null
  const age = now - p.issuedAt
  return age >= 0 && age <= AI_ARITHMETIC_INTENT_TTL_MS ? gradeOf(p.grade) : null
}

let pending: { target: AIEntryTarget; issuedAt: number } | null = null
export function noteAgentHandoff(input: unknown): boolean {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false
  const event = input as Record<string, unknown>
  if (event.path !== '/pages/ai-entry/index' && event.path !== 'pages/ai-entry/index') return false
  if (typeof event.query !== 'string' || event.query.length > 240) return false
  const params: Record<string, string> = {}
  try {
    for (const pair of event.query.split('&')) {
      if (!pair) continue
      const [rawKey, rawValue = ''] = pair.split('=', 2)
      const key = decodeURIComponent(rawKey)
      if (key === 'mode' || key === 'grade' || key === 'eventId') {
        if (params[key] !== undefined) return false
        params[key] = decodeURIComponent(rawValue)
      }
    }
  } catch { return false }
  const target = readAIEntryTarget(params)
  if (!target) return false
  pending = {target,issuedAt:Date.now()}
  return true
}

export function takeAgentHandoff(now = Date.now()): AIEntryTarget | null {
  const saved = pending
  pending = null
  return saved && Number.isFinite(now) && now >= saved.issuedAt &&
    now - saved.issuedAt <= AI_ARITHMETIC_INTENT_TTL_MS ? saved.target : null
}
