import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { arithmeticDraftKey, ARITHMETIC_DRAFT_LIFETIME_MS, validateArithmeticDraft } from '../apps/miniapp/src/services/arithmetic-training-draft'
import { examSubmissionCopy, isBlankPaper } from '../apps/miniapp/src/services/exam-submission-copy'

const root=path.join(import.meta.dirname,'..')
const file=(p:string)=>fs.readFileSync(path.join(root,p),'utf8')
const now=1712345678000
const draft={
 userId:'wxstu_1',startedAt:now-8000,savedAt:now-2000,
 session:{token:'signed-not-real',grade:2,questions:[{id:'q1'},{id:'q2'}]},
 idx:1,raw:'-2',feedback:null,responses:[{questionId:'q1',answer:'3',responseMs:1000,firstInputMs:200,edits:0,backspaces:0}]
}
assert.equal(arithmeticDraftKey('wxstu_1'),'socthink_arithmetic_draft_v1:wxstu_1')
assert.equal(validateArithmeticDraft(draft,'wxstu_1',now)?.idx,1)
assert.equal(validateArithmeticDraft(draft,'wxstu_2',now),null,'another student cannot resume')
assert.equal(validateArithmeticDraft({...draft,startedAt:now-ARITHMETIC_DRAFT_LIFETIME_MS},'wxstu_1',now),null)
assert.equal(validateArithmeticDraft({...draft,idx:2},'wxstu_1',now),null)
assert.equal(validateArithmeticDraft({...draft,raw:'A'.repeat(101)},'wxstu_1',now),null)
assert.equal(validateArithmeticDraft({...draft,feedback:{correct:true,correctAnswer:'2'}},'wxstu_1',now)?.feedback?.correct,true)
assert.equal(examSubmissionCopy(25,0).title,'确认交白卷')
assert.ok(examSubmissionCopy(25,0).content.includes('按本赛事的评分规则'))
assert.ok(!examSubmissionCopy(25,0).content.includes('0分'),'blank-score rules vary by contest')
assert.equal(examSubmissionCopy(25,10).title,'确认提前交卷')
assert.equal(examSubmissionCopy(25,25).title,'确认交卷')
assert.equal(isBlankPaper(0,0,25),true)
assert.equal(isBlankPaper(0,1,24),false)

const arithmetic=file('apps/miniapp/src/pages/arithmetic/index.tsx')
const pad=file('apps/miniapp/src/components/ArithmeticAnswerPad.tsx')
const exam=file('apps/miniapp/src/pages/exam/index.tsx')
const review=file('apps/miniapp/src/pages/review/index.tsx')
assert.equal((pad.match(/提交答案/g)||[]).length,0,'small keypad submit must be absent')
assert.ok(file('apps/miniapp/src/app.css').includes('grid-template-columns:repeat(3,minmax(0,1fr))'),'math keys must follow natural 7-8-9 / 4-5-6 / 1-2-3 layout')
assert.equal((arithmetic.match(/>提交答案<\/Button>/g)||[]).length,1,'exactly one large submit')
assert.ok(arithmetic.includes('暂存并退出') && arithmetic.includes('继续上次训练'))
assert.ok(arithmetic.includes('validateArithmeticDraft(savedDraft,ownerId)'))
assert.ok(exam.includes('saveAndLeave')&&exam.includes('保存并退出'))
assert.ok(exam.includes('examSubmissionCopy(progress.total,progress.answered)'))
assert.ok(exam.includes('if(submitting.current)return'),'retain double-submission protection')
assert.ok(review.includes('const blank=')&&review.includes('const show=blank||!wrong'))
assert.ok(review.includes('无需逐题重做'),'blank submissions must not be forced through retry')
console.log('MINIAPP_ANSWER_UX=PASS single_submit=1 scoped_resume=PASS blank_paper=optional_review exit_confirm=PASS')
