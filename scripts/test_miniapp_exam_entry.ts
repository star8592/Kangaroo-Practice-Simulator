import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { canStartFullExam, makeExamLoginPath, makeExamPath, parseRequestedExam } from '../apps/miniapp/src/services/exam-access'

const guest = {id:'guest_1234',role:'student',username:'guest',candidateNo:'GUEST'}
const wechat = {id:'wxstu_1234',role:'student',username:'wechat',candidateNo:'WECHAT'}
const registered = {id:'stu_5678',role:'student',username:'math_student'}
const admin = {id:'admin_1',role:'admin'}

assert.equal(canStartFullExam(null),false)
assert.equal(canStartFullExam(undefined),false)
assert.equal(canStartFullExam(guest),false)
assert.equal(canStartFullExam({id:'guest_999',role:'admin'}),false)
assert.equal(canStartFullExam(wechat),true)
assert.equal(canStartFullExam(registered),true)
assert.equal(canStartFullExam(admin),true)
assert.equal(canStartFullExam({id:'stu_999',role:'parent'}),false)
assert.equal(canStartFullExam({id:'',role:'student'}),false)

const paper='maa-amc12-practice-geometry'
assert.equal(makeExamPath(paper),'/pages/exam/index?examId='+paper)
assert.equal(makeExamLoginPath(paper),'/pages/login/index?nextExam='+paper)
assert.equal(parseRequestedExam(paper),paper)
assert.equal(parseRequestedExam(encodeURIComponent(paper)),paper)
for (const malformed of ['/pages/admin/index','https://evil.example','..','%2Fpages%2Fhome','a%252Fb','a'.repeat(181),'%EF%ZZ']) {
  assert.equal(parseRequestedExam(malformed),'',malformed)
}

const root=path.join(import.meta.dirname,'..')
const source=(file:string)=>fs.readFileSync(path.join(root,file),'utf8')
const exam=source('apps/miniapp/src/pages/exam/index.tsx')
const list=source('apps/miniapp/src/pages/competitions/index.tsx')
const home=source('apps/miniapp/src/pages/home/index.tsx')
const login=source('apps/miniapp/src/pages/login/index.tsx')

assert.ok(exam.indexOf('canStartFullExam(authStore.user())')>=0,'exam must gate signed guests')
assert.ok(exam.indexOf('makeExamLoginPath(examId)')>=0,'blocked guest must have login CTA')
assert.ok(exam.indexOf("const data:any=await api('/api/exams/'") < exam.indexOf("const active:any=await api('/api/exam-sessions?examId='"),'unsupported split exam must be detected before allocating session')
assert.ok(list.includes('makeExamLoginPath(examId)'),'exam catalogue guest route missing')
assert.ok(list.includes('重新加载试卷')&&list.includes('loadError'),'catalogue must distinguish failed load from truly empty')
assert.ok(home.includes('makeExamLoginPath(id)'),'homepage recommended exam must require registered identity')
assert.ok(list.includes('void openWebExam(String(ex.id))')&&list.includes('Taro.setClipboardData'),'unsupported split-exam must offer a working copyable Web link')
assert.ok(login.includes('pendingExam.current')&&login.includes('await Taro.redirectTo({url:makeExamPath(pendingExam.current)})'),'login must resume intended paper')

console.log('MINIAPP_EXAM_ENTRY=PASS registered=3 guest=denied session_creation_after_bundle=pass login_resume=pass catalog_retry=pass')
