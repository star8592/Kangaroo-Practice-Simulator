import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { GET as getWorldCatalogue } from '../src/app/api/miniapp/world-competitions/route'
import { GET as getExamCatalogue } from '../src/app/api/miniapp/exams/route'
import { canStartFullExam } from '../apps/miniapp/src/services/exam-access'

async function run() {
  const world = await getWorldCatalogue(new NextRequest('https://socthink.cn/api/miniapp/world-competitions'))
  assert.equal(world.status, 200, 'anonymous international events must be accessible')
  const worldPayload = await world.json()
  assert.ok(Array.isArray(worldPayload.entries) && worldPayload.entries.length >= 5)
  for (const row of worldPayload.entries) {
    assert.notEqual(row.event.region, 'CN', 'domestic contests must not appear in miniapp discovery')
    assert.equal(row.progress, null, 'anonymous progress must remain private')
    assert.equal(row.following, null, 'anonymous follow state must remain private')
  }

  const exams = await getExamCatalogue(new NextRequest('https://socthink.cn/api/miniapp/exams', {
    headers: { 'x-socthink-miniapp-capabilities': 'seamo-timer-v1' }
  }))
  assert.equal(exams.status, 200, 'anonymous exam META catalogue must be accessible')
  const body = await exams.json()
  assert.ok(Array.isArray(body.exams) && body.exams.length > 0)
  for (const item of body.exams) {
    assert.ok(item.id && item.name && typeof item.questionCount === 'number')
    for (const sensitive of ['questions','answer','answers','solution','token','userId','sessionKey']) {
      assert.equal(Object.prototype.hasOwnProperty.call(item,sensitive),false,'no sensitive catalogue field: '+sensitive)
    }
  }
  assert.equal(canStartFullExam(null), false, 'catalogue is public, full exam is not')
  assert.equal(canStartFullExam({id:'guest_qa_local',role:'student',username:'guest',candidateNo:'GUEST'}), false)
  console.log('MINIAPP_PUBLIC_CATALOGUE=PASS anonymous_world='+worldPayload.entries.length+' anonymous_exams='+body.exams.length+' domestic=0 full_exam_guest=denied')
}
void run().catch(error => { console.error(error); process.exitCode=1 })
