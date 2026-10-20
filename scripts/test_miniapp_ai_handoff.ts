import assert from 'node:assert/strict'
import {
  AI_ARITHMETIC_INTENT_TTL_MS, makeAIArithmeticIntent, readAIArithmeticIntent,
  readAIEntryTarget, noteAgentHandoff, takeAgentHandoff
} from '../apps/miniapp/src/services/ai-entry-intent'

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
console.log('MINIAPP_AI_HANDOFF_INTENT_PASS sanitized=PASS ttl=PASS one_shot=PASS')
