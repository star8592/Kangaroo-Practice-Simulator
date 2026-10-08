import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { PublicStudent } from "../src/lib/auth";

async function main(){
const original = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "socthink-miniapp-idempotent-"));
process.env.SOCTHINK_USER_DATA_DIR = path.join(temp, "private", "users");
process.chdir(temp);
try {
  const {startMiniappArithmetic, checkMiniappArithmetic, finishMiniappArithmetic} =
    await import("../src/lib/miniapp-arithmetic");
  const user = {id: "stu_miniaudit001", role:"student", name:"Synthetic",
    username:"mini_arith_fixture",candidateNo:"MAFIX001",grade:1} as PublicStudent;
  // Two devices can start in the same millisecond: distinct seeds prevent
  // accidental ticket reuse, even if they choose the same grade and mode.
  const realNow=Date.now;
  let pair;
  try {
    Date.now=()=>1788888888888;
    pair=[startMiniappArithmetic(user,1,"adaptive"),startMiniappArithmetic(user,1,"adaptive")];
  } finally { Date.now=realNow; }
  assert.notEqual(pair[0].token,pair[1].token,"same-ms sessions must be distinct");
  const started = startMiniappArithmetic(user,1,"diagnostic");
  assert.equal(started.questions.length,20);
  assert.equal("answer" in started.questions[0],false);
  const answer = checkMiniappArithmetic(user, started.token,0,"0",{responseMs:1200,firstInputMs:500});
  const responses = [{
    questionId:started.questions[0].id,answer:answer.correctAnswer,
    responseMs:1200,firstInputMs:500,edits:0,backspaces:0,
  }];
  const first = finishMiniappArithmetic(user,started.token,responses);
  assert.equal(first.ok,true);
  assert.equal(first.total,1);
  const second=finishMiniappArithmetic(user,started.token,responses);
  assert.deepEqual(second,first,"a repeated finish must return the original score/plan");
  const file=path.join(temp,"private","arithmetic","sessions.jsonl");
  const rows=()=>fs.readFileSync(file,"utf8").trim().split("\n").map(x=>JSON.parse(x));
  assert.equal(rows().length,1,"same signed ticket must be persisted exactly once");
  assert.throws(()=>finishMiniappArithmetic(user,started.token,[{
    ...responses[0],answer:"different-answer",
  }]),/已经提交/,"a replay must not overwrite previous answers");
  assert.equal(rows().length,1,"rejected mutation must not add a training record");
  assert.throws(()=>finishMiniappArithmetic({...user,id:"other-student"},started.token,responses),/失效/);

  await new Promise(resolve=>setTimeout(resolve,5));
  const next=startMiniappArithmetic(user,1,"adaptive");
  const nextRows=[{questionId:next.questions[0].id,answer:"1",responseMs:1500,
    firstInputMs:450,edits:0,backspaces:0}];
  // Simulate a second server worker holding the atomic per-session lock.
  const id = JSON.parse(Buffer.from(next.token.split(".")[0],"base64url").toString("utf8"));
  assert.equal(id.uid,user.id);
  const crypto = await import("node:crypto");
  const sessionId=`arith-${user.id}-g${id.grade}-${id.seed}-${id.mode}`;
  const lockRoot=path.join(temp,"private","arithmetic",".finish-locks");
  const lockPath=path.join(lockRoot,crypto.createHash("sha256").update(sessionId).digest("hex"));
  fs.mkdirSync(lockPath,{recursive:true});
  assert.throws(()=>finishMiniappArithmetic(user,next.token,nextRows),/正在保存/);
  assert.equal(rows().length,1,"a locked session cannot be written twice");
  // Old abandoned locks are self-healing rather than blocking a child forever.
  const staleTime=new Date(Date.now()-11*60*1000);
  fs.utimesSync(lockPath,staleTime,staleTime);
  finishMiniappArithmetic(user,next.token,nextRows);
  assert.equal(rows().length,2,"after lock release the session completes once");
  finishMiniappArithmetic(user,next.token,nextRows);
  assert.equal(rows().length,2);
  // Compile-time is not enough: guard repeated taps and provide recovery UI.
  const main = fs.readFileSync(path.join(original,"apps/miniapp/src/pages/arithmetic/index.tsx"),"utf8");
  assert.match(main,/inFlight\.current/,"double taps must be guarded synchronously");
  assert.match(main,/disabled=\{busy\|\|!raw\.trim\(\)\}/,"submit must disable while checking");
  assert.match(main,/disabled=\{busy\|\|Boolean\(feedback\)\}/,"answer input must freeze after grading");
  assert.match(main,/保存失败，点击完成本轮可重试/);
  const review = fs.readFileSync(path.join(original,"apps/miniapp/src/pages/review/index.tsx"),"utf8");
  assert.match(review,/重新加载复盘/);
  assert.match(review,/setError\(e instanceof Error/);
  console.log("MINIAPP_ARITHMETIC_IDEMPOTENCY=PASS retry_exact=true mutation_denied=true concurrent_lock=true isolated_store=true");
} finally {
  process.chdir(original);
  fs.rmSync(temp,{recursive:true,force:true});
}

}
main().catch(error=>{console.error("MINIAPP_ARITHMETIC_IDEMPOTENCY=FAIL",error);process.exitCode=1});
