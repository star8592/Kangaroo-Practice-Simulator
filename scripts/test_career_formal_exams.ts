import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {NextRequest} from "next/server";

async function main(){
  const privateRoot=fs.mkdtempSync(path.join(os.tmpdir(),"socthink-formal-exams-"));
  process.env.SOCTHINK_USER_DATA_DIR=privateRoot;
  try{
    const [
      {CAREER_FORMAL_PAPERS,CAREER_FORMAL_SOURCE_SUMMARY,validateCareerFormalBank,
        getCareerFormalAnswer,isCareerFormalPaper},
      {getCareerPractice,CAREER_PRACTICE_CASES},
      {gradeCareerPractice,buildCareerAssessmentContract},
      {createCareerExamSession,verifyCareerExamSession},
      {POST:startExam},
      {POST:gradeExam},
    ]=await Promise.all([
      import("../src/lib/career-formal-bank"),
      import("../src/lib/career-practice"),
      import("../src/lib/career-practice-grade"),
      import("../src/lib/career-exam-session"),
      import("../src/app/api/career/exam/[id]/session/route"),
      import("../src/app/api/career/practice/[id]/grade/route"),
    ]);

    assert.deepEqual(validateCareerFormalBank(),[]);
    assert.equal(CAREER_FORMAL_PAPERS.length,3);
    assert.equal(CAREER_FORMAL_SOURCE_SUMMARY.reviewedAt,"2026-11-01");
    assert(CAREER_FORMAL_SOURCE_SUMMARY.sources.length>=7);
    assert(CAREER_FORMAL_SOURCE_SUMMARY.sources.some(x=>x.sourceKind==="candidate-recollection"));
    assert(CAREER_FORMAL_SOURCE_SUMMARY.sources.every(x=>x.url.startsWith("https://")));
    assert.equal(CAREER_PRACTICE_CASES.length,3,"6-question warmups remain unchanged");

    let totalQuestions=0;
    for(const paper of CAREER_FORMAL_PAPERS){
      const resolved=getCareerPractice(paper.id);
      assert(resolved&&resolved.id===paper.id);
      assert(isCareerFormalPaper(paper.id));
      assert.equal(paper.questions.length,24);
      assert.equal(paper.durationMinutes,45);
      assert.equal(paper.maxPoints,100);
      assert.equal(paper.questions.reduce((n,q)=>n+q.weight,0),100);
      assert(buildCareerAssessmentContract(paper.id)?.valid);
      assert(paper.questions.every(q=>q.provenance?.sourceKind==="original"&&
        q.provenance.authoredAt==="2026-11-01"&&q.provenance.topicSourceUrl?.startsWith("https://")));
      for(const q of paper.questions){
        assert(!Object.hasOwn(q,"correct")&&!Object.hasOwn(q,"explanation"),
          "Never serialize correct answer or rationale before submission");
        if(q.kind==="single")assert(q.options&&q.options.length===4);
      }
      const good:Object=Object.fromEntries(paper.questions.map(q=>{
        const answer=getCareerFormalAnswer(paper.id,q.id);
        assert(answer&&answer.explanation.length>=15);
        return [q.id,answer.value];
      }));
      const grade=gradeCareerPractice(paper.id,good);
      assert(grade&&grade.score===100&&grade.items.every(x=>x.correct),paper.id);
      assert.equal(grade.items.length,24);
      assert.equal(grade.completed,24);
      const blank=gradeCareerPractice(paper.id,{});
      assert(blank&&blank.score===0&&blank.completed===0);
      assert.throws(()=>gradeCareerPractice(paper.id,{unknown:"A"}),/UNKNOWN_QUESTION/);
      totalQuestions+=paper.questions.length;
      const session=createCareerExamSession(paper.id);
      assert.equal(verifyCareerExamSession(paper.id,session.token),"valid");
      assert.equal(verifyCareerExamSession(paper.id,session.token.slice(1)),"invalid");
      assert.equal(verifyCareerExamSession(paper.id,"fake"),"invalid");
      const t=Math.floor(Date.now()/1000);
      const oldSession=createCareerExamSession(paper.id,t-(46*60));
      assert.equal(verifyCareerExamSession(paper.id,oldSession.token,t),"expired");
      const nextPaper=CAREER_FORMAL_PAPERS.find(x=>x.id!==paper.id)!;
      assert.equal(verifyCareerExamSession(nextPaper.id,session.token),"invalid");
      const params={params:Promise.resolve({id:paper.id})};
      const admissionResponse=await startExam(
        new NextRequest("http://localhost/api/career/exam/"+paper.id+"/session",{method:"POST"}),params);
      assert.equal(admissionResponse.status,200);
      const admission=await admissionResponse.json();
      assert.equal(admission.durationMinutes,45);
      assert(admission.deadlineAt>admission.startedAt);
      const post=(answers:unknown,token?:string)=>
        gradeExam(new NextRequest("http://localhost/api/career/practice/"+paper.id+"/grade",{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({answers,sessionToken:token}),
        }),params);
      assert.equal((await post(good)).status,403,"No admission should never yield results");
      assert.equal((await post(good,"tampered")).status,403);
      assert.equal((await post(good,oldSession.token)).status,410);
      const result=await post(good,admission.token);
      assert.equal(result.status,200);
      const json=await result.json();
      assert.equal(json.grade.score,100);
      assert.equal(json.grade.items.length,24);
      assert.equal(json.saveStatus,"browser-only");
      const scoreHeader=result.headers.get("cache-control")||"";
      assert(scoreHeader.includes("no-store"));
      const blankResponse=await post({},admission.token);
      assert.equal(blankResponse.status,200);
      assert.equal((await blankResponse.json()).grade.score,0);
    }
    assert.equal(totalQuestions,72);
    console.log("CAREER_FORMAL_EXAMS=PASS papers=3 question_bank=72 full_score=100 blank_score=0 version=2026-11-01 signed_sessions=YES expiration=YES original_provenance=YES");
  }finally{
    delete process.env.SOCTHINK_USER_DATA_DIR;
    fs.rmSync(privateRoot,{recursive:true,force:true});
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
