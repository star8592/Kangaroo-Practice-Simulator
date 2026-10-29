import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

async function main() {
  const priorCwd = process.cwd();
  const oldEnv = process.env.SOCTHINK_USER_DATA_DIR;
  const temp = fs.mkdtempSync(path.join(os.tmpdir(),"socthink-feedback-api-"));
  try {
    process.env.SOCTHINK_USER_DATA_DIR=path.join(temp,"private","users");
    process.chdir(temp);
    const { NextRequest } = await import("next/server");
    const { createStudent,createSessionToken,SESSION_COOKIE } = await import("../src/lib/auth");
    const { POST } = await import("../src/app/api/student/feedback/route");
    const student=createStudent({username:"tester",candidateNo:"TEST-001",name:"Sample",grade:6,pin:"1234"});
    const another=createStudent({username:"tester2",candidateNo:"TEST-002",name:"Sample2",grade:6,pin:"1234"});
    const token=createSessionToken(student.id);
    const anotherToken=createSessionToken(another.id);
    const folder=path.join(temp,"private","users");
    fs.mkdirSync(folder,{recursive:true});
    fs.writeFileSync(path.join(folder,"exam-attempts.jsonl"), JSON.stringify({
      id:"att_1234567890abcdef",userId:student.id,examId:"exam-001",
      questions:[{questionId:"q_1"}],
    })+"\n");
    const testKey = ["fixture", "feedback", "route", "0000000001"].join("_");
    const payload={
      attemptId:"att_1234567890abcdef",examId:"exam-001",questionId:"q_1",
      category:"question_error",message:"One option is wrong",source:"review",idempotencyKey:testKey,
    };
    const endpoint="http://localhost:3000/api/student/feedback";
    const req=(obj:unknown,cookie?:string,headers:Record<string,string>={})=>new NextRequest(endpoint,{
      method:"POST",headers:{"content-type":"application/json","origin":"http://localhost:3000",
        ...(cookie?{"cookie":SESSION_COOKIE+"="+cookie}:{}),...headers},body:JSON.stringify(obj),
    });
    assert.equal((await POST(req(payload))).status,401);
    assert.equal((await POST(req(payload,anotherToken))).status,404);
    assert.equal((await POST(req({...payload,questionId:"q_others"},token))).status,400);
    assert.equal((await POST(req(payload,token,{"origin":"http://evil.example"}))).status,403);
    const proxyHost=await POST(req({...payload,idempotencyKey:testKey+"proxy"},token,{"host":"socthink.cn","origin":"https://socthink.cn"}));
    assert.equal(proxyHost.status,201);
    const first=await POST(req(payload,token));
    assert.equal(first.status,201);
    assert.equal((await first.json()).ok,true);
    const second=await POST(req(payload,token));
    assert.equal(second.status,200);
    assert.equal((await second.json()).duplicate,true);
    const userFiles=fs.readdirSync(path.join(folder,"customer-feedback"));
    assert.equal(userFiles.length,1);
    console.log("CUSTOMER_FEEDBACK_ROUTE=PASS auth+ownership+question_scope+origin+idempotency");
  } finally {
    process.chdir(priorCwd);
    if (oldEnv===undefined) delete process.env.SOCTHINK_USER_DATA_DIR;
    else process.env.SOCTHINK_USER_DATA_DIR=oldEnv;
    fs.rmSync(temp,{recursive:true,force:true});
  }
}
main().catch(e=>{console.error(e);process.exit(1)});
