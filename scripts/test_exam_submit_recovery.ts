import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

async function main(){
  const previous=process.cwd();
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"socthink-exam-submit-"));
  process.env.SOCTHINK_USER_DATA_DIR=path.join(tmp,"private","users");
  process.chdir(tmp);
  try{
    const {NextRequest}=await import("next/server");
    const auth=await import("../src/lib/auth");
    const sessions=await import("../src/lib/exam-session");
    const attempts=await import("../src/lib/attempt-store");
    const {POST}=await import("../src/app/api/grade/route");
    const {GET}=await import("../src/app/api/exam-sessions/recovery/route");
    const examId="e2e-submit-recovery-fixture";
    const questions=Array.from({length:5},(_,i)=>({
      id:"q"+(i+1),year:2026,level:"AMC8",grades:"7–8",language:"zh",questionNo:i+1,
      points:5,answerMode:"choice",concept:"addition",stem:"2+2=?",examReady:true,
      choices:[{key:"A",label:"3"},{key:"B",label:"4"},{key:"C",label:"5"}],
      answer:"B",solution:"4"
    }));
    const profile={
      id:examId,name:"Isolated recovery fixture",nameZh:"交卷恢复隔离测试",country:"Australia",
      year:2026,grades:"7–8",competitionId:"australian-amc",formatId:"amc8",
      paperType:"sample",questionCount:5,durationSeconds:3600,initialScore:0,maxScore:25,
      wrongPenaltyMode:"fixed",wrongPenaltyValue:0,blankScoreValue:0,timingMode:"official"
    };
    fs.mkdirSync(path.join(tmp,"private","exams"),{recursive:true});
    fs.writeFileSync(path.join(tmp,"private","exams",examId+".json"),JSON.stringify({profile,questions}));
    const alice=auth.createStudent({username:"test_alice",candidateNo:"ALICE",name:"Alice",grade:8,pin:"1234"});
    const bob=auth.createStudent({username:"test_bob",candidateNo:"BOB",name:"Bob",grade:8,pin:"1234"});
    const access=auth.createSessionToken(alice.id);
    const bobAccess=auth.createSessionToken(bob.id);
    const req=(pathname:string,token:string|null,body?:unknown)=>{
      const headers:Record<string,string>={"content-type":"application/json"};
      if(token)headers.authorization="Bearer "+token;
      return new NextRequest("https://socthink.cn"+pathname,
        body===undefined?{headers}:{method:"POST",headers,body:JSON.stringify(body)});
    };
    const query=(sid:string)=>"/api/exam-sessions/recovery?examId="+examId+"&sessionId="+sid;
    const original=sessions.startExamSession(alice.id,examId,3600).session;
    const payload={examId,sessionId:original.id,answers:{q1:"B"},events:[],lang:"zh"};
    const pending=await GET(req(query(original.id),access));
    assert.equal(pending.status,200);
    assert.equal((await pending.json()).status,"active");
    assert.equal((await GET(req(query(original.id),null))).status,401);
    assert.equal((await GET(req(query(original.id),bobAccess))).status,404);
    const firstResponse=await POST(req("/api/grade",access,payload));
    assert.equal(firstResponse.status,200,"first grade request must succeed");
    const first=await firstResponse.json();
    assert.ok(first.attemptId);
    assert.equal(first.correct,1);
    assert.equal(first.blank,4);
    const retryResponse=await POST(req("/api/grade",access,payload));
    assert.equal(retryResponse.status,200);
    const retry=await retryResponse.json();
    assert.deepEqual(retry,first,"repeated submit must yield the exact original receipt");
    const altered=await POST(req("/api/grade",access,{...payload,answers:{q1:"A"}}));
    assert.equal(altered.status,200);
    assert.deepEqual(await altered.json(),first,"a submitted exam cannot be silently re-graded with changed answers");
    const recovered=await GET(req(query(original.id),access));
    assert.equal(recovered.status,200);
    assert.deepEqual((await recovered.json()).result,first);
    const history=()=>attempts.loadExamAttempts(alice.id,100);
    assert.equal(history().length,1,"same exam session must never append again");
    assert.equal(history()[0].sessionId,original.id);
    assert.equal((await POST(req("/api/grade",bobAccess,payload))).status,409,"another student must never replay Alice's ticket");
    assert.equal(history().length,1);

    // Crash-window simulation: a result reached the attempt log but the
    // session marker had not been set. The recovery endpoint reconciles it.
    const s2=sessions.startExamSession(alice.id,examId,3600).session;
    const bundle=(await import("../src/lib/training-question-bank")).loadTrainingExamBundle(examId);
    const grade=(await import("../src/lib/grading")).gradeExam(bundle.questions,{q1:"B"},bundle.profile);
    const orphan=attempts.appendExamAttempt({user:alice,sessionId:s2.id,bundle,grade,
      events:[{type:"server_submit",at:Date.now()}],startedAt:s2.startedAt,submittedAt:Date.now(),elapsedSeconds:1});
    assert.equal(sessions.ownedExamSession(s2.id,alice.id,examId)?.completedAt,undefined);
    const reconciled=await GET(req(query(s2.id),access));
    assert.equal(reconciled.status,200);
    assert.equal((await reconciled.json()).result.attemptId,orphan.id);
    assert.equal(sessions.ownedExamSession(s2.id,alice.id,examId)?.attemptId,orphan.id);
    assert.equal(history().length,2);
    const recoveredRepeat=await POST(req("/api/grade",access,{...payload,sessionId:s2.id}));
    assert.equal(recoveredRepeat.status,200);
    assert.equal((await recoveredRepeat.json()).attemptId,orphan.id);
    assert.equal(history().length,2);

    // Simulate concurrent graders holding the exact same FS lock.
    const s3=sessions.startExamSession(alice.id,examId,3600).session;
    const lockRoot=path.join(tmp,"private","users",".exam-submit-locks");
    const lock=path.join(lockRoot,crypto.createHash("sha256")
      .update(JSON.stringify([alice.id,examId,s3.id])).digest("hex"));
    fs.mkdirSync(lock,{recursive:true});
    const concurrent=await POST(req("/api/grade",access,{...payload,sessionId:s3.id}));
    assert.equal(concurrent.status,500);
    assert.equal(history().length,2);
    fs.rmdirSync(lock);
    const final=await POST(req("/api/grade",access,{...payload,sessionId:s3.id}));
    assert.equal(final.status,200);
    assert.equal(history().length,3);
    console.log("EXAM_SUBMIT_RECOVERY=PASS real_grade=true same_receipt=true other_student_denied=true orphan_reconciled=true lock_serialized=true isolated_data=true");
  }finally{
    process.chdir(previous);
    fs.rmSync(tmp,{recursive:true,force:true});
  }
}
main().catch(error=>{console.error("EXAM_SUBMIT_RECOVERY=FAIL",error);process.exitCode=1;});
