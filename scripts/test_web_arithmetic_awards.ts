import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { finalizeAttempt, type ArithmeticSession } from "../src/lib/arithmetic-analytics";

async function run(){
  const original=process.cwd();
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"kangaroo-awards-"));
  process.env.SOCTHINK_USER_DATA_DIR=path.join(temp,"users");
  process.chdir(temp);
  try{
    const {issueWebArithmeticTicket,verifyWebArithmeticSubmission}=await import("../src/lib/web-arithmetic-awards");
    const issued=issueWebArithmeticTicket("s1",2,"diagnostic",12345,[]);
    assert.equal(issued.items.length,20);
    const session:ArithmeticSession={
      id:"arith-s1-g2-12345-diagnostic",studentId:"s1",grade:2,mode:"diagnostic",
      startedAt:0,finishedAt:0,
      attempts:issued.items.map(item=>finalizeAttempt(item,String(item.answer),{presentedAt:0,firstInputAt:500,submittedAt:900,edits:0,backspaces:0})),
    };
    const verified=verifyWebArithmeticSubmission("s1",issued.token,session);
    assert.equal(verified.rewardVerified,true);
    assert.equal(verified.expectedQuestionCount,20);
    assert.equal(verified.startedAt>0,true);
    assert(verified.attempts.every(a=>a.correct));
    assert.notEqual(verified.finishedAt,0);
    assert.throws(()=>verifyWebArithmeticSubmission("other",issued.token,session),/凭证/);
    assert.throws(()=>verifyWebArithmeticSubmission("s1",issued.token,{...session,id:"arith-s1-g2-55-diagnostic"}),/不匹配/);
    assert.throws(()=>verifyWebArithmeticSubmission("s1",issued.token,{...session,attempts:session.attempts.slice(1)}),/题量/);
    assert.throws(()=>verifyWebArithmeticSubmission("s1",issued.token,{...session,attempts:[...session.attempts.slice(0,-1),session.attempts[0]]}),/重复题号/);
    const fake=session.attempts.map((a,i)=>i===0?{...a,item:{...a.item,answer:999999}}:a);
    assert.throws(()=>verifyWebArithmeticSubmission("s1",issued.token,{...session,attempts:fake}),/下发内容/);
    const answersTampered=session.attempts.map((a,i)=>i===0?{...a,answer:"INCORRECT",correct:true}:a);
    const checked=verifyWebArithmeticSubmission("s1",issued.token,{...session,attempts:answersTampered});
    assert.equal(checked.attempts[0].correct,false,"the server, not the browser, must grade submitted answers");
    assert.equal(checked.attempts[1].correct,true);
    const num=issued.items[0];
    assert.throws(()=>verifyWebArithmeticSubmission("s1",issued.token,{...session,attempts:[{...session.attempts[0],item:{...num,id:"forged"}} ,...session.attempts.slice(1)]}),/下发内容/);
    const future=Date.now;
    try{Date.now=()=>future()+5*3600*1000;assert.throws(()=>verifyWebArithmeticSubmission("s1",issued.token,session),/过期/);}
    finally{Date.now=future;}

    const adaptive=issueWebArithmeticTicket("s1",2,"adaptive",87878,[]);
    const adaptiveSession:ArithmeticSession={
      id:"arith-s1-g2-87878-adaptive",studentId:"s1",grade:2,mode:"adaptive",
      startedAt:0,finishedAt:0,
      attempts:adaptive.items.map(item=>finalizeAttempt(item,String(item.answer),{presentedAt:0,firstInputAt:400,submittedAt:650,edits:0,backspaces:0})),
    };
    assert.equal(verifyWebArithmeticSubmission("s1",adaptive.token,adaptiveSession).attempts.length,adaptive.items.length);
    assert.throws(()=>issueWebArithmeticTicket("s1",99,"diagnostic",100,[]),/参数/);
    assert.throws(()=>issueWebArithmeticTicket("s1",2,"diagnostic",-1,[]),/参数/);
    assert.throws(()=>issueWebArithmeticTicket("s1",2,"invalid",100,[]),/参数/);
    assert.throws(()=>verifyWebArithmeticSubmission("s1",issued.token,{...session,attempts:session.attempts.map((a,i)=>i===0?{...a,responseMs:Number.NaN}:a)}),/时长/);

    console.log("WEB_ARITHMETIC_AWARDS=PASS signed_ticket=true server_grading=true replay_input_guard=true cross_user_denied=true expiry=true");
  }finally{
    process.chdir(original);
    fs.rmSync(temp,{recursive:true,force:true});
  }
}
run().catch(e=>{console.error(e);process.exitCode=1});
