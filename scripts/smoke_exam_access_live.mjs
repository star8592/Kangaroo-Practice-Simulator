/**
 * Non-destructive Web + miniapp access checks for CI candidates and production.
 * Uses disposable guest tokens only. Never logs identity tokens.
 */
import assert from "node:assert/strict";

const EXAM_ID = "maa-amc12-practice-geometry";
const LOGIN_TARGET = "/login?next=%2Fexam%2F" + EXAM_ID;

async function request(base, route, {method="GET", headers={}, body}={}) {
  return fetch(new URL(route, base), {
    method, headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
}
function expectRedirect(response, location) {
  assert.equal(response.status, 307, "redirect status");
  assert.equal(response.headers.get("location"), location, "redirect location");
}
async function expectDenied(base, headers, subject) {
  const cases = [
    ["GET", "/api/exams/"+EXAM_ID],
    ["GET", "/api/exam-sessions?examId="+EXAM_ID],
    ["POST", "/api/exam-sessions"],
    ["PATCH", "/api/exam-sessions"],
    ["POST", "/api/grade"],
  ];
  for(const [method,route] of cases) {
    const response = await request(base,route,{
      method,headers,
      body:method==="GET" ? undefined : {
        examId:EXAM_ID, sessionId:"invalid", action:"start-section", sectionIndex:0,
      }
    });
    assert.equal(response.status,401,subject+" "+method+" "+route+" must deny access");
  }
  return cases.length;
}
export async function verifyExamAccess(base,{expectedSha}={}) {
  assert.match(base,/^https?:\/\//,"BASE_URL must be absolute");
  const rel=await request(base,"/api/release");
  assert.equal(rel.status,200,"release health endpoint");
  const receipt=await rel.json();
  assert.equal(receipt.ok,true,"release health");
  if(expectedSha) {
    assert.equal(receipt.deployedSha,expectedSha,"release SHA");
    assert.equal(receipt.gitSha,expectedSha,"source SHA");
  }
  assert.equal((await request(base,"/competitions")).status,200,"public catalogue");
  expectRedirect(await request(base,"/arithmetic"),"/api/auth/guest/start?next=/arithmetic");
  const anonymousExam=await request(base,"/exam/"+EXAM_ID);
  expectRedirect(anonymousExam,LOGIN_TARGET);
  assert.equal(anonymousExam.headers.get("set-cookie"),null,"anonymous exam must not issue cookie");
  const anonymousDenied=await expectDenied(base,{},"anonymous");

  const unsafeBootstrap=await request(base,"/api/auth/guest/start?next="+encodeURIComponent("/exam/"+EXAM_ID));
  expectRedirect(unsafeBootstrap,LOGIN_TARGET);
  assert.equal(unsafeBootstrap.headers.get("set-cookie"),null,"exam bootstrap must not issue token");

  const bootstrap=await request(base,"/api/auth/guest/start?next=%2Farithmetic");
  expectRedirect(bootstrap,"/arithmetic");
  const cookie=bootstrap.headers.get("set-cookie")?.split(";")[0]||"";
  assert.ok(cookie.startsWith("kangaroo_session="),"basic arithmetic guest session");
  expectRedirect(await request(base,"/exam/"+EXAM_ID,{headers:{cookie}}),LOGIN_TARGET);
  const webGuestDenied=await expectDenied(base,{cookie},"signed web guest");

  const miniappResponse=await request(base,"/api/auth/miniapp/guest",{method:"POST"});
  assert.equal(miniappResponse.status,200,"miniapp guest bootstrap");
  const miniappIdentity=await miniappResponse.json();
  assert.ok(typeof miniappIdentity.accessToken==="string"&&miniappIdentity.accessToken.length>20);
  const miniappHeaders={authorization:"Bearer "+miniappIdentity.accessToken};
  const miniappGuestDenied=await expectDenied(base,miniappHeaders,"signed miniapp guest");
  assert.equal((await request(base,"/api/miniapp/exams",{headers:miniappHeaders})).status,200,"miniapp catalogue");

  return {sha:receipt.deployedSha, anonymousDenied,webGuestDenied,miniappGuestDenied,
    catalogues:"ok",arithmetic:"ok"};
}
async function main() {
  const base=(process.env.BASE_URL||"").trim();
  assert.ok(base,"BASE_URL required; refusing an implicit production default");
  const result=await verifyExamAccess(base,{expectedSha:process.env.EXPECTED_SHA||undefined});
  console.log("EXAM_ACCESS_LIVE=PASS",JSON.stringify(result));
}
if(process.argv[1] && import.meta.url===new URL("file://"+process.argv[1]).href) {
  main().catch(err=>{
    console.error("EXAM_ACCESS_LIVE=FAIL",err instanceof Error?err.message:String(err));
    process.exitCode=1;
  });
}
