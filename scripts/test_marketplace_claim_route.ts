import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {NextRequest} from "next/server";
import {POST} from "../src/app/api/marketplace/claim/route";
import {signMarketplaceTicket} from "../src/lib/marketplace-entitlement";

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"marketplace-http-"));
process.env.SOCTHINK_MARKETPLACE_EXAM_MODE="1";
process.env.SOCTHINK_MARKETPLACE_HANDOFF_SECRET="test_very_long_hmac_secret_never_use_for_real_buyers_123456789";
process.env.SOCTHINK_MARKETPLACE_AMC8_EXAM_ID="test-amc8";
process.env.SOCTHINK_MARKETPLACE_DATA_DIR=path.join(temp,"grants-root");
process.env.SOCTHINK_USER_DATA_DIR=path.join(temp,"users");
process.env.SOCTHINK_MARKETPLACE_PUBLIC_ORIGIN="http://localhost:4321";
const ticket=signMarketplaceTicket({v:1,job:"job_20261118_abcdef01",sku:"EDU-001",kind:"EXAM_REPORT_ONCE",examId:"test-amc8",exp:Math.floor(Date.now()/1000)+300},process.env.SOCTHINK_MARKETPLACE_HANDOFF_SECRET);
const request=(ticket:string,origin="http://localhost:4321",cookie="")=>new NextRequest("http://localhost:4321/api/marketplace/claim",{
 method:"POST",headers:{"origin":origin,"content-type":"application/x-www-form-urlencoded",...(cookie?{cookie}:{} )},
 body:new URLSearchParams({ticket}).toString()
});
async function main(){
try{
 const cors=await POST(request(ticket,"https://evil.example"));
 assert.equal(cors.status,403); console.log("PASS origin restricted");
 const success=await POST(request(ticket));
 assert.equal(success.status,303);
 assert.equal(success.headers.get("location"),"http://localhost:4321/exam/test-amc8");
 const setCookie=success.headers.get("set-cookie")||"";
 assert.match(setCookie,/socthink_marketplace_session=/);
 assert.match(setCookie,/httponly/i);
 assert.match(setCookie,/samesite=lax/i);
 console.log("PASS verified claim sets isolated HttpOnly session and redirects to existing ExamClient route");
 const claimed=await POST(request(ticket));
 assert.equal(claimed.status,409);console.log("PASS second browser denied");
 const resume=await POST(request(ticket,undefined,setCookie.split(";")[0]));
 assert.equal(resume.status,303);console.log("PASS same browser resume");
 const bad=await POST(request(ticket.slice(0,-1)+"0"));
 assert.equal(bad.status,400);console.log("PASS forged ticket rejected");
 console.log("RESULT 5/5 passed");
}finally{fs.rmSync(temp,{recursive:true,force:true})}

}
void main().catch(e=>{console.error(e);process.exitCode=1});
