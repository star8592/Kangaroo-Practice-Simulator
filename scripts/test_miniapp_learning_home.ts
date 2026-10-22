import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { gradeChoices, schoolStage } from '../apps/miniapp/src/services/grade-stage'

const root=path.resolve(import.meta.dirname,'..')
const home=fs.readFileSync(path.join(root,'apps/miniapp/src/pages/home/index.tsx'),'utf8')
const arithmetic=fs.readFileSync(path.join(root,'apps/miniapp/src/pages/arithmetic/index.tsx'),'utf8')
const css=fs.readFileSync(path.join(root,'apps/miniapp/src/app.css'),'utf8')

assert.equal(gradeChoices.length,12)
assert.deepEqual([1,6,7,9,10,12].map(schoolStage),['小学','小学','初中','初中','高中','高中'])
assert.equal(gradeChoices[0].label,'小学 · 一年级')
assert.equal(gradeChoices[6].label,'初中 · 初一')
assert.equal(gradeChoices[9].label,'高中 · 高一')
assert.equal(gradeChoices[11].label,'高中 · 高三')
for (const value of [0,-1,13,1.5,Infinity]) assert.throws(()=>schoolStage(value),RangeError)

for(const text of ['小学 · 1–6 年级','初中 · 7–9 年级','高中 · 10–12 年级','下一步练什么','练下一组','竞赛题累计正确率']){
  assert.ok(home.includes(text),'homepage missing: '+text)
}
assert.ok(home.indexOf('下一步练什么')<home.indexOf('我的练习记录'),'recommendation must precede records')
assert.ok(!home.includes('综合训练指数')&&!home.includes('数据置信度'),'technical metrics should not crowd the student landing')
assert.ok(arithmetic.includes('gradeChoices.map(option=>option.label)'),'grade picker must show stage names')
assert.ok(arithmetic.includes('onChange={e=>setGrade(Number(e.detail.value)+1)}'),'grade ID mapping must remain compatible')
assert.ok(css.includes('.stage-strip')&&css.includes('.learning-evidence'),'mobile-first visual classes missing')
console.log('MINIAPP_LEARNING_HOME=PASS grades=12 stages=3 user_first=true data_contract=unchanged')
