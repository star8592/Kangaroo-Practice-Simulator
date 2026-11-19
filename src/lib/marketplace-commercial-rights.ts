import type {ExamBundle} from "./types";
import {loadTrainingExamBundle,isExamBundleTrainingReady} from "./training-question-bank";
import {marketplaceExamAssetsReady} from "./marketplace-exam-assets";
import {marketplaceOperatorApprovalVerified} from "./marketplace-rights-review";

/** Commercial sale is NOT the same as student-ready or user-owned.
 * Historical MAA/AMC papers in the local archive explicitly disallow resale.
 */
export function marketplaceCommercialRightsReady(bundle:ExamBundle):boolean{
  const rights=bundle.profile.rightsPolicy;
  if(!rights || rights.commercialUse!==true)return false;
  if(!["original-verified","licensed-commercial"].includes(rights.rightsClass||""))return false;
  if(typeof rights.license!=="string"||rights.license.trim().length<8)return false;
  return true;
}

/** Server-only fail-closed permission used for paid claims and exam access. */
export function marketplacePaidExamReady(examId:string):boolean{
  // Internal arithmetic QA papers may only be opened on a real loopback
  // test origin, never on an HTTPS store even if accidentally signed.
  const internalQaOnly=examId.startsWith("amc8-original-qa-") &&
    /^http:\/\/127\.0\.0\.1:[0-9]{2,5}$/.test(
      process.env.SOCTHINK_MARKETPLACE_PUBLIC_ORIGIN||"");
  if(examId.startsWith("amc8-original-qa-") && !internalQaOnly)return false;
  try{
    const bundle=loadTrainingExamBundle(examId);
    return bundle.profile.id===examId &&
      bundle.profile.formatId==="maa-amc8" &&
      bundle.profile.questionCount===25 &&
      bundle.profile.durationSeconds===2400 &&
      isExamBundleTrainingReady(bundle) &&
      marketplaceCommercialRightsReady(bundle) &&
      (bundle.profile.rightsPolicy?.rightsClass==="licensed-commercial" ||
        (internalQaOnly &&
          bundle.profile.rightsPolicy?.rightsClass==="original-verified" &&
          bundle.profile.rightsPolicy.license==="synthetic-qa-original-only" &&
          bundle.profile.sourceLabel==="Generated synthetic QA arithmetic; never for sale")) &&
      marketplaceOperatorApprovalVerified(bundle) &&
      marketplaceExamAssetsReady(bundle.questions);
  }catch{return false}
}
