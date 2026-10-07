import assert from 'node:assert/strict'

async function main() {
  const base = (process.env.MINIAPP_LIVE_BASE || 'https://socthink.cn').replace(/\/$/, '')
  const guestResponse = await fetch(base + '/api/auth/miniapp/guest', { method: 'POST' })
  assert.equal(guestResponse.status, 200)
  const guest = await guestResponse.json() as { accessToken?: string }
  assert.ok(guest.accessToken)
  const headers = { authorization: `Bearer ${guest.accessToken}`, 'content-type': 'application/json' }

  const [analyticsResponse, examsResponse, companionsResponse] = await Promise.all([
    fetch(base + '/api/student/analytics', { headers }),
    fetch(base + '/api/miniapp/exams', { headers }),
    fetch(base + '/api/miniapp/companions', { headers }),
  ])
  assert.equal(analyticsResponse.status, 200)
  assert.equal(examsResponse.status, 200)
  assert.equal(companionsResponse.status, 200)

  const analytics = await analyticsResponse.json() as Record<string, unknown>
  for (const key of ['overview','readiness','dataConfidence','nextPlan','recommendedExams','arithmetic']) {
    assert.ok(key in analytics, `missing analytics field: ${key}`)
  }

  const examPayload = await examsResponse.json() as { exams?: Array<{competitionId?:string}> }
  const exams = examPayload.exams || []
  assert.ok(exams.length > 0, 'production miniapp exam catalogue is empty')
  const counts: Record<string, number> = {}
  for (const exam of exams) counts[exam.competitionId || 'unknown'] = (counts[exam.competitionId || 'unknown'] || 0) + 1
  for (const id of ['kangaroo','australian-amc','maa-amc','cemc']) {
    assert.ok((counts[id] || 0) > 0, `production catalogue missing ${id}`)
  }

  const arithmeticResponse = await fetch(base + '/api/miniapp/arithmetic/session', {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'start', grade: 1, mode: 'diagnostic' }),
  })
  assert.equal(arithmeticResponse.status, 200)
  const arithmetic = await arithmeticResponse.json() as { questions?: unknown[]; token?: string }
  assert.ok((arithmetic.questions || []).length >= 12)
  assert.ok(arithmetic.token)

  const companions = await companionsResponse.json() as { companions?: unknown[] }
  console.log('MINIAPP_LIVE_SMOKE=PASS')
  console.log(JSON.stringify({
    base,
    exams: exams.length,
    byCompetition: counts,
    activeCompanions: (companions.companions || []).length,
    arithmeticQuestions: (arithmetic.questions || []).length,
  }))
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
