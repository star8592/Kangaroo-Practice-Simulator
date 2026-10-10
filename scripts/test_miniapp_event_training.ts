import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { WORLD_COMPETITIONS } from '../src/lib/world-competitions'
import {
  TRAINABLE_EVENT_IDS, TRAINING_INTENT_KEY, TRAINING_INTENT_TTL_MS,
  asTrainingEventId, availableTrainingEventIds, makeTrainingIntent, readTrainingIntent,
} from '../apps/miniapp/src/services/competition-training-intent'

const now=1_800_000_000_000
assert.equal(TRAINING_INTENT_TTL_MS,120_000)
assert.equal(TRAINING_INTENT_KEY,'socthink_training_event_intent_v1')
assert.equal(new Set(TRAINABLE_EVENT_IDS).size,TRAINABLE_EVENT_IDS.length)
for(const name of TRAINABLE_EVENT_IDS){
  const entry=WORLD_COMPETITIONS.find(x=>x.id===name)
  assert.equal(entry?.trainingId,name,'miniapp training route must match world event identity: '+name)
  assert.equal(asTrainingEventId(name),name)
  const ticket=makeTrainingIntent(name,now)
  assert.deepEqual(ticket,{eventId:name,issuedAt:now})
  assert.equal(readTrainingIntent(ticket,now+1000),name)
  assert.equal(readTrainingIntent(ticket,now+TRAINING_INTENT_TTL_MS),name)
  assert.equal(readTrainingIntent(ticket,now+TRAINING_INTENT_TTL_MS+1),null,'expired intent must not silently reopen')
  assert.equal(readTrainingIntent(ticket,now-1),null,'future intent must not be consumed')
}
for(const invalid of ['','not-real',null,undefined,23,{},'../../admin','WEB','huabei']){
  assert.equal(makeTrainingIntent(invalid,now),null)
  assert.equal(readTrainingIntent(invalid,now),null)
}
assert.equal(readTrainingIntent({eventId:'kangaroo',issuedAt:'yesterday'},now),null)
assert.equal(readTrainingIntent({eventId:'kangaroo',issuedAt:Infinity},now),null)
assert.equal(readTrainingIntent({eventId:'kangaroo',issuedAt:now+1},now),null)
assert.equal(readTrainingIntent([{eventId:'kangaroo',issuedAt:now}],now),null)

assert.deepEqual(availableTrainingEventIds(null),[])
assert.deepEqual(availableTrainingEventIds([{competitionId:'kangaroo',miniappReady:false,questionCount:25}]),[],
  'unsupported Web-only papers must not show a dead-end mobile CTA')
assert.deepEqual(availableTrainingEventIds([{competitionId:'kangaroo',miniappReady:true,questionCount:0}]),[])
assert.deepEqual(availableTrainingEventIds([
  {competitionId:'kangaroo',miniappReady:true,questionCount:25},
  {competitionId:'maa-amc',miniappReady:true,questionCount:25},
  {competitionId:'kangaroo',miniappReady:true,questionCount:10},
  {competitionId:'not-real',miniappReady:true,questionCount:25},
  {competitionId:'cemc',miniappReady:true,questionCount:'twenty-five'},
]),['kangaroo','maa-amc'])

const root=path.join(import.meta.dirname,'..')
const source=(file:string)=>fs.readFileSync(path.join(root,file),'utf8')
const events=source('apps/miniapp/src/pages/events/index.tsx')
const competitions=source('apps/miniapp/src/pages/competitions/index.tsx')
const config=source('apps/miniapp/src/app.config.ts')
assert.ok(config.includes("{ pagePath: 'pages/competitions/index', text: '模考' }"),'mock exam destination must remain a tab with the new product label')
assert.ok(events.includes('makeTrainingIntent(trainingId)'), 'unvalidated event ID must never enter navigation')
assert.ok(events.includes('Taro.setStorageSync(TRAINING_INTENT_KEY,intent)'), 'source must queue intended training')
assert.ok(events.includes("await Taro.switchTab({url:'/pages/competitions/index'})"), 'event detail must open real competition tab')
assert.ok(events.includes('Taro.removeStorageSync(TRAINING_INTENT_KEY)'), 'failed navigation must not leave stale intent')
assert.ok(events.indexOf('Taro.setStorageSync(TRAINING_INTENT_KEY,intent)')<events.indexOf("await Taro.switchTab({url:'/pages/competitions/index'})"))
assert.ok(events.includes("api<{exams:unknown}>('/api/miniapp/exams')"),'event UI must verify live paper availability')
assert.ok(events.includes('readyTraining.includes(chosen.event.trainingId as TrainingEventId)'),
  'CTA must only show after verified ready mobile papers exist')
assert.ok(events.includes('重试读取试卷'), 'unavailable catalog must offer retry, not a dead button')
assert.ok(events.includes('visible.find(x=>x.event.id===selected)||visible[0]'),'filtered detail must match visible event')
assert.ok(events.includes('查看全部赛事'),'empty filter state must be actionable')
assert.ok(competitions.includes('readTrainingIntent(pending)'),'destination must validate one-time intent')
assert.ok(competitions.includes('Taro.removeStorageSync(TRAINING_INTENT_KEY)'),'destination must consume intent')
assert.ok(competitions.includes('setCompetition(eventId)'),'destination must filter matching exam bank')
assert.ok(competitions.includes("selector:'#competition-exam-catalog'"),'deep link must scroll to exam section')
assert.ok(competitions.includes("id='competition-exam-catalog'"),'scroll target must exist')

console.log('MINIAPP_EVENT_TRAINING=PASS deep_link=4 ttl=120s ready_papers_only=YES offline_catalog_retry=YES')
