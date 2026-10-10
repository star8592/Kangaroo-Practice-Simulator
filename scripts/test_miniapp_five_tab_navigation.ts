import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { makeWorldEventIntent, readWorldEventIntent, safeWorldEventId, WORLD_EVENT_INTENT_TTL_MS } from '../apps/miniapp/src/services/world-event-intent'

const root=path.join(import.meta.dirname,'..')
const source=(p:string)=>fs.readFileSync(path.join(root,p),'utf8')
const config=source('apps/miniapp/src/app.config.ts')
const home=source('apps/miniapp/src/pages/home/index.tsx')
const mock=source('apps/miniapp/src/pages/competitions/index.tsx')
const events=source('apps/miniapp/src/pages/events/index.tsx')
const nav=source('apps/miniapp/src/services/world-event-navigation.ts')
const training=source('apps/miniapp/src/pages/competitions/index.tsx')

for(const id of ['huabei','zoumei','xiwang','cmo','cgmo','kangaroo','australian-amc','maa-amc','cemc','ukmt']){
  assert.equal(safeWorldEventId(id),id)
}
for(const id of ['','../profile','https://bad.example','huabei?x=1','a/b','a'.repeat(65),'Auppercase',null,undefined,{},42]){
  assert.equal(safeWorldEventId(id),null)
}
const now=100_000
const intent=makeWorldEventIntent('huabei',now)
assert.deepEqual(intent,{eventId:'huabei',issuedAt:now})
assert.equal(readWorldEventIntent(intent,now+WORLD_EVENT_INTENT_TTL_MS),'huabei')
assert.equal(readWorldEventIntent(intent,now+WORLD_EVENT_INTENT_TTL_MS+1),null)
assert.equal(readWorldEventIntent(intent,now-1),null)
assert.equal(readWorldEventIntent({...intent,issuedAt:Infinity}),null)
assert.equal(readWorldEventIntent({...intent,eventId:'../home'},now),null)

for(const tab of ['home','arithmetic','competitions','events','profile']){
  assert.ok(config.includes(`{ pagePath: 'pages/${tab}/index'`),`tab missing: ${tab}`)
}
assert.ok(config.includes("text: '模考'"),'mock exam must be visible as an independent tab')
assert.ok(config.includes("text: '赛事'"),'world events must be an independent tab')
assert.ok(nav.includes("Taro.switchTab({url:'/pages/events/index'})"),'TabBar event navigation must use switchTab')
assert.ok(nav.includes('Taro.removeStorageSync(WORLD_EVENT_INTENT_KEY)'),'failed navigation must erase intent')
assert.ok(home.includes('openWorldEvent()'),'homepage must use safe event navigation')
assert.ok(mock.includes('openWorldEvent()'),'mock listing must use safe event navigation')
assert.ok(!mock.includes("Taro.navigateTo({url:'/pages/events/index"),'old event navigateTo is invalid after TabBar conversion')
assert.ok(!home.includes("Taro.navigateTo({url:'/pages/events/index"),'homepage must not navigateTo a tab')
assert.ok(events.includes('useDidShow(()=>{'),'events must consume intent whenever tab gains focus')
assert.ok(events.includes('readWorldEventIntent(pending)'),'event selection must validate TTL and ID')
assert.ok(events.includes('Taro.removeStorageSync(WORLD_EVENT_INTENT_KEY)'),'intent must be consumed once')
assert.ok(events.includes("setRegion('all');setStage('all')"),'event selection must clear stale filters')
assert.ok(events.includes("rows.some(x=>x.event.id===focusEventId)"),'event selection must use canonical API catalog')
assert.ok(training.includes('readTrainingIntent(pending)'),'reverse route to mock tabs must still work')
assert.ok(events.includes('makeTrainingIntent(trainingId)'),'event-to-mock must retain existing reliable bridge')

console.log('MINIAPP_FIVE_TAB_NAVIGATION_PASS tabs=5 event_intent=ttl+validated+one_shot backward_intent=PASS')
