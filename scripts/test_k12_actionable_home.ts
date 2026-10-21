import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {SCHOOL_STAGES,stageForGrade,learnerNextAction} from '../apps/miniapp/src/services/learning-home-copy'
import {CHINESE_SCHOOL_STAGES,K12_GRADE_BANDS} from '../src/lib/k12-grade-system'

const grades=SCHOOL_STAGES.flatMap(s=>[...s.grades])
assert.deepEqual(grades,[1,2,3,4,5,6,7,8,9,10,11,12],'all 12 grades appear exactly once')
assert.deepEqual(CHINESE_SCHOOL_STAGES.map(s=>[s.zh,[...s.grades]]),
  SCHOOL_STAGES.map(s=>[s.label,[...s.grades]]),'web/miniapp Chinese school stage boundaries must agree')
assert.equal(stageForGrade(6).label,'小学')
assert.equal(stageForGrade(7).label,'初中')
assert.equal(stageForGrade(9).label,'初中')
assert.equal(stageForGrade(10).label,'高中')
assert.equal(stageForGrade(12).label,'高中')
assert.deepEqual(K12_GRADE_BANDS.map(s=>s.id),['primary','lower-secondary','upper-secondary'],
  'international crosswalk must remain available')
const first=learnerNextAction(null)
assert.equal(first.mode,'diagnostic')
assert.ok(first.detail.includes('依据'))
const lowSample=learnerNextAction({arithmetic:{sessions:1,plan:{summaryZh:[]}}})
assert.equal(lowSample.mode,'adaptive')
assert.ok(lowSample.detail.includes('没有稳定'))
const learned=learnerNextAction({arithmetic:{sessions:4,plan:{summaryZh:['练习分数化简时重点核对约分']}}})
assert.ok(learned.detail.includes('约分'))
assert.equal(learned.mode,'adaptive')

const read=(file:string)=>fs.readFileSync(path.join(import.meta.dirname,'..',file),'utf8')
const home=read('apps/miniapp/src/pages/home/index.tsx')
const arithmetic=read('apps/miniapp/src/pages/arithmetic/index.tsx')
const profile=read('apps/miniapp/src/pages/profile/index.tsx')
const web=read('src/components/ArithmeticDashboard.tsx')
const landing=read('src/components/PublicHome.tsx')
const student=read('src/app/student/page.tsx')
assert.ok(home.includes('小学 · 初中 · 高中'))
assert.ok(home.includes('今天最值得做什么'))
assert.ok(!home.includes('数据置信度')&&!home.includes('综合训练指数'),'vanity metrics not in first screen')
assert.ok(arithmetic.includes('school-stage-tabs')&&arithmetic.includes('stage.grades.map'))
assert.ok(arithmetic.includes('school-grade-grid')&&arithmetic.includes('onClick={()=>setGrade(g)}')&&!arithmetic.includes('<Picker'),'all grades must be accessible in one visible tap')
assert.ok(arithmetic.includes('暂存并退出')&&arithmetic.includes('继续上次训练'),'do not regress PR132 navigation')
assert.ok(arithmetic.includes('ArithmeticAnswerPad')&&!arithmetic.includes('onSubmit={()=>void check()}'),'do not restore duplicate small submit')
assert.ok(profile.includes('下一步最值得做什么')&&profile.includes('展开详细记录与依据'))
assert.ok(web.includes('CHINESE_SCHOOL_STAGES')&&web.includes('K12_GRADE_BANDS'),'localized stage selection')
assert.ok(landing.includes('小学 1—6 年级')&&landing.includes('初中 7—9 年级')&&landing.includes('高中 10—12 年级'),'public homepage must show all stages')
assert.ok(landing.includes('className="primary-button home-practice-primary" href="/arithmetic"'),'calculation must be the primary public CTA')
assert.ok(student.includes('<details className={styles.evidencePanel}>'),'advanced report statistics should be opt-in')
assert.ok(student.includes('topAction'),'student should see one next action first')
console.log('K12_ACTIONABLE_HOME=PASS grades=12 stages=primary_junior_senior next_action=evidence_based miniapp_and_web=aligned metrics=on_demand')
