import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { NextRequest } from 'next/server'
import { createGuestSessionToken, userFromSessionToken } from '../src/lib/auth'
import { buildStudentAnalytics } from '../src/lib/student-analytics'
import { listTrainingExamProfiles } from '../src/lib/training-question-bank'
import { COMPETITION_COMPANIONS } from '../src/lib/competition-companion'
import { GET as getAnalytics } from '../src/app/api/student/analytics/route'
import { GET as getMiniappExams } from '../src/app/api/miniapp/exams/route'
import { GET as getMiniappCompanions } from '../src/app/api/miniapp/companions/route'
import { GET as getMiniappChinaCompetitions } from '../src/app/api/miniapp/china-competitions/route'
import { CHINA_MATH_EVENTS } from '../src/lib/china-math-competitions'
import { WORLD_COMPETITIONS } from '../src/lib/world-competitions'
import { GET as getMiniappWorldCompetitions } from '../src/app/api/miniapp/world-competitions/route'

async function main(){
const root = process.cwd()
const token = createGuestSessionToken()
const user = userFromSessionToken(token)
assert.ok(user && user.role === 'student')

const request = (pathname: string) => new NextRequest(`http://localhost${pathname}`, {
  headers: { authorization: `Bearer ${token}` },
})

const analyticsResponse = await getAnalytics(request('/api/student/analytics'))
assert.equal(analyticsResponse.status, 200)
const analytics = await analyticsResponse.json()
const canonicalAnalytics = buildStudentAnalytics(user)
for (const key of ['overview','readiness','dataConfidence','nextPlan','recommendedExams','practice','arithmetic'] as const) {
  assert.deepEqual(analytics[key], canonicalAnalytics[key], `analytics parity failed: ${key}`)
}

const examsResponse = await getMiniappExams(request('/api/miniapp/exams'))
assert.equal(examsResponse.status, 200)
const examPayload = await examsResponse.json()
const expectedExams = listTrainingExamProfiles()
  .filter(x => x.paperType !== 'practice')
  .sort((a, b) => (b.year || 0) - (a.year || 0))
  .map(x => ({
    id: x.id,
    name: x.nameZh || x.name,
    nameEn: x.name,
    year: x.year,
    country: x.country,
    grades: x.grades,
    questionCount: x.questionCount,
    maxScore: x.maxScore,
    durationSeconds: x.durationSeconds,
    competitionId: x.competitionId,
    paperType: x.paperType,
    timingSections: x.timingSections || [],
    miniappReady: !(x.timingSections || []).length,
  }))
assert.deepEqual(examPayload.exams, expectedExams, 'competition catalogue parity failed')

const companionResponse = await getMiniappCompanions(request('/api/miniapp/companions'))
assert.equal(companionResponse.status, 200)
const companionPayload = await companionResponse.json()
const today = new Date().toISOString().slice(0, 10)
const expectedCompanionIds = COMPETITION_COMPANIONS.filter(x => x.expiresAfter >= today && x.registrationVerified !== false).map(x => x.id)
assert.deepEqual(companionPayload.companions.map((x: {id:string}) => x.id), expectedCompanionIds, 'active competition companion parity failed')
const domesticResponse = await getMiniappChinaCompetitions(request('/api/miniapp/china-competitions'))
assert.equal(domesticResponse.status, 200)
const domesticPayload = await domesticResponse.json()
assert.deepEqual(domesticPayload.entries.map((x: {event:{id:string}}) => x.event.id), CHINA_MATH_EVENTS.map(x => x.id), 'China math competition catalogue parity failed')
for(const entry of domesticPayload.entries){
  assert.equal(entry.companion.registrationVerified, false, 'historical entries cannot claim open registration')
  assert.ok(entry.companion.tasks.every((x: {date?: string}) => !x.date), 'unverified schedules cannot show a countdown')
}

const worldwideResponse = await getMiniappWorldCompetitions(request('/api/miniapp/world-competitions'))
assert.equal(worldwideResponse.status, 200)
const worldwidePayload = await worldwideResponse.json()
assert.deepEqual(worldwidePayload.entries.map((x:{event:{id:string}})=>x.event.id),
  WORLD_COMPETITIONS.map(x=>x.id), 'worldwide catalogue parity failed')
for (const entry of worldwidePayload.entries) {
  assert.ok(entry.companion, 'every world event must have a companion')
  assert.equal(entry.following, null, 'disposable guest must not have persisted follows')
  assert.ok(entry.progress, 'authenticated student progress must be returned')
  if (entry.companion.registrationVerified===false) {
    assert.ok(entry.companion.tasks.every((x:{date?:string})=>!x.date),
      'advisory-only events must not invent dates')
  }
}

const surfaces = {
  home: fs.readFileSync(path.join(root, 'apps/miniapp/src/pages/home/index.tsx'), 'utf8'),
  competitions: fs.readFileSync(path.join(root, 'apps/miniapp/src/pages/competitions/index.tsx'), 'utf8'),
  events: fs.readFileSync(path.join(root, 'apps/miniapp/src/pages/events/index.tsx'), 'utf8'),
  review: fs.readFileSync(path.join(root, 'apps/miniapp/src/pages/review/index.tsx'), 'utf8'),
}
for (const needle of [
  'analytics?.readiness',
  'analytics?.dataConfidence',
  'analytics?.nextPlan',
  'analytics?.recommendedExams',
  'analytics?.arithmetic?.plan?.summaryZh',
  "examAttempts?accuracy+'%':'—'",
]) assert.ok(surfaces.home.includes(needle), `home is not rendering shared analytics field: ${needle}`)
for (const needle of ['/api/miniapp/exams','ex.name','ex.year','ex.grades','ex.questionCount','ex.miniappReady']) {
  assert.ok(surfaces.competitions.includes(needle), `competition UI mapping missing: ${needle}`)
}
for (const needle of ['/api/miniapp/world-competitions','x.event.nameZh','/api/competition-follow','/api/competition-intelligence','我的关注','下一步行动','赛事情报与截止提醒','following','nextFocus','chosen.event.nameZh','t.titleZh','t.detailZh','t.checklistZh']) {
  assert.ok(surfaces.events.includes(needle), `event UI mapping missing: ${needle}`)
}
for (const needle of ['/api/miniapp/review','q.stem','assetUrlZh','correctAnswer','solution']) {
  assert.ok(surfaces.review.includes(needle), `review UI mapping missing: ${needle}`)
}

const byCompetition = expectedExams.reduce<Record<string,number>>((acc, x) => {
  acc[x.competitionId || 'unknown'] = (acc[x.competitionId || 'unknown'] || 0) + 1
  return acc
}, {})
console.log('MINIAPP_WEB_PARITY=PASS')
console.log(JSON.stringify({
  analytics: ['overview','readiness','dataConfidence','nextPlan','recommendedExams','practice','arithmetic'],
  catalogueFixtureAvailable: expectedExams.length > 0,
  exams: expectedExams.length,
  byCompetition,
  activeCompanions: expectedCompanionIds.length,
  domesticDirectory: CHINA_MATH_EVENTS.length,
  worldDirectory: WORLD_COMPETITIONS.length,
  uiSurfaces: Object.keys(surfaces),
}))

}
main().catch(e=>{console.error(e);process.exitCode=1})
