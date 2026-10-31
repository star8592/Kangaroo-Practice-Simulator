/** Shared immutable customer-facing digital purchase terms.
 * A new copy or material change requires a new version identifier, so
 * historical order consent still refers to the original disclosure.
 */
// V1 remains archived verbatim at /digital-purchase-policy/v1 for orders
// accepted before the new terms were published. Never reinterpret old consent.
export const PREVIOUS_DIGITAL_SALES_POLICY_VERSION =
  "digital-delivery-no-reason-v1-2026-10-31";
export const DIGITAL_SALES_POLICY_VERSION =
  "digital-delivery-no-reason-v2-2026-10-31";
export const DIGITAL_SALES_POLICY_SHORT_ZH =
  "数字试卷、资料及在线考试等数字内容经交付或按约开通后，在法律允许的范围内不支持因买错、改变主意、已查看或已使用等原因的无理由退款。本站不提供用户自助退款。未交付、严重不符、未履行的预付服务以及其他依法必须处理的情形，按适用法律核实处理。";
export const DIGITAL_SALES_POLICY_SHORT_EN =
  "No change-of-mind refund is offered after eligible digital content is delivered or access is activated, to the extent permitted by law. No customer self-service refund is offered. Mandatory remedies for non-delivery, material breach or unperformed prepaid services remain available.";

export function validDigitalSalesPolicyConsent(value:unknown):boolean{
  if(!value || typeof value!=="object" || Array.isArray(value))return false;
  const x=value as Record<string,unknown>;
  return x.policyAccepted===true && x.policyVersion===DIGITAL_SALES_POLICY_VERSION;
}
