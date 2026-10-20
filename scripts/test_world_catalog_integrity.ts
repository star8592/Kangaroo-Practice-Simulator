import assert from 'node:assert/strict'
import { CHINA_MATH_EVENTS, NATIONAL_LIST_URL } from '../src/lib/china-math-competitions'
import { WORLD_COMPETITIONS, WORLD_REGION_OPTIONS, WORLD_STAGE_OPTIONS, matchesWorldReferenceStage } from '../src/lib/world-competitions'
import { getWorldCompanion } from '../src/lib/competition-companion'

/** Static-catalogue safety gates. Edition-specific registration data is NOT inferred
 * from a historical competition or an organizer home page.
 */
const ids = WORLD_COMPETITIONS.map(e=>e.id)
assert.equal(new Set(ids).size, ids.length,'Duplicate global competition identities')
assert.equal(new Set(CHINA_MATH_EVENTS.map(x=>x.id)).size,CHINA_MATH_EVENTS.length,'Duplicate China event IDs')
assert.equal(ids.length,5,'International competition families must remain')
assert.equal(WORLD_COMPETITIONS.filter(x=>x.region==='CN').length,0,'Domestic events must not be publicly listed')
assert.ok(WORLD_COMPETITIONS.some(x=>x.region!=='CN'),'International events must be present')
assert.equal(WORLD_REGION_OPTIONS[0].value,'all')
assert.equal(WORLD_STAGE_OPTIONS[0].value,'all')

for(const item of WORLD_COMPETITIONS){
  assert.ok(/^[a-z][a-z0-9-]{0,63}$/.test(item.id),`Invalid event ID ${item.id}`)
  assert.ok(item.nameZh.trim().length>1 && item.nameEn.trim().length>1,`Missing bilingual names ${item.id}`)
  assert.ok(item.summaryZh.trim().length>12 && item.summaryEn.trim().length>12,`Missing event context ${item.id}`)
  const url=new URL(item.sourceUrl)
  assert.equal(url.protocol,'https:',`Source link must use HTTPS ${item.id}`)
  assert.ok(url.hostname && !url.hostname.endsWith('.example'),`Placeholder source for ${item.id}`)
  assert.ok(item.sourceLabelZh.trim() && item.sourceLabelEn.trim(),`Missing source disclosure ${item.id}`)
  assert.ok(item.registrationState==='unverified'||item.registrationState==='session-specific',`Unsupported registration status ${item.id}`)
  assert.ok(!('registrationDeadline' in item) && !('examDate' in item),
    `Family catalogue must not invent current-edition deadlines ${item.id}`)
  assert.ok(getWorldCompanion(item.id,'2026-10-10'),`Missing shared companion ${item.id}`)
  for(const stage of (item.referenceStages || [])){
    assert.ok(matchesWorldReferenceStage(item,stage),`Selected stage filter hides its own event ${item.id}`)
  }
}
for(const china of CHINA_MATH_EVENTS){
  assert.ok(!WORLD_COMPETITIONS.some(x=>x.id===china.id),`Domestic event leaked into public directory: ${china.id}`)
  assert.match(china.verifiedOn,/^\\d{4}-\\d{2}-\\d{2}$/,`Archived verification date missing: ${china.id}`)
  if(china.status==='national-list')assert.ok(china.sourceUrl && NATIONAL_LIST_URL,'Archived source audit must be preserved')
}
assert.ok(!WORLD_REGION_OPTIONS.some(x=>x.value==='CN'),'Domestic region filter must be absent')

console.log('WORLD_CATALOG_INTEGRITY_PASS events='+ids.length+' china='+CHINA_MATH_EVENTS.length+
  ' domestic_hidden=PASS archive_preserved=PASS source_urls=PASS edition_dates_not_invented=PASS')
