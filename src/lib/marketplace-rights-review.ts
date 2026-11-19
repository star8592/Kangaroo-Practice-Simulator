import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type {ExamBundle} from "./types";

type CommercialReceipt = {
  v:1;
  examId:string;
  contentSha256:string;
  license:string;
  approvedAt:number;
  reviewer:string;
  signature:string;
};
const HEX64=/^[a-f0-9]{64}$/;
const EXAM_ID=/^[A-Za-z0-9_-]{8,100}$/;
const RECEIPT_REVIEWER=/^[a-zA-Z0-9_-]{3,80}$/;
const policy=(bundle:ExamBundle)=>bundle.profile.rightsPolicy;

function safeEqualHex(a:string,b:string):boolean {
  if(!HEX64.test(a)||!HEX64.test(b))return false;
  return crypto.timingSafeEqual(Buffer.from(a,"hex"),Buffer.from(b,"hex"));
}

/** A self-declared rightsPolicy is never sufficient to sell a paper.
 * Each exact private exam file needs a distinct, HMAC-signed operator review.
 * Receipts are issued only after checking third-party license or authorship.
 * No public route/signing endpoint exists in this module.
 */
export function marketplaceOperatorApprovalVerified(bundle:ExamBundle):boolean {
  const examId=bundle.profile.id;
  if(!EXAM_ID.test(examId))return false;
  const secret=process.env.SOCTHINK_MARKETPLACE_RIGHTS_REVIEW_SECRET||"";
  const dir=process.env.SOCTHINK_MARKETPLACE_RIGHTS_REVIEW_DIR||"";
  if(secret.length<32||!path.isAbsolute(dir))return false;
  try {
    const dirInfo=fs.lstatSync(dir);
    if(!dirInfo.isDirectory()||dirInfo.isSymbolicLink()||(dirInfo.mode&0o077)!==0)
      return false;
    const parent=path.join(process.cwd(),"private","exams");
    const examFile=path.join(parent,examId+".json");
    const receiptFile=path.join(dir,examId+".json");
    const examInfo=fs.lstatSync(examFile);
    const receiptInfo=fs.lstatSync(receiptFile);
    if(!examInfo.isFile()||examInfo.isSymbolicLink()||
       !receiptInfo.isFile()||receiptInfo.isSymbolicLink()||
       (receiptInfo.mode&0o077)!==0||receiptInfo.size>4096)
      return false;
    const contentSha256=crypto.createHash("sha256").update(fs.readFileSync(examFile)).digest("hex");
    const r=JSON.parse(fs.readFileSync(receiptFile,"utf8")) as CommercialReceipt;
    const p=policy(bundle);
    const now=Date.now();
    if(r?.v!==1||r.examId!==examId||!HEX64.test(r.contentSha256)||
      r.contentSha256!==contentSha256||
      !p||p.commercialUse!==true||
      typeof p.license!=="string"||r.license!==p.license||
      !RECEIPT_REVIEWER.test(r.reviewer)||
      !Number.isSafeInteger(r.approvedAt)||r.approvedAt<Date.UTC(2026,0,1)||
      r.approvedAt>now+300_000)
      return false;
    const payload=["v1",r.examId,r.contentSha256,r.license,String(r.approvedAt),r.reviewer].join("|");
    const expected=crypto.createHmac("sha256",secret).update(payload).digest("hex");
    return safeEqualHex(r.signature,expected);
  }catch{return false}
}
