/** Mirrors the backend's exam_basic identity guard. Server authorization remains authoritative. */
export type MiniappExamIdentity = {
  id?: string
  role?: 'student' | 'admin' | string
  username?: string
  candidateNo?: string
} | null | undefined

export function canStartFullExam(user: MiniappExamIdentity): boolean {
  return Boolean(
    user && typeof user.id === 'string' &&
    user.id.length > 0 &&
    !user.id.startsWith('guest_') &&
    (user.role === 'student' || user.role === 'admin')
  )
}

export function makeExamPath(examId: string): string {
  return '/pages/exam/index?examId=' + encodeURIComponent(examId)
}

export function makeExamLoginPath(examId: string): string {
  return '/pages/login/index?nextExam=' + encodeURIComponent(examId)
}

/** No open redirect: resume only a canonical exam ID, never a raw URL. */
export function parseRequestedExam(value: unknown): string {
  const raw = String(value || '')
  if (!raw || raw.length > 180) return ''
  try {
    const decoded = decodeURIComponent(raw)
    return /^[a-zA-Z0-9_-]+$/.test(decoded) ? decoded : ''
  } catch {
    return ''
  }
}
