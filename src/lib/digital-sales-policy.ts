/** Shared immutable customer-facing digital purchase terms.
 * A new copy or material change requires a new version identifier, so
 * historical order consent still refers to the original disclosure.
 */
export const DIGITAL_SALES_POLICY_VERSION = "digital-delivery-no-reason-v1-2026-10-31";
export const DIGITAL_SALES_POLICY_SHORT_ZH =
  "考试、试卷和数字资料属于数字内容。购买并开通使用权限或交付下载后，不支持因买错、改变主意、已查看或已下载等原因申请无理由退货退款。无法正常交付、内容与描述严重不符或依法应承担责任的情形，按法律规定处理。";
export const DIGITAL_SALES_POLICY_SHORT_EN =
  "Digital exams and files generally cannot be returned for a change of mind once access is activated or the content is delivered. Statutory remedies for non-delivery, material misdescription and other legal rights remain available.";

export function validDigitalSalesPolicyConsent(value:unknown):boolean{
  if(!value || typeof value!=="object" || Array.isArray(value))return false;
  const x=value as Record<string,unknown>;
  return x.policyAccepted===true && x.policyVersion===DIGITAL_SALES_POLICY_VERSION;
}
