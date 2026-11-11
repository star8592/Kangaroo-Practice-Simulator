#!/usr/bin/env node
/**
 * No writes, no credentials, no database connections.
 * Usage: node scripts/check_english_consolidation.mjs [--live]
 *
 * Tests site page ownership, future app/api path reservation and exact legacy
 * front-end reachability. Never regards a live landing page as proof that
 * authentication, billing or cross-server data migration have succeeded.
 */
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import path from 'node:path'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const cfg=JSON.parse(readFileSync(path.join(root,'config/english-consolidation.json'),'utf8'))
assert.equal(cfg.version,1)
assert.equal(cfg.publicOrigin,'https://socthink.cn')
assert.equal(cfg.releaseEnabled,false,'Do not promote uncutover projects')
assert.equal(cfg.migrationStatus,'staging-not-cutover')
assert.equal(cfg.apps.length,4)
const ids=new Set()
const prefixes=new Set()
const reservations=['/api/','/_next/','/account','/login','/payments','/math']
const ports=[]
for(const app of cfg.apps){
 assert.match(app.id,/^[a-z]+$/)
 assert(!ids.has(app.id),'duplicate app id')
 ids.add(app.id)
 assert.equal(app.landingPath,`/english/${app.id}`)
 assert.equal(app.appPrefix,`${app.landingPath}/app/`)
 assert.equal(app.apiPrefix,`${app.landingPath}/api/`)
 assert(existsSync(path.join(root,'src/app/english',app.id,'page.tsx')),'missing existing product page '+app.id)
 assert.match(app.repo,/^star8592\/[A-Za-z0-9-]+$/)
 assert.match(app.status,/^(source-live-target-staging|local-mvp-not-yet-public)$/)
 assert(!app.appPrefix.startsWith('/api/'))
 for(const prefix of [app.appPrefix,app.apiPrefix]){
  assert(!prefixes.has(prefix),'duplicate target prefix '+prefix)
  assert(reservations.every(x=>!prefix.startsWith(x)), 'reserved site path conflict: '+prefix)
  prefixes.add(prefix)
 }
 if(app.sourceUrl){
  assert.equal(new URL(app.sourceUrl).hostname,'toktik.tech')
  ports.push({name:app.id+' existing app',url:app.sourceUrl})
 }else{
  assert.equal(app.id,'reading','unknown public source URL')
  assert.equal(app.sourceApiPrefixes.length,0)
 }
}
assert.deepEqual([...ids].sort(),['aelos','pronunciation','reading','vocabulary'])
console.log('ROUTE_ISOLATION_CONTRACT=PASS 4 apps, 8 reserved prefixes, 0 active cutovers')
if(process.argv.includes('--live')){
 const targets=[
  {name:'SOC THINK English',url:cfg.publicOrigin+'/english'},
  ...cfg.apps.map(app=>({name:app.id+' landing',url:cfg.publicOrigin+app.landingPath})),
  ...ports
 ]
 let failures=0
 for(const target of targets){
  try{
   const response=await fetch(target.url,{redirect:'follow',signal:AbortSignal.timeout(12000)})
   const okay=response.status===200
   if(!okay)failures++
   console.log(`${okay?'PASS':'FAIL'} HTTP ${response.status} ${target.name}: ${target.url}`)
  }catch(error){
   failures++
   console.log(`FAIL ${target.name}: ${String(error?.message??error)}`)
  }
 }
 if(failures)process.exitCode=1
}
