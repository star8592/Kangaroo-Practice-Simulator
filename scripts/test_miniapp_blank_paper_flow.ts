import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

async function main(){
 const cwd=process.cwd()
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'socthink-miniapp-blank-paper-'))
 process.env.SOCTHINK_USER_DATA_DIR=path.join(tmp,'private','users')
 process.chdir(tmp)
 try {
  const {NextRequest}=await import('next/server')
  const auth=await import('../src/lib/auth')
  const {POST:startSession}=await import('../src/app/api/exam-sessions/route')
  const {POST:submitGrade}=await import('../src/app/api/grade/route')
  const {GET:review}=await import('../src/app/api/miniapp/review/route')
  const {GET:recovery}=await import('../src/app/api/exam-sessions/recovery/route')
  const {loadExamAttempts}=await import('../src/lib/attempt-store')
  const {applyMaaFormat}=await import('../src/lib/maa-amc-format')
  const id='isolation-miniapp-amc10-full-blank'
  const questions=Array.from({length:25},(_,i)=>({
   id:'qa'+(i+1),year:2026,level:'AMC 10',grades:'9–10',language:'en',
   questionNo:i+1,points:6,answerMode:'choice',concept:'arithmetic',
   stem:'Question '+(i+1)+': 2+2 = ?',stemEn:'Question '+(i+1)+': 2+2 = ?',
   examReady:true,choices:[{key:'A',label:'3'},{key:'B',label:'4'},{key:'C',label:'5'}],
   answer:'B',solution:'2+2=4; choose B'
  }))
  const profile=applyMaaFormat({
   id,name:'Isolated AMC 10 Blank Paper',nameZh:'交白卷隔离验收',
   country:'USA',year:2026,grades:'9–10',paperType:'sample',
   questionCount:25,durationSeconds:4500,initialScore:0,maxScore:150,
   wrongPenaltyMode:'fixed',wrongPenaltyValue:0,timingMode:'official'
  },'maa-amc10')
  fs.mkdirSync(path.join(tmp,'private','exams'),{recursive:true})
  fs.writeFileSync(path.join(tmp,'private','exams',id+'.json'),JSON.stringify({profile,questions}))
  const student=auth.createStudent({username:'blank_qa_owner',candidateNo:'BLANK_QA_OWNER',name:'Isolated Blank QA',grade:10,pin:'1234'})
  const stranger=auth.createStudent({username:'blank_qa_other',candidateNo:'BLANK_QA_OTHER',name:'Other Isolated QA',grade:10,pin:'1234'})
  const token=auth.createSessionToken(student.id)
  const foreignToken=auth.createSessionToken(stranger.id)
  const guest=auth.createGuestSessionToken()
  const make=(endpoint:string,bearer:string|null,body?:unknown)=>{
   const headers:Record<string,string>={'content-type':'application/json'}
   if(bearer)headers.authorization='Bearer '+bearer
   return new NextRequest('https://socthink.cn'+endpoint,body===undefined?{headers}:{method:'POST',headers,body:JSON.stringify(body)})
  }
  const sessionResponse=await startSession(make('/api/exam-sessions',token,{examId:id}))
  assert.equal(sessionResponse.status,200,'only isolated student should start the fixture exam')
  const {session}=await sessionResponse.json()
  assert.ok(session?.id)
  const body={examId:id,sessionId:session.id,answers:{},events:[],lang:'zh'}
  const gradeResponse=await submitGrade(make('/api/grade',token,body))
  assert.equal(gradeResponse.status,200,'blank paper must be accepted by real grade route')
  const grade=await gradeResponse.json()
  assert.equal(grade.score,37.5,'AMC10 all-blank score must be 25 x 1.5')
  assert.equal(grade.maxScore,150)
  assert.equal(grade.correct,0)
  assert.equal(grade.wrong,0,'unanswered questions must not be marked wrong')
  assert.equal(grade.blank,25)
  assert.ok(grade.attemptId)
  assert.equal(grade.items.length,25)
  assert.ok(grade.items.every((item:{correct:boolean|null;selected:string|null;scoreDelta:number})=>
   item.correct===null && item.selected===null && item.scoreDelta===1.5))
  const viewEndpoint='/api/miniapp/review?attemptId='+encodeURIComponent(grade.attemptId)
  const viewResp=await review(make(viewEndpoint,token))
  assert.equal(viewResp.status,200,'review route must read the newly committed isolated attempt')
  const view=await viewResp.json()
  assert.equal(view.grade.blank,25)
  assert.equal(view.grade.wrong,0)
  assert.equal(view.grade.score,37.5)
  assert.equal(view.questions.length,25)
  assert.equal(view.grade.items.length,25)
  assert.equal(view.answers && Object.keys(view.answers).length,0)
  assert.ok(view.questions.every((q:{stem:string;choices:unknown[]})=>q.stem.includes('Question') && q.choices.length===3))
  assert.ok(view.grade.items.every((g:{selected:string|null;correct:boolean|null;correctAnswer:string;solution:string})=>g.selected===null&&g.correct===null&&g.correctAnswer==='B'&&g.solution.includes('4')))
  assert.equal((await review(make(viewEndpoint,foreignToken))).status,404,'another student cannot read the blank attempt')
  assert.equal((await review(make(viewEndpoint,guest))).status,404,'guest must not read another student attempt')
  assert.equal((await review(make(viewEndpoint,null))).status,401,'unauthenticated attempts cannot be read')
  const regrade=await submitGrade(make('/api/grade',token,{...body,answers:{qa1:'B'}}))
  assert.equal(regrade.status,200)
  assert.deepEqual(await regrade.json(),grade,'replayed session must not silently change blank into answered')
  assert.equal(loadExamAttempts(student.id).length,1,'only one final attempt is stored')
  const recovered=await recovery(make('/api/exam-sessions/recovery?examId='+id+'&sessionId='+session.id,token))
  assert.equal(recovered.status,200)
  assert.deepEqual((await recovered.json()).result,grade,'recovery endpoint must return same committed receipt')
  assert.equal((await submitGrade(make('/api/grade',guest,body))).status,401,'guest cannot submit a full exam')
  console.log('MINIAPP_BLANK_PAPER_FLOW=PASS real_grade=37.5/150 correct=0 wrong=0 blank=25 review=25 owner_isolation=PASS repeat_idempotent=PASS guest_denied=PASS temp_storage_only=PASS')
 }finally {
  process.chdir(cwd)
  fs.rmSync(tmp,{recursive:true,force:true})
 }
}
void main().catch(error=>{console.error('MINIAPP_BLANK_PAPER_FLOW=FAIL',error);process.exitCode=1})
