import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {marketplaceCommercialRightsReady,marketplacePaidExamReady}
  from "../src/lib/marketplace-commercial-rights";
import {marketplaceOperatorApprovalVerified} from "../src/lib/marketplace-rights-review";
import {configureSyntheticMarketplaceRights} from "./marketplace_synthetic_rights_qa";
import type {ExamBundle} from "../src/lib/types";

const base=fs.mkdtempSync(path.join(os.tmpdir(),"amc8-rights-negative-"));
process.env.SOCTHINK_MARKETPLACE_PUBLIC_ORIGIN="http://127.0.0.1:18742";
const id="amc8-original-qa-rightsgate";
const source=path.join(process.cwd(),"tests/fixtures/marketplace-amc8-original-qa.json");
const original=JSON.parse(fs.readFileSync(source,"utf8"));
original.profile.id=id;
const file=path.join(process.cwd(),"private","exams",id+".json");
fs.mkdirSync(path.dirname(file),{recursive:true});
fs.writeFileSync(file,JSON.stringify(original),{flag:"wx",mode:0o600});
const bundle=original as ExamBundle;
let count=0;
const check=(name:string,fn:()=>void)=>{fn();count++;console.log("PASS",name)};
try {
  check("synthetic paper metadata can pass standalone declaration",()=>
    assert.equal(marketplaceCommercialRightsReady(bundle),true));
  check("metadata alone cannot authorize paid exam",()=>
    assert.equal(marketplacePaidExamReady(id),false));
  configureSyntheticMarketplaceRights(id,file,base);
  const dir=process.env.SOCTHINK_MARKETPLACE_RIGHTS_REVIEW_DIR!;
  const receiptFile=path.join(dir,id+".json");
  const originalReceipt=fs.readFileSync(receiptFile);
  const originalExam=fs.readFileSync(file);
  check("independent signed operator review unlocks QA-only exam",()=>{
    assert.equal(marketplaceOperatorApprovalVerified(bundle),true);
    assert.equal(marketplacePaidExamReady(id),true);
  });
  check("changing a single byte invalidates original content hash",()=>{
    fs.appendFileSync(file," ");
    assert.equal(marketplacePaidExamReady(id),false);
    fs.writeFileSync(file,originalExam);
  });
  check("wrong signature never authorizes payment",()=>{
    const x=JSON.parse(originalReceipt.toString());x.signature=crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(receiptFile,JSON.stringify(x));
    assert.equal(marketplacePaidExamReady(id),false);
    fs.writeFileSync(receiptFile,originalReceipt);
  });
  check("different declared license fails even with valid signature",()=>{
    const x=JSON.parse(originalReceipt.toString());x.license="not-licensed";
    fs.writeFileSync(receiptFile,JSON.stringify(x));
    assert.equal(marketplacePaidExamReady(id),false);
    fs.writeFileSync(receiptFile,originalReceipt);
  });
  check("world-readable review file is rejected",()=>{
    fs.chmodSync(receiptFile,0o644);
    assert.equal(marketplacePaidExamReady(id),false);
    fs.chmodSync(receiptFile,0o600);
  });
  check("public review directory is rejected",()=>{
    fs.chmodSync(dir,0o755);
    assert.equal(marketplacePaidExamReady(id),false);
    fs.chmodSync(dir,0o700);
  });
  check("QA paper cannot be sold on a public HTTPS store",()=>{
    const old=process.env.SOCTHINK_MARKETPLACE_PUBLIC_ORIGIN;
    process.env.SOCTHINK_MARKETPLACE_PUBLIC_ORIGIN="https://exam-sales.example.com";
    assert.equal(marketplacePaidExamReady(id),false);
    process.env.SOCTHINK_MARKETPLACE_PUBLIC_ORIGIN=old;
  });
  check("wrong signing secret rejects previously signed review",()=>{
    const old=process.env.SOCTHINK_MARKETPLACE_RIGHTS_REVIEW_SECRET;
    process.env.SOCTHINK_MARKETPLACE_RIGHTS_REVIEW_SECRET=crypto.randomBytes(32).toString("hex");
    assert.equal(marketplacePaidExamReady(id),false);
    process.env.SOCTHINK_MARKETPLACE_RIGHTS_REVIEW_SECRET=old;
  });
  check("missing review config blocks paid access",()=>{
    const old=process.env.SOCTHINK_MARKETPLACE_RIGHTS_REVIEW_DIR;
    delete process.env.SOCTHINK_MARKETPLACE_RIGHTS_REVIEW_DIR;
    assert.equal(marketplacePaidExamReady(id),false);
    process.env.SOCTHINK_MARKETPLACE_RIGHTS_REVIEW_DIR=old;
  });
  check("symlink receipt denied",()=>{
    fs.unlinkSync(receiptFile);
    const destination=path.join(base,"outside.json");
    fs.writeFileSync(destination,originalReceipt);
    fs.symlinkSync(destination,receiptFile);
    assert.equal(marketplacePaidExamReady(id),false);
    fs.unlinkSync(receiptFile);
    fs.writeFileSync(receiptFile,originalReceipt,{mode:0o600});
  });
  check("a different QA paper id cannot reuse someone else's review",()=>{
    const x=JSON.parse(JSON.stringify(bundle)) as ExamBundle;
    x.profile.id="amc8-original-qa-another";
    assert.equal(marketplaceOperatorApprovalVerified(x),false);
  });
  check("historical commercialUse false remains denied",()=>{
    const old=JSON.parse(JSON.stringify(bundle)) as ExamBundle;
    old.profile.rightsPolicy={rightsClass:"educational-share",
      license:null,commercialUse:false,publicQuestionDisplay:false};
    assert.equal(marketplaceCommercialRightsReady(old),false);
  });
  check("not present or not explicitly licensed old archive cannot sell",()=>{
    assert.equal(marketplacePaidExamReady("maa-amc8-2024-user-owned"),false);
  });
  check("deleted review immediately deauthorizes already-signed QA",()=>{
    fs.unlinkSync(receiptFile);
    assert.equal(marketplacePaidExamReady(id),false);
  });
  console.log("COMMERCIAL_RIGHTS_GATE="+count+"/"+count+" PASS");
}finally {
  fs.rmSync(file,{force:true});
  fs.rmSync(base,{recursive:true,force:true});
}
