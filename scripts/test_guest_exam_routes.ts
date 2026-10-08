import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";

async function run() {
const data = mkdtempSync(path.join(tmpdir(), "socthink-guest-exam-"));
process.env.SOCTHINK_USER_DATA_DIR=data;
try {
  const { createGuestSessionToken, SESSION_COOKIE } = await import("../src/lib/auth");
  const { GET: examGet } = await import("../src/app/api/exams/[examId]/route");
  const { GET: sessionGet, POST: sessionPost, PATCH: sessionPatch } = await import("../src/app/api/exam-sessions/route");
  const { POST: gradePost } = await import("../src/app/api/grade/route");
  const { GET: guestBootstrap } = await import("../src/app/api/auth/guest/start/route");
  const id="maa-amc12-practice-geometry";
  const guestToken=createGuestSessionToken();
  const cookie=SESSION_COOKIE+"="+guestToken;
  const mk=(suffix:string,method="GET",body?:object)=>new NextRequest("https://socthink.cn"+suffix, {
    method,headers:{"cookie":cookie,...(body?{"content-type":"application/json"}:{})},
    ...(body?{body:JSON.stringify(body)}:{})
  });
  const cases:[string,Promise<Response>][]=[
    ["full exam question API",examGet(mk("/api/exams/"+id),{params:Promise.resolve({examId:id})})],
    ["exam session read",sessionGet(mk("/api/exam-sessions?examId="+id))],
    ["exam session create",sessionPost(mk("/api/exam-sessions","POST",{examId:id}))],
    ["exam session modify",sessionPatch(mk("/api/exam-sessions","PATCH",{examId:id,sessionId:"fake",action:"start-section",sectionIndex:0}))],
    ["final grading",gradePost(mk("/api/grade","POST",{examId:id,sessionId:"fake"}))],
  ];
  for(const [name,promise] of cases){
    const response=await promise;
    assert.equal(response.status,401,name+" must reject guest");
  }
  const bootstrap=await guestBootstrap(new NextRequest("https://socthink.cn/api/auth/guest/start?next=%2Fexam%2F"+id));
  assert.equal(bootstrap.status,307);
  assert.equal(bootstrap.headers.get("location"),"/login?next=%2Fexam%2F"+id);
  assert.equal(bootstrap.headers.get("set-cookie"),null,"exam bootstrap must not issue guest cookie");
  const arithmetic=await guestBootstrap(new NextRequest("https://socthink.cn/api/auth/guest/start?next=%2Farithmetic"));
  assert.equal(arithmetic.status,307);
  assert.equal(arithmetic.headers.get("location"),"/arithmetic");
  assert.ok(arithmetic.headers.get("set-cookie")?.includes(SESSION_COOKIE));
  console.log("GUEST_EXAM_ROUTE_PASS: five exam endpoint methods reject signed guest; login redirect; arithmetic guest preserved");
} finally {
  rmSync(data,{recursive:true,force:true});
}

}
void run().catch(error=>{ console.error(error); process.exitCode=1; });
