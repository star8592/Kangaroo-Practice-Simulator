import assert from 'node:assert/strict'
import {
  AI_ARITHMETIC_INTENT_KEY, AI_ARITHMETIC_INTENT_TTL_MS, makeAIArithmeticIntent, readAIArithmeticIntent,
  readAIEntryTarget, noteAgentHandoff, takeAgentHandoff
} from '../apps/miniapp/src/services/ai-entry-intent'
import { navigateFromAIEntry } from '../apps/miniapp/src/services/ai-entry-navigation'
import { WORLD_EVENT_INTENT_KEY } from '../apps/miniapp/src/services/world-event-intent'

assert.deepEqual(readAIEntryTarget({mode:'arithmetic',grade:'2'}),{mode:'arithmetic',grade:2})
assert.deepEqual(readAIEntryTarget({mode:'arithmetic'}),{mode:'arithmetic',grade:null})
assert.deepEqual(readAIEntryTarget({mode:'events',eventId:'australian-amc'}),{mode:'events',eventId:'australian-amc'})
assert.deepEqual(readAIEntryTarget({mode:'events'}),{mode:'events',eventId:null})
for(const invalid of [
  {},{mode:'payment'},{mode:'arithmetic',grade:'0'},{mode:'arithmetic',grade:'13'},
  {mode:'arithmetic',grade:'2;alert(1)'},{mode:'events',eventId:'../profile'},
  {mode:'events',eventId:'CN/hope'},{mode:'arithmetic',eventId:'kangaroo'}
]) assert.equal(readAIEntryTarget(invalid),null)
const time=Date.now()
const grade=makeAIArithmeticIntent('2',time)
assert.deepEqual(grade,{grade:2,issuedAt:time})
assert.equal(readAIArithmeticIntent(grade,time+AI_ARITHMETIC_INTENT_TTL_MS),2)
assert.equal(readAIArithmeticIntent(grade,time+AI_ARITHMETIC_INTENT_TTL_MS+1),null)
assert.equal(readAIArithmeticIntent({...grade,grade:20},time),null)
assert.equal(readAIArithmeticIntent({...grade,issuedAt:Infinity},time),null)
assert.equal(noteAgentHandoff({path:'/pages/ai-entry/index',query:'mode=events&eventId=kangaroo'}),true)
assert.deepEqual(takeAgentHandoff(),{mode:'events',eventId:'kangaroo'})
assert.equal(takeAgentHandoff(),null,'handoff must be one-shot')
assert.equal(noteAgentHandoff({path:'/pages/profile/index',query:'mode=arithmetic'}),false)
assert.equal(noteAgentHandoff({path:'/pages/ai-entry/index',query:'mode=arithmetic&grade=999'}),false)
assert.equal(noteAgentHandoff({path:'/pages/ai-entry/index',query:'mode=%E0%A4%A'}),false)

async function checkNavigationActions() {
  const actions: string[] = []
  const saved = new Map<string, unknown>()
  const adapter = {
    save: (key: string, value: unknown) => { actions.push('save:' + key); saved.set(key, value) },
    remove: (key: string) => { actions.push('remove:' + key); saved.delete(key) },
    switchTab: async (url: string) => { actions.push('route:' + url) }
  }
  const now = 1712345678000
  assert.equal(await navigateFromAIEntry({mode:'arithmetic',grade:2},adapter,now),'arithmetic')
  assert.deepEqual(actions,[
    'save:socthink_ai_arithmetic_grade_v1','route:/pages/arithmetic/index'
  ])
  assert.equal(readAIArithmeticIntent(saved.get(AI_ARITHMETIC_INTENT_KEY),now),2)

  actions.length=0
  assert.equal(await navigateFromAIEntry({mode:'events',eventId:'kangaroo'},adapter,now),'events')
  assert.deepEqual(actions,[
    'save:socthink_world_event_intent_v1','route:/pages/events/index'
  ])
  assert.equal((saved.get(WORLD_EVENT_INTENT_KEY) as {eventId:string}).eventId,'kangaroo')

  actions.length=0
  await navigateFromAIEntry({mode:'arithmetic',grade:null},adapter,now)
  assert.deepEqual(actions,['route:/pages/arithmetic/index'],'no grade guess or auto start')

  actions.length=0
  const failed={
    ...adapter,
    switchTab: async (url:string) => { actions.push('route:' + url);throw new Error('switchTab failed') }
  }
  await assert.rejects(
    navigateFromAIEntry({mode:'events',eventId:'kangaroo'},failed,now),
    /switchTab failed/
  )
  assert.deepEqual(actions,[
    'save:socthink_world_event_intent_v1',
    'route:/pages/events/index',
    'remove:socthink_world_event_intent_v1'
  ])
  assert.equal(saved.has(WORLD_EVENT_INTENT_KEY),false,'failed navigation cannot leave stale intent')

  // The UI's retry action must preserve the same selected destination,
  // create a fresh short-lived intent and never trigger an exam or payment.
  actions.length=0
  assert.equal(await navigateFromAIEntry({mode:'events',eventId:'kangaroo'},adapter,now+500),'events')
  assert.deepEqual(actions,[
    'save:socthink_world_event_intent_v1',
    'route:/pages/events/index'
  ])
  assert.equal((saved.get(WORLD_EVENT_INTENT_KEY) as {issuedAt:number}).issuedAt,now+500)

  actions.length=0
  const brokenStorage={
    ...adapter,
    save: () => { throw new Error('storage unavailable') }
  }
  await assert.rejects(
    navigateFromAIEntry({mode:'arithmetic',grade:3},brokenStorage,now),
    /storage unavailable/
  )
  assert.deepEqual(actions,[],'storage failure must block navigation')
}
void checkNavigationActions().then(() =>
  console.log('MINIAPP_AI_HANDOFF_INTENT_PASS sanitized=PASS ttl=PASS one_shot=PASS rollback=PASS')
).catch(error => { console.error(error); process.exitCode=1 })
