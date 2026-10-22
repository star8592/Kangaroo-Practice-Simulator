import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {SCHOOL_STAGES,stageForGrade,displayGradeName,gradeChoiceName,learnerNextAction} from '../apps/miniapp/src/services/learning-home-copy'
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
assert.equal(displayGradeName(1),'小学一年级')
assert.equal(displayGradeName(6),'小学六年级')
assert.equal(displayGradeName(7),'初一')
assert.equal(displayGradeName(9),'初三')
assert.equal(displayGradeName(10),'高一')
assert.equal(displayGradeName(12),'高三')
assert.equal(displayGradeName(13),'选择年级')
assert.equal(gradeChoiceName(1),'一年级')
assert.equal(gradeChoiceName(6),'六年级')
assert.equal(gradeChoiceName(7),'初一')
assert.equal(gradeChoiceName(10),'高一')
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
assert.ok(home.includes('小学 · 初中 · 高中'),'school coverage must still appear once')
assert.equal(home.split('小学 · 初中 · 高中').length-1,1,'coverage should only be stated once')
assert.ok(!home.includes('school-coverage'),'do not duplicate coverage cards under the hero')
assert.ok(home.includes("hasHistory&&<View className='card learning-action-card'"),'newcomers should see one primary action, not two identical CTAs')
assert.ok(home.includes('今天最值得做什么'))
assert.ok(!home.includes('数据置信度')&&!home.includes('综合训练指数'),'vanity metrics not in first screen')
assert.ok(arithmetic.includes('showGradePicker&&')&&arithmetic.includes('school-stage-tabs')&&arithmetic.includes('stage.grades.map'),
  'stage selector should appear only on demand')
assert.ok(arithmetic.includes('school-grade-grid')&&arithmetic.includes('onClick={()=>chooseGrade(g)}')&&!arithmetic.includes('<Picker'),
  'select a grade by a visible one-tap button, not nested native picker')
assert.ok(arithmetic.includes('kps:arithmetic:grade:')&&arithmetic.includes('ownerId'),'remember grade per learner identity')
assert.ok(arithmetic.includes('setGradeConfirmed(false)')&&arithmetic.includes('disabled={busy||!gradeConfirmed}'),
  'do not start an unintended first-grade practice before explicit first-time choice')
assert.ok(arithmetic.includes('切换年级')&&arithmetic.includes('收起选择')&&arithmetic.includes('grade-current-label'),
  'show the current grade and one compact change action instead of the entire grade list')
assert.ok(arithmetic.includes('暂存并退出')&&arithmetic.includes('继续上次训练'),'do not regress PR132 navigation')
assert.ok(arithmetic.includes('ArithmeticAnswerPad')&&!arithmetic.includes('onSubmit={()=>void check()}'),'do not restore duplicate small submit')
assert.ok(profile.includes('下一步最值得做什么')&&profile.includes('展开详细记录与依据'))
assert.ok(web.includes('CHINESE_SCHOOL_STAGES')&&web.includes('K12_GRADE_BANDS'),'localized stage selection')
assert.ok(landing.includes('小学 · 初中 · 高中均可练'),'public home must communicate full stage coverage once')
assert.ok(!landing.includes('home-school-stages'),'public home must not repeat three grade tiles below hero')
assert.ok(!landing.includes('小学到高中 · 计算训练'),'public capability card must not repeat grades')
assert.ok(web.includes('heroEye:"智能计算训练"')&&!web.includes('heroTitle1:"从小学到高中"'),
  'Web arithmetic hero should focus on practice rather than repeating stage marketing')
assert.ok(landing.includes('className="primary-button home-practice-primary" href="/arithmetic"'),'calculation must be the primary public CTA')
assert.ok(student.includes('<details className={styles.evidencePanel}>'),'advanced report statistics should be opt-in')
assert.ok(student.includes('topAction'),'student should see one next action first')
console.log('K12_ACTIONABLE_HOME=PASS grades=12 stages=primary_junior_senior next_action=evidence_based miniapp_and_web=aligned metrics=on_demand grade_ui=collapsed_after_selection')
