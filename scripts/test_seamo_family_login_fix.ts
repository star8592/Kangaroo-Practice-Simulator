import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {NextRequest} from 'next/server';

async function run(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'seamo-family-qa-'));
 process.env.SOCTHINK_USER_DATA_DIR=root;
 try {
  const auth=await import('../src/lib/auth');
  const parent=await import('../src/lib/parent-auth');
  const access=await import('../src/lib/exam-access');
  const {GET:bootstrap}=await import('../src/app/api/auth/guest/start/route');
  const {GET:questions}=await import('../src/app/api/exams/[examId]/route');
  const {GET:resume,POST:start}=await import('../src/app/api/exam-sessions/route');
  const {POST:grade}=await import('../src/app/api/grade/route');
  const {GET:recovery}=await import('../src/app/api/exam-sessions/recovery/route');
  const p=parent.createParent({email:'family-fixture@example.test',name:'Test Family',passwordHash:parent.hashPassword('FixtureOnlyLongPassword9'),termsAcceptedAt:Date.now(),guardianConfirmedAt:Date.now()});
  const parentCookie=`${parent.PARENT_SESSION_COOKIE}=${parent.createParentSessionToken(p.id)}`;
  const pathTo=(id:string)=>'/exam/'+id;
  const bootstrapReq=(id:string,cookies='')=>bootstrap(new NextRequest('https://socthink.cn/api/auth/guest/start?next='+encodeURIComponent(pathTo(id)),{headers:{cookie:cookies}}));
  const id1='seamo-original-g1-revised-1',id2='seamo-original-g2-revised-1';
  assert.equal((await bootstrapReq(id1)).cookies.get(auth.SESSION_COOKIE),undefined);
  assert((await bootstrapReq('maa-amc12-practice-geometry',parentCookie)).cookies.get(auth.SESSION_COOKIE)?.value,'WeChat family may start any competition');
  const activated=await bootstrapReq(id1,parentCookie);
  assert.equal(activated.headers.get('location'),pathTo(id1));
  const token=activated.cookies.get(auth.SESSION_COOKIE)?.value;
  assert(token);
  const user=auth.userFromSessionToken(token);
  assert(user?.id.startsWith('guest_family_'));
  assert(access.hasFullExamAccess(user),"verified WeChat household is an ordinary free account");
  const req=(pathname:string,method='GET',body?:object,t=token)=>new NextRequest('https://socthink.cn'+pathname,{method,headers:{cookie:auth.SESSION_COOKIE+'='+t,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  for(const [id,number] of [[id1,15],[id2,25]] as const){
   assert(access.canAccessExamId(user,id));
   const q=await questions(req('/api/exams/'+id),{params:Promise.resolve({examId:id})});
   assert.equal(q.status,200);
   assert.equal((await q.json()).questions.length,number);
   const s=await start(req('/api/exam-sessions','POST',{examId:id}));
   assert.equal(s.status,200);
   const sid=(await s.json()).session.id;
   assert.equal((await resume(req('/api/exam-sessions?examId='+id))).status,200);
   const result=await grade(req('/api/grade','POST',{examId:id,sessionId:sid,answers:{}}));
   assert.equal(result.status,200);
   assert.equal((await result.json()).score,0);
   const recovered=await recovery(req('/api/exam-sessions/recovery?examId='+id+'&sessionId='+sid));
   assert.equal((await recovered.json()).status,'completed');
   console.log(id,'FAMILY_PRACTICE=PASS',number);
  }
  for(const id of ['maa-amc12-practice-geometry','seamo-original-g1-mock-1']){
   assert(access.canAccessExamId(user,id),"WeChat account must access all competitions");
   const response=await questions(req('/api/exams/'+id),{params:Promise.resolve({examId:id})});
   assert.equal(response.status,200,'all competition questions accessible to WeChat families');
   assert.equal((await resume(req('/api/exam-sessions?examId='+id))).status,200);
   const started=await start(req('/api/exam-sessions','POST',{examId:id}));
   assert.equal(started.status,200);
   const sid=(await started.json()).session.id;
   const result=await grade(req('/api/grade','POST',{examId:id,sessionId:sid,answers:{}}));
   assert.equal(result.status,200,'all competitions can be graded');
  }
  const guest=auth.createGuestSessionToken();
  assert.equal((await questions(req('/api/exams/'+id1,'GET',undefined,guest),{params:Promise.resolve({examId:id1})})).status,401);
  const student=auth.createStudent({username:'fixtureStudent',candidateNo:'FIX-001',name:'Fixture Student',grade:1,pin:'1234'});
  const studentToken=auth.createSessionToken(student.id);
  assert.equal((await bootstrapReq(id1,parentCookie+'; '+auth.SESSION_COOKIE+'='+studentToken)).cookies.get(auth.SESSION_COOKIE),undefined);
  console.log('SEAMO_FAMILY_LOGIN_FIX=PASS student_login_not_repeated=true guest_protection=true all_competitions_equal=true result_recovery=true');
 } finally {fs.rmSync(root,{recursive:true,force:true});}
}
run().catch(e=>{console.error(e);process.exitCode=1});
