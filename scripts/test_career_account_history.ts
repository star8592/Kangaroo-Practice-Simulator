import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {NextRequest} from "next/server";

async function main(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"socthink-career-formal-account-"));
  process.env.SOCTHINK_USER_DATA_DIR=root;
  try{
    const [
      {POST:grade},{GET:history},
      {authenticateOrCreateWechatParent,createParentSessionToken,PARENT_SESSION_COOKIE},
      {createGuestSessionToken,createMiniappWechatSessionToken,SESSION_COOKIE},
      {listCareerAttemptSummaries,readCareerAttempt,isVerifiedCareerStudyIdentity},
      {createCareerExamSession},
      {getCareerFormalPaper,getCareerFormalAnswer,CAREER_FORMAL_PAPERS},
    ]=await Promise.all([
      import("../src/app/api/career/exam/[id]/grade/route"),
      import("../src/app/api/career/exam/history/route"),
      import("../src/lib/parent-auth"),
      import("../src/lib/auth"),
      import("../src/lib/career-attempt-store"),
      import("../src/lib/career-exam-session"),
      import("../src/lib/career-formal-bank"),
    ]);
    const paper=getCareerFormalPaper("procurement-paper-2026q4-v1");
    assert(paper&&paper.questions.length===24);
    assert.equal(CAREER_FORMAL_PAPERS.length,3);
    const ID="11111111-1111-4111-8111-111111111111";
    const ID2="22222222-2222-4222-8222-222222222222";
    const CORRECT=Object.fromEntries(paper.questions.map(q=>{
      const key=getCareerFormalAnswer(paper.id,q.id);
      assert(key);
      return [q.id,key.value];
    }));
    const wrong={};
    const examSession=createCareerExamSession(paper.id);
    const ownerA=authenticateOrCreateWechatParent({
      wechatId:"synthetic_formal_test_wechat_001",name:"synthetic A",
    });
    const ownerB=authenticateOrCreateWechatParent({
      wechatId:"synthetic_formal_test_wechat_002",name:"synthetic B",
    });
    const cookA=PARENT_SESSION_COOKIE+"="+createParentSessionToken(ownerA.id);
    const cookB=PARENT_SESSION_COOKIE+"="+createParentSessionToken(ownerB.id);
    const miniappToken=createMiniappWechatSessionToken("synthetic_formal_openid_A");
    const guestCookie=SESSION_COOKIE+"="+createGuestSessionToken();
    const URL="/api/career/exam/"+paper.id+"/grade";

    function post(answers:unknown,attemptId?:string,headers?:Record<string,string>,
      extra:Record<string,unknown>={}){
      const request=new NextRequest("http://localhost"+URL,{
        method:"POST",headers:{"content-type":"application/json",...headers},
        body:JSON.stringify({answers,sessionToken:examSession.token,
          ...(attemptId?{attemptId}:{}),...extra}),
      });
      return grade(request,{params:Promise.resolve({id:paper.id})});
    }
    function get(query:string,headers?:Record<string,string>){
      return history(new NextRequest("http://localhost/api/career/exam/history"+query,{
        headers:headers??{},
      }));
    }
    assert.equal((await post(CORRECT,ID,undefined,{sessionToken:"invalid"})).status,403);
    const anonymous=await post(CORRECT,ID);
    assert.equal(anonymous.status,200);
    const publicResult=await anonymous.json();
    assert.equal(publicResult.grade.score,100);
    assert.equal(publicResult.grade.totalQuestions,24);
    assert.equal(publicResult.saveStatus,"browser-only");
    const guest=await post(CORRECT,ID,{"cookie":guestCookie});
    assert.equal(guest.status,200);
    assert.equal((await guest.json()).saveStatus,"browser-only");
    assert.equal((await get("")).status,401);
    assert.equal((await get("",{"cookie":guestCookie})).status,401);

    const a=await post(CORRECT,ID,{"cookie":cookA},{
      ownerId:"wx_attacker_should_be_ignored",score:0,userId:ownerB.id,
    });
    assert.equal(a.status,200);
    const first=await a.json();
    assert.equal(first.grade.score,100);
    assert.equal(first.grade.attemptPersistence,"account");
    assert.equal(first.saveStatus,"saved");
    assert.equal(first.alreadySaved,false);
    assert.equal(first.attemptId,ID);
    assert.equal(typeof first.submittedAt,"number");

    const replay=await post(CORRECT,ID,{"cookie":cookA});
    assert.equal(replay.status,200);
    const replayData=await replay.json();
    assert.equal(replayData.alreadySaved,true);
    assert.equal(replayData.attemptId,ID);
    assert.equal(replayData.submittedAt,first.submittedAt);
    assert.equal((await post(wrong,ID,{"cookie":cookA})).status,409);
    const second=await post(wrong,ID2,{"cookie":cookA});
    assert.equal(second.status,200);
    assert.equal((await second.json()).grade.score,0);
    assert.equal((await get("?limit=2",{"cookie":cookA})).status,200);
    const list=await (await get("?limit=20",{"cookie":cookA})).json();
    assert.equal(list.persistence,"account");
    assert.equal(list.attempts.length,2);
    assert.deepEqual(list.attempts.map((x:{score:number})=>x.score).sort((x:number,y:number)=>x-y),[0,100]);
    assert(!JSON.stringify(list).includes(ownerA.id));
    assert(!JSON.stringify(list).includes("fingerprint"));

    const own=await get("?attemptId="+ID,{"cookie":cookA});
    assert.equal(own.status,200);
    const ownResult=await own.json();
    assert.equal(ownResult.grade.score,100);
    assert.equal(ownResult.grade.items.length,24);
    assert(!JSON.stringify(ownResult).includes(ownerA.id));
    assert.equal((await get("?attemptId="+ID,{"cookie":cookB})).status,404);
    assert.deepEqual((await (await get("",{"cookie":cookB})).json()).attempts,[]);
    assert.equal((await get("?attemptId=malformed",{"cookie":cookA})).status,400);
    assert.equal((await get("?limit=900",{"cookie":cookA})).status,400);
    assert.equal((await get("?caseId=unknown",{"cookie":cookA})).status,404);
    assert.equal((await get("?caseId=supplier-selection-001",{"cookie":cookA})).status,404,
      "retired six-question quiz must not remain in active exam history");
    assert.equal((await get("?caseId=operations-paper-2026q4-v1",{"cookie":cookA})).status,200);
    assert.deepEqual((await (await get("?caseId=operations-paper-2026q4-v1",{
      "cookie":cookA})).json()).attempts,[]);

    const miniapp=await post(CORRECT,ID,{"authorization":"Bearer "+miniappToken});
    assert.equal(miniapp.status,200);
    assert.equal((await miniapp.json()).grade.attemptPersistence,"account");
    assert.equal((await (await get("",{"authorization":"Bearer "+miniappToken})).json()).attempts.length,1);
    assert.equal((await get("?attemptId="+ID,{"cookie":cookA})).status,200);
    assert.equal((await get("?attemptId="+ID,{"cookie":cookB})).status,404);
    assert.equal(isVerifiedCareerStudyIdentity(null),false);

    const recordsRoot=path.join(root,"career-practice-attempts");
    const userDirs=fs.readdirSync(recordsRoot);
    assert.equal(userDirs.length,2,"two authenticated WeChat identities, not anonymous/guest");
    for(const name of userDirs){
      const dir=path.join(recordsRoot,name);
      assert.equal(fs.statSync(dir).mode&0o777,0o700);
      for(const file of fs.readdirSync(dir))
        assert.equal(fs.statSync(path.join(dir,file)).mode&0o777,0o600);
    }
    assert.equal(typeof listCareerAttemptSummaries,"function");
    assert.equal(typeof readCareerAttempt,"function");
    console.log("CAREER_FORMAL_ACCOUNT_HISTORY=PASS papers=3 questions=24 score=100/0 verified_wechat=YES owner_isolation=YES idempotent=YES six_quiz=RETIRED");
  }finally{
    delete process.env.SOCTHINK_USER_DATA_DIR;
    fs.rmSync(root,{recursive:true,force:true});
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
