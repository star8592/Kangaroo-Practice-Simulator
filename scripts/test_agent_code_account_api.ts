import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {NextRequest} from "next/server";

async function main(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"socthink-agent-code-"));
 process.env.SOCTHINK_USER_DATA_DIR=root;
 try{
  const [{GET,POST},{authenticateOrCreateWechatParent,createParentSessionToken,PARENT_SESSION_COOKIE},
   {createGuestSessionToken,SESSION_COOKIE}]=await Promise.all([
   import("../src/app/api/skill-labs/engineering/agent/attempts/route"),
   import("../src/lib/parent-auth"),
   import("../src/lib/auth"),
  ]);
  const a=authenticateOrCreateWechatParent({wechatId:"synthetic_agent_account_A"});
  const b=authenticateOrCreateWechatParent({wechatId:"synthetic_agent_account_B"});
  const cookieA=PARENT_SESSION_COOKIE+"="+createParentSessionToken(a.id);
  const cookieB=PARENT_SESSION_COOKIE+"="+createParentSessionToken(b.id);
  const cookieGuest=SESSION_COOKIE+"="+createGuestSessionToken();
  const origin=process.env.SOCTHINK_PUBLIC_ORIGIN??"http://localhost";
  const url=origin+"/api/skill-labs/engineering/agent/attempts";
  const attemptId="11111111-1111-4111-8111-111111111111";
  const otherId="22222222-2222-4222-8222-222222222222";
  const source="function validateTicket(value) {return {valid:false,code:'UNEXPECTED_FIELDS'};}";
  function post(payload:unknown,cookie?:string,extra:Record<string,string>={}){
   return POST(new NextRequest(url,{
    method:"POST",headers:{"Origin":origin,"sec-fetch-site":"same-origin",
     "Content-Type":"application/json",...(cookie?{cookie}:{}),...extra},
    body:JSON.stringify(payload),
   }));
  }
  function get(cookie?:string){return GET(new NextRequest(url,{headers:cookie?{cookie}:{}}));}
  assert.equal((await get()).status,401);
  assert.equal((await get(cookieGuest)).status,401);
  const sample={attemptId,taskId:"ag-contract",source,
    // Client supplied claim must be ignored; only executable test output counts.
    correct:true,passed:99,score:100,ownerId:b.id};
  assert.equal((await post(sample)).status,401);
  assert.equal((await post(sample,cookieGuest)).status,401);
  assert.equal((await post({...sample,taskId:"invalid"},cookieA)).status,400);
  assert.equal((await post({...sample,source:""},cookieA)).status,400);
  assert.equal((await post({...sample,attemptId:"not-a-uuid"},cookieA)).status,400);
  assert.equal((await POST(new NextRequest(url,{method:"POST",headers:{
   "Origin":"https://attacker.example","Content-Type":"application/json",cookie:cookieA},
   body:JSON.stringify(sample),
  }))).status,403);
  const first=await post(sample,cookieA);
  assert.equal(first.status,200);
  const firstBody=await first.json();
  assert.equal(firstBody.saved,true);
  assert.equal(firstBody.sourceStored,false);
  assert.equal(firstBody.summary.taskId,"ag-contract");
  assert.equal(firstBody.summary.correct,false);
  assert.equal(firstBody.summary.total,4);
  assert.equal(firstBody.summary.passed,1);
  assert.equal(firstBody.alreadySaved,false);
  assert(!JSON.stringify(firstBody).includes(a.id));
  assert(!JSON.stringify(firstBody).includes("ownerId"));
  const again=await post(sample,cookieA);
  assert.equal(again.status,200);
  assert.equal((await again.json()).alreadySaved,true);
  const mismatch=await post({...sample,source:source+" // mutated"},cookieA);
  assert.equal(mismatch.status,409);
  const other=await post({...sample,attemptId:otherId},cookieB);
  assert.equal(other.status,200);
  const listA=await (await get(cookieA)).json();
  const listB=await (await get(cookieB)).json();
  assert.equal(listA.attempts.length,1);
  assert.equal(listB.attempts.length,1);
  assert.equal(listA.attempts[0].attemptId,attemptId);
  assert.equal(listB.attempts[0].attemptId,otherId);
  assert(!JSON.stringify(listA).includes(source),"the server must not return source");
  assert(!JSON.stringify(listA).includes(b.id));
  const dirs=fs.readdirSync(path.join(root,"agent-code-attempts"));
  assert.equal(dirs.length,2);
  for(const dirName of dirs){
   const dir=path.join(root,"agent-code-attempts",dirName);
   assert.equal(fs.statSync(dir).mode&0o777,0o700);
   const names=fs.readdirSync(dir);
   assert.equal(names.length,1);
   for(const name of names){
    const file=path.join(dir,name);
    assert.equal(fs.statSync(file).mode&0o777,0o600);
    const raw=fs.readFileSync(file,"utf8");
    assert(!raw.includes(source),"raw learner code must not be persisted");
   }
  }
  console.log("AGENT_ACCOUNT_HISTORY=PASS server_regrade=YES forged_score=IGNORED owner_isolation=YES no_source_retention=YES replay=IDEMPOTENT");
 }finally{
  delete process.env.SOCTHINK_USER_DATA_DIR;
  fs.rmSync(root,{recursive:true,force:true});
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
