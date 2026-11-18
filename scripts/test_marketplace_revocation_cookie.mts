import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {configureSyntheticMarketplaceRights} from "./marketplace_synthetic_rights_qa";

const base=fs.mkdtempSync(path.join(os.tmpdir(),"socthink-revoke-cookie-"));
process.env.SOCTHINK_MARKETPLACE_EXAM_MODE="1";
process.env.SOCTHINK_MARKETPLACE_PUBLIC_ORIGIN="http://127.0.0.1:18742";
process.env.SOCTHINK_MARKETPLACE_HANDOFF_SECRET=crypto.randomBytes(32).toString("hex");
const QA_EXAM="amc8-original-qa-revoke";
const qaPath=path.join(process.cwd(),"private","exams",QA_EXAM+".json");
const fixture=JSON.parse(fs.readFileSync(path.join(process.cwd(),"tests","fixtures","marketplace-amc8-original-qa.json"),"utf8"));
fixture.profile.id=QA_EXAM;
fs.mkdirSync(path.dirname(qaPath),{recursive:true});
fs.writeFileSync(qaPath,JSON.stringify(fixture),{flag:"wx",mode:0o600});
configureSyntheticMarketplaceRights(QA_EXAM,qaPath,base);
process.env.SOCTHINK_MARKETPLACE_AMC8_EXAM_ID=QA_EXAM;
process.env.SOCTHINK_MARKETPLACE_DATA_DIR=path.join(base,"claims");
process.env.SOCTHINK_USER_DATA_DIR=path.join(base,"user");
const {signMarketplaceTicket,redeemMarketplaceTicket,marketplaceUserFromCookie,marketplaceAuthorizedExam}=
  await import("../src/lib/marketplace-entitlement");

let passed=0;
const ok=(name:string,condition:boolean)=>{assert.ok(condition,name);passed++;console.log("PASS",name)};
try{
  const job="job_revocation_test_20261118_001";
  const exam=QA_EXAM;
  const ticket=signMarketplaceTicket({v:1,job,sku:"EDU-001",kind:"EXAM_REPORT_ONCE",
    examId:exam,exp:Math.floor(Date.now()/1000)+300},
    process.env.SOCTHINK_MARKETPLACE_HANDOFF_SECRET);
  const grant=redeemMarketplaceTicket(ticket);
  const buyer=marketplaceUserFromCookie(grant.cookie);
  ok("legitimate buyer session exists before revocation",Boolean(buyer));
  ok("buyer has right to the purchased exam",!!buyer && marketplaceAuthorizedExam(buyer.id,exam));
  const hash=crypto.createHash("sha256").update(job+"|EDU-001|"+exam).digest("hex");
  const dir=path.join(base,"claims","revocations");
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,hash+".json"),JSON.stringify({jobHash:hash,reason:"ADMIN_REVOKED",revokedAt:Date.now()}));
  ok("already issued cookie invalidated after tombstone",marketplaceUserFromCookie(grant.cookie)===null);
  ok("old student identity loses report and exam access",!!buyer&&!marketplaceAuthorizedExam(buyer.id,exam));
  ok("other browser cookie cannot gain old session",marketplaceUserFromCookie(hash+"."+"c".repeat(64))===null);
  ok("claim page sees existing revocation",(await import("../src/lib/marketplace-entitlement")).marketplaceTicketRevoked(ticket));
  const independent=signMarketplaceTicket({v:1,job:"job_other_buyer_20261118_001",sku:"EDU-001",kind:"EXAM_REPORT_ONCE",examId:exam,exp:Math.floor(Date.now()/1000)+300},process.env.SOCTHINK_MARKETPLACE_HANDOFF_SECRET);
  const grant2=redeemMarketplaceTicket(independent);
  ok("another buyer remains authorized after unrelated cancellation",Boolean(marketplaceUserFromCookie(grant2.cookie)));
  console.log("MARKETPLACE_REVOKED_COOKIE="+passed+"/"+passed+" PASS");
}finally{fs.rmSync(base,{recursive:true,force:true});fs.rmSync(qaPath,{force:true})}
