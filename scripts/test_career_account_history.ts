import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {NextRequest} from "next/server";

async function main(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"socthink-career-account-test-"));
  process.env.SOCTHINK_USER_DATA_DIR=root;
  try{
    const [
      {POST:grade},{GET:history},
      {authenticateOrCreateWechatParent,createParentSessionToken,PARENT_SESSION_COOKIE},
      {createGuestSessionToken,createMiniappWechatSessionToken,SESSION_COOKIE},
      {listCareerAttemptSummaries,readCareerAttempt,isVerifiedCareerStudyIdentity},
    ]=await Promise.all([
      import("../src/app/api/career/practice/[id]/grade/route"),
      import("../src/app/api/career/practice/history/route"),
      import("../src/lib/parent-auth"),
      import("../src/lib/auth"),
      import("../src/lib/career-attempt-store"),
    ]);
    const PATH="/api/career/practice/supplier-selection-001/grade";
    const ID="11111111-1111-4111-8111-111111111111";
    const ID2="22222222-2222-4222-8222-222222222222";
    const CORRECT={eligibility:["A","C"],quantity:"657","landed-cost":"34821",
      "supplier-choice":"C",savings:"71",contingency:"none"};
    const wrong={eligibility:["B"],quantity:"0"};
    const ownerA=authenticateOrCreateWechatParent({
      wechatId:"synthetic_test_wechat_001",name:"synthetic A",
    });
    const ownerB=authenticateOrCreateWechatParent({
      wechatId:"synthetic_test_wechat_002",name:"synthetic B",
    });
    const cookA=PARENT_SESSION_COOKIE+"="+createParentSessionToken(ownerA.id);
    const cookB=PARENT_SESSION_COOKIE+"="+createParentSessionToken(ownerB.id);
    const miniappToken=createMiniappWechatSessionToken("synthetic_openid_A");
    const guestCookie=SESSION_COOKIE+"="+createGuestSessionToken();

    function post(answers:unknown,attemptId?:string,headers?:Record<string,string>,
      extra:Record<string,unknown>={}){
      const request=new NextRequest("http://localhost"+PATH,{
        method:"POST",
        headers:{"content-type":"application/json",...headers},
        body:JSON.stringify({answers,...(attemptId?{attemptId}:{}),...extra}),
      });
      return grade(request,{params:Promise.resolve({id:"supplier-selection-001"})});
    }
    function get(query:string,headers?:Record<string,string>){
      return history(new NextRequest("http://localhost/api/career/practice/history"+query,{
        headers:headers??{},
      }));
    }

    // Free and unauthenticated never write a durable attempt.
    const anonymous=await post(CORRECT,ID);
    assert.equal(anonymous.status,200);
    const publicResult=await anonymous.json();
    assert.equal(publicResult.grade.score,100);
    assert.equal(publicResult.saveStatus,"browser-only");
    const guest=await post(CORRECT,ID,{"cookie":guestCookie});
    assert.equal(guest.status,200);
    assert.equal((await guest.json()).saveStatus,"browser-only");
    const noAccountHistory=await get("");
    assert.equal(noAccountHistory.status,401);
    assert.equal((await get("",{"cookie":guestCookie})).status,401);

    // Genuine server-authenticated parent session resolves the stable buyer
    // identity; no caller-supplied ownerId or forged score is ever accepted.
    const a=await post(CORRECT,ID,{"cookie":cookA},{
      ownerId:"wx_this_must_be_ignored",score:0,userId:ownerB.id,
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
    assert.equal(ownResult.grade.items.length,6);
    assert(!JSON.stringify(ownResult).includes(ownerA.id));
    assert.equal((await get("?attemptId="+ID,{"cookie":cookB})).status,404);
    assert.deepEqual((await (await get("",{"cookie":cookB})).json()).attempts,[]);
    assert.equal((await get("?attemptId=malformed",{"cookie":cookA})).status,400);
    assert.equal((await get("?limit=900",{"cookie":cookA})).status,400);
    assert.equal((await get("?caseId=unknown",{"cookie":cookA})).status,404);
    assert.equal((await get("?caseId=campaign-performance-001",{"cookie":cookA})).status,200);
    assert.deepEqual(
      (await (await get("?caseId=campaign-performance-001",{"cookie":cookA})).json()).attempts,[]);

    // A synthetic miniapp Bearer is the same auth mechanism as the existing
    // mini-program and saves in its own pseudonymous, isolated namespace.
    const miniapp=await post(CORRECT,ID,{"authorization":"Bearer "+miniappToken});
    assert.equal(miniapp.status,200);
    assert.equal((await miniapp.json()).grade.attemptPersistence,"account");
    assert.equal((await (await get("",{"authorization":"Bearer "+miniappToken})).json()).attempts.length,1);
    assert.equal((await get("?attemptId="+ID,{"cookie":cookA})).status,200);
    assert.equal((await get("?attemptId="+ID,{"cookie":cookB})).status,404);
    assert.equal(isVerifiedCareerStudyIdentity(null),false);

    const recordsRoot=path.join(root,"career-practice-attempts");
    const userDirs=fs.readdirSync(recordsRoot);
    assert.equal(userDirs.length,2,"two WeChat identities, not anonymous/guest");
    for(const name of userDirs){
      const dir=path.join(recordsRoot,name);
      assert.equal(fs.statSync(dir).mode&0o777,0o700);
      for(const file of fs.readdirSync(dir)){
        assert.equal(fs.statSync(path.join(dir,file)).mode&0o777,0o600);
      }
    }
    // Direct storage ownership is the authenticated account key, not an
    // independent child profile or payment subscriber ID.
    assert.equal(typeof listCareerAttemptSummaries,"function");
    assert.equal(typeof readCareerAttempt,"function");
    console.log("CAREER_ACCOUNT_HISTORY=PASS free_guest=YES verified_wechat=YES miniapp=YES owner_isolation=YES correct=100 wrong=0 idempotent=YES immutable=YES");
  }finally{
    delete process.env.SOCTHINK_USER_DATA_DIR;
    fs.rmSync(root,{recursive:true,force:true});
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
