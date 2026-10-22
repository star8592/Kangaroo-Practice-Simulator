import assert from 'node:assert/strict'
import {compareRecentCalculation} from '../src/lib/arithmetic-learning-change'
import type {ArithmeticSession} from '../src/lib/arithmetic-analytics'

function fixture(n:number,grade=9,mode:ArithmeticSession['mode']='adaptive',correct=5,total=10):ArithmeticSession{
 return {
  id:'qa_'+n,grade,mode,studentId:'qa_isolated',
  startedAt:n*1000,finishedAt:n*1000+900,
  attempts:Array.from({length:total},(_,i)=>({correct:i<correct}))
 } as unknown as ArithmeticSession
}
assert.equal(compareRecentCalculation([]),null)
assert.equal(compareRecentCalculation([fixture(1),fixture(2),fixture(3)]),null)
const four=[fixture(1,9,'adaptive',5),fixture(2,9,'adaptive',5),fixture(3,9,'adaptive',9),fixture(4,9,'adaptive',9)]
const up=compareRecentCalculation(four)
assert.ok(up)
assert.equal(up.grade,9)
assert.equal(up.mode,'adaptive')
assert.equal(up.deltaPoints,40)
assert.equal(up.previousTotal,20)
assert.equal(up.recentTotal,20)
assert.ok(up.descriptionZh.includes('难度可能不同'),'do not overclaim improvement')
const split=[...four.slice(0,3),fixture(4,10,'adaptive',9)]
assert.equal(compareRecentCalculation(split),null,'cannot compare across grades')
const modes=[...four.slice(0,3),fixture(4,9,'diagnostic',9)]
assert.equal(compareRecentCalculation(modes),null,'cannot compare different practice modes')
assert.equal(compareRecentCalculation([fixture(1,9,'adaptive',5,5),...four.slice(1)]),null,'short rounds are insufficient evidence')
const down=compareRecentCalculation([fixture(1,9,'adaptive',9),fixture(2,9,'adaptive',9),fixture(3,9,'adaptive',4),fixture(4,9,'adaptive',4)])
assert.equal(down?.deltaPoints,-50)
assert.ok(down?.descriptionZh.includes('低于'))
const stable=compareRecentCalculation([fixture(1,9,'adaptive',7),fixture(2,9,'adaptive',7),fixture(3,9,'adaptive',7),fixture(4,9,'adaptive',7)])
assert.equal(stable?.deltaPoints,0)
assert.ok(stable?.descriptionZh.includes('接近'))
console.log('ACTIONABLE_CALC_TREND=PASS comparable_same_grade_mode=4x10 blank_or_incomparable=suppressed evidence_caveats=present')
