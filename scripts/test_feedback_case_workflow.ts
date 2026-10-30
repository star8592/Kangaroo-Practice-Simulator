import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseFeedbackInput,saveCustomerFeedback } from "../src/lib/customer-feedback";
import { CaseTransitionError,feedbackExists,readCaseStates,updateFeedbackCase } from "../src/lib/customer-feedback-workflow";

const root=fs.mkdtempSync(path.join(os.tmpdir(),"socthink-feedback-workflow-"));
const reviewerId="adm_1234567890abcdef";
const key=["fixture","case",Date.now()].join("_");
const input=parseFeedbackInput({
  attemptId:"att_1234567890abcdef",examId:"maa-amc8-2026",questionId:"question1",
  category:"question_error",message:"题目步骤有误",source:"review",idempotencyKey:key,
});
try{
  const saved=saveCustomerFeedback("fake_user_1",input,{root:path.join(root,"customer-feedback")});
  const id=saved.id;
  assert.equal(feedbackExists(id,root),true);
  assert.equal(feedbackExists("../illegal",root),false);
  assert.equal(readCaseStates(root).size,0);
  const update=(fromVersion:number,to:"investigating"|"resolved"|"verified"|"closed"|"dismissed",
    note:string,evidenceRef?:string)=>updateFeedbackCase({
      feedbackId:id,expectedVersion:fromVersion,to,note,evidenceRef,reviewerId,
    },{root});
  assert.throws(()=>update(0,"resolved","不经过核查直接标记为解决", "review:test01"),(x:unknown)=>
    x instanceof CaseTransitionError && x.status===409);
  assert.throws(()=>update(0,"investigating","短"),(x:unknown)=>
    x instanceof CaseTransitionError && x.status===400);
  const one=update(0,"investigating","已经开始核查具体题目和解法");
  assert.equal(one.status,"investigating");
  assert.equal(one.version,1);
  assert.throws(()=>update(0,"resolved","证据齐全已修改正确","commit:abcabcabc"),(x:unknown)=>
    x instanceof CaseTransitionError && x.status===409);
  assert.throws(()=>update(1,"resolved","处理依据不足"),(x:unknown)=>
    x instanceof CaseTransitionError && x.status===400);
  const two=update(1,"resolved","根据原卷核对后修复计算错误", "commit:123456789abcdef");
  assert.equal(two.status,"resolved");
  const three=update(2,"verified","桌面和手机复测通过","test:run-2026-10-30");
  assert.equal(three.version,3);
  const four=update(3,"closed","已归档且修复记录齐全","release:2026-10-30");
  assert.equal(four.status,"closed");
  assert.equal(readCaseStates(root).get(id)?.version,4);
  const reopen=update(4,"investigating","用户再次报告回归问题需要复核");
  assert.equal(reopen.status,"investigating");
  assert.throws(()=>updateFeedbackCase({
    feedbackId:"0".repeat(32),expectedVersion:0,to:"investigating",
    note:"伪造一个不存在的反馈记录",reviewerId,
  },{root}),(x:unknown)=>x instanceof CaseTransitionError&&x.status===404);
  const raw=fs.readFileSync(path.join(root,"customer-feedback-case-events.jsonl"),"utf8");
  assert.equal(raw.trim().split("\n").length,5);
  assert(!raw.includes("fake_user_1"));
  assert.equal(JSON.parse(raw.split("\n")[0]).from,"open");
  assert.equal(JSON.parse(raw.trim().split("\n").at(-1)!).to,"investigating");
  assert.equal(fs.readFileSync(path.join(root,"customer-feedback",fs.readdirSync(path.join(root,"customer-feedback"))[0],
    fs.readdirSync(path.join(root,"customer-feedback",fs.readdirSync(path.join(root,"customer-feedback"))[0]))[0],id+".json"),"utf8").includes("题目步骤有误"),true);
  console.log("CUSTOMER_CASE_WORKFLOW=PASS lifecycle+immutable_feedback+version_conflict+evidence+unknown_id+audit");
}finally{fs.rmSync(root,{recursive:true,force:true})}
