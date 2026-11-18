import crypto from "node:crypto";
import type {ExamBundle} from "./types";
import {isExamBundleTrainingReady} from "./training-question-bank";
import {marketplaceExamAssetsReady} from "./marketplace-exam-assets";
import {marketplaceCommercialRightsReady} from "./marketplace-commercial-rights";
import {marketplaceOperatorApprovalVerified} from "./marketplace-rights-review";

/** No buyer entitlement is issued here: monthly is still NOT LIVE. */
export const AMC8_MONTHLY_SKU = "EDU-002";
export const AMC8_MONTHLY_KIND = "AMC8_MONTH";
export const AMC8_MONTHLY_TERM_DAYS = 30;
/** 1999–2026 official AMC 8 series; 2021 had no sitting.
 * 1985–1998 are predecessor AJHSME and must be separately labeled.
 * This is a target catalogue, not a claim that we already licensed the content.
 */
export const AMC8_OFFICIAL_ARCHIVE_YEARS:readonly number[] =
  Object.freeze(Array.from({length:2026-1999+1},(_,i)=>1999+i).filter(y=>y!==2021));
export const AMC8_MONTHLY_MIN_PAPERS=AMC8_OFFICIAL_ARCHIVE_YEARS.length;

export type MonthlyPaper = {
  examId:string;
  rightsApproved:boolean;
  deliveryVerified:boolean;
};

export type MonthlyReadiness = {
  ready:boolean;
  code: "READY"|"PAPERS_MISSING"|"DUPLICATE_PAPER"|"RIGHTS_UNAPPROVED"|
    "EXAM_INVALID"|"QUESTION_IMAGES_MISSING"|"DUPLICATE_CONTENT"|
    "YEAR_COVERAGE_INCOMPLETE"|"ORIGINAL_PROVENANCE_UNVERIFIED";
  examIds:string[];
};

const goodId=(v:unknown)=>typeof v==="string"&&/^[A-Za-z0-9_-]{8,100}$/.test(v);
const paperFingerprint=(bundle:ExamBundle)=>crypto.createHash("sha256").update(
  JSON.stringify(bundle.questions.map(q=>({
    stem:q.stem,stemEn:q.stemEn,answer:q.answer,
    choices:q.choices,assetUrl:q.studentAssetUrl||q.assetUrl,
  }))),
).digest("hex");

/** Every sellable monthly exam must be distinct, full-length and rights-cleared.
 * The actual deployment supplies audited approvals and local private bundles,
 * never a browser-configured flag or a seller-entered string.
 */
export function checkMonthlyExamInventory(
  papers:readonly MonthlyPaper[],
  resolve:(id:string)=>ExamBundle,
  assets:(questions:ExamBundle["questions"])=>boolean=marketplaceExamAssetsReady,
  approval:(bundle:ExamBundle)=>boolean=marketplaceOperatorApprovalVerified,
):MonthlyReadiness {
  const fail=(code:MonthlyReadiness["code"]):MonthlyReadiness=>
    ({ready:false,code,examIds:[]});
  if(!Array.isArray(papers)||papers.length<AMC8_MONTHLY_MIN_PAPERS)
    return fail("PAPERS_MISSING");
  const offeredYears=papers.map(p=>p?.year);
  if(new Set(offeredYears).size!==AMC8_MONTHLY_MIN_PAPERS ||
    AMC8_OFFICIAL_ARCHIVE_YEARS.some(y=>!offeredYears.includes(y)))
    return fail("YEAR_COVERAGE_INCOMPLETE");
  if(papers.some(p=>p.officialSourceVerified!==true))
    return fail("ORIGINAL_PROVENANCE_UNVERIFIED");
  const ids=papers.map(p=>p?.examId);
  if(ids.some(id=>!goodId(id)))return fail("EXAM_INVALID");
  if(new Set(ids).size!==ids.length)return fail("DUPLICATE_PAPER");
  if(papers.some(p=>p.rightsApproved!==true||p.deliveryVerified!==true))
    return fail("RIGHTS_UNAPPROVED");
  const fingerprints=new Set<string>();
  for(const paper of papers){
    let bundle:ExamBundle;
    try{bundle=resolve(paper.examId)}
    catch{return fail("EXAM_INVALID")}
    if(bundle.profile.id!==paper.examId||
       bundle.profile.year!==paper.year||
       bundle.profile.formatId!=="maa-amc8"||
       bundle.profile.questionCount!==25||
       bundle.profile.durationSeconds!==2400||
       !isExamBundleTrainingReady(bundle))
      return fail("EXAM_INVALID");
    // A separately generated mock is never interchangeable with the official
    // exact past paper. Commercial content must be licensed from rights holder.
    if(!marketplaceCommercialRightsReady(bundle))return fail("RIGHTS_UNAPPROVED");
    if(bundle.profile.rightsPolicy?.rightsClass!=="licensed-commercial")
      return fail("ORIGINAL_PROVENANCE_UNVERIFIED");
    if(!approval(bundle))return fail("RIGHTS_UNAPPROVED");
    if(!assets(bundle.questions))return fail("QUESTION_IMAGES_MISSING");
    const fingerprint=paperFingerprint(bundle);
    if(fingerprints.has(fingerprint))return fail("DUPLICATE_CONTENT");
    fingerprints.add(fingerprint);
  }
  return {ready:true,code:"READY",examIds:[...ids]};
}

export type MonthlyGrantState = {
  createdAt:number;
  expiresAt:number;
  revokedAt?:number;
  examIds:readonly string[];
};

/** Policy only: exact 30-day archive access; original official papers can be
 * retried during the subscription, with each sitting stored as a new attempt.
 * A production handler must independently verify a signed paid entitlement.
 */
export function checkMonthlyExamPermission(
  grant:MonthlyGrantState,
  examId:string,
  now:number=Date.now(),
):{allowed:boolean;reason:string}{
  if(!Number.isSafeInteger(now)||!Number.isSafeInteger(grant.createdAt)||
     !Number.isSafeInteger(grant.expiresAt)||
     grant.expiresAt!==grant.createdAt+AMC8_MONTHLY_TERM_DAYS*86400_000)
    return {allowed:false,reason:"MONTHLY_GRANT_INVALID"};
  if(grant.revokedAt!==undefined)return {allowed:false,reason:"MONTHLY_REVOKED"};
  if(now<grant.createdAt||now>=grant.expiresAt)return {allowed:false,reason:"MONTHLY_EXPIRED"};
  if(!grant.examIds.includes(examId))return {allowed:false,reason:"EXAM_NOT_IN_PLAN"};
  return {allowed:true,reason:"AUTHORIZED"};
}
