import assert from 'node:assert/strict'
import {preferredGrade,readStartIntent,validGrade,GRADE_LABELS} from '../apps/miniapp/src/services/calculation-entry'
assert.equal(GRADE_LABELS.length,12)
assert.equal(GRADE_LABELS[6],'初中1年级')
assert.equal(GRADE_LABELS[9],'高中1年级')
assert.equal(validGrade('13'),null)
assert.equal(preferredGrade({grade:5},2),5)
assert.equal(preferredGrade({},2),2)
assert.equal(preferredGrade({},''),null)
assert.equal(readStartIntent({grade:3,at:1000},1100),3)
assert.equal(readStartIntent({grade:3,at:1000},122001),null)
assert.equal(readStartIntent({grade:99,at:1000},1100),null)
console.log('MINIAPP_ONE_TAP=PASS')
