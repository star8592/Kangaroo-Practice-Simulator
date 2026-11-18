import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {configureSyntheticMarketplaceRights} from "./marketplace_synthetic_rights_qa";
import {
  signMarketplaceTicket,verifyMarketplaceTicket,redeemMarketplaceTicket,
  marketplaceUserFromCookie,marketplaceAuthorizedExam
} from "../src/lib/marketplace-entitlement";

const dir=fs.mkdtempSync(path.join(os.tmpdir(),"socthink-marketplace-qa-"));
const isolated=path.join(dir,"market");
const users=path.join(dir,"users");
process.env.SOCTHINK_MARKETPLACE_EXAM_MODE="1";
process.env.SOCTHINK_MARKETPLACE_PUBLIC_ORIGIN="http://127.0.0.1:18742";
process.env.SOCTHINK_MARKETPLACE_HANDOFF_SECRET="test_only_64_char_secret_is_not_a_production_credential_replace_me";
const QA_EXAM="amc8-original-qa-entitlement";
const qaPath=path.join(process.cwd(),"private","exams",QA_EXAM+".json");
const fixture=JSON.parse(fs.readFileSync(path.join(process.cwd(),"tests","fixtures","marketplace-amc8-original-qa.json"),"utf8"));
fixture.profile.id=QA_EXAM;
fs.mkdirSync(path.dirname(qaPath),{recursive:true});
fs.writeFileSync(qaPath,JSON.stringify(fixture),{flag:"wx",mode:0o600});
configureSyntheticMarketplaceRights(QA_EXAM,qaPath,dir);
process.env.SOCTHINK_MARKETPLACE_AMC8_EXAM_ID=QA_EXAM;
process.env.SOCTHINK_MARKETPLACE_DATA_DIR=isolated;
process.env.SOCTHINK_USER_DATA_DIR=users;
const now=Math.floor(Date.now()/1000);
const sample={v:1 as const,job:"job_20261118_12345678",sku:"EDU-001" as const,kind:"EXAM_REPORT_ONCE" as const,examId:QA_EXAM,exp:now+600};
let passed=0;
function works(name:string,fn:()=>void){try{fn();passed++;process.stdout.write("PASS "+name+"\n")}catch(e){process.stdout.write("FAIL "+name+"\n");throw e}}
try{
 const ticket=signMarketplaceTicket(sample,process.env.SOCTHINK_MARKETPLACE_HANDOFF_SECRET);
 works("valid license handoff ticket",()=>assert.equal(verifyMarketplaceTicket(ticket).job,sample.job));
 works("tampering rejected",()=>assert.throws(()=>verifyMarketplaceTicket(ticket.replace(/.$/,"0"))));
 works("wrong issuer rejected",()=>assert.throws(()=>verifyMarketplaceTicket(signMarketplaceTicket(sample,"unauthorized-signing-key"))));
 works("expired ticket rejected",()=>assert.throws(()=>verifyMarketplaceTicket(signMarketplaceTicket({...sample,exp:now-1},process.env.SOCTHINK_MARKETPLACE_HANDOFF_SECRET!))));
 works("other exam forbidden",()=>assert.throws(()=>verifyMarketplaceTicket(signMarketplaceTicket({...sample,examId:"other-exam"},process.env.SOCTHINK_MARKETPLACE_HANDOFF_SECRET!))));
 const issued=redeemMarketplaceTicket(ticket);
 works("one first claim",()=>assert.equal(issued.resumed,false));
 works("claim-bound login",()=>assert.equal(marketplaceUserFromCookie(issued.cookie)?.role,"student"));
 works("second device cannot take over",()=>assert.throws(()=>redeemMarketplaceTicket(ticket)));
 works("same browser resumes existing claim",()=>assert.equal(redeemMarketplaceTicket(ticket,issued.cookie).resumed,true));
 const user=marketplaceUserFromCookie(issued.cookie)!;
 works("authorized original exam",()=>assert.equal(marketplaceAuthorizedExam(user.id,sample.examId),true));
 works("other exam denied",()=>assert.equal(marketplaceAuthorizedExam(user.id,"other-exam"),false));
 works("forged browser cookie denied",()=>assert.equal(marketplaceUserFromCookie(issued.cookie.slice(0,-2)+"aa"),null));
 works("grants stored only in isolated dir",()=>assert.equal(fs.readdirSync(path.join(isolated,"grants")).length,1));
 works("main instance never accepts market cookie",()=>{
    process.env.SOCTHINK_MARKETPLACE_EXAM_MODE="0";
    assert.equal(marketplaceUserFromCookie(issued.cookie),null);
    process.env.SOCTHINK_MARKETPLACE_EXAM_MODE="1";
 });
 works("shared data directory rejected",()=>{
    process.env.SOCTHINK_USER_DATA_DIR=isolated;
    assert.throws(()=>verifyMarketplaceTicket(ticket),/DATA_NOT_ISOLATED/);
    process.env.SOCTHINK_USER_DATA_DIR=users;
 });
 console.log("RESULT "+passed+"/"+passed+" passed");
}finally{
 fs.rmSync(dir,{recursive:true,force:true});
 fs.rmSync(qaPath,{force:true});
}
