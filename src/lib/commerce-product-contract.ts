import type { AssessmentDomainId } from "./assessment-platform";

/**
 * Product catalogue schema for a future unified exam marketplace.
 *
 * No product instances, checkout HTTP handlers, real prices, or merchant secrets
 * are declared here. The production billing ledger remains authoritative.
 * A product cannot be sold based solely on client-side status or fake payment
 * callbacks. All approval facts must originate from the trusted backend.
 */
export type CommerceProductKind =
  | "single-exam" | "oral-mock" | "practical-sandbox"
  | "exam-pack" | "bounded-membership" | "organization-seats";

export type CommerceDelivery = "assessment-attempt" | "oral-attempt" |
  "sandbox-attempt" | "assessment-pack" | "capability-quota" | "organization-seat";

export type ProductReadiness = "draft" | "preview" | "sellable" | "paused";
export type PaymentChannel = "wechat_native" | "wechat_jsapi" | "wechat_h5" |
  "wechat_virtual" | "alipay_page" | "alipay_wap";
export type SalesSurface = "pc-web" | "mobile-web" | "wechat-web" | "wechat-miniapp";

export type ExamCommerceProduct = Readonly<{
  sku: string;
  revision: number;
  name: string;
  domain: AssessmentDomainId;
  kind: CommerceProductKind;
  delivery: CommerceDelivery;
  /** Exact target assessment/capability revision; never guess from SKU title. */
  entitlementRef: string;
  entitlementRevision: number;
  /** Only server-confirmed proven sale permission. */
  rightsVerified: boolean;
  /** An actual user can complete the paid workflow and read its evidence. */
  deliveryVerified: boolean;
  readiness: ProductReadiness;
  /** The immutable published server price, in currency minor units. */
  priceMinor?: number;
  currency?: "CNY";
  /** Every offer must have a finite provider-independent resource budget. */
  quotaUnits: number;
}>;

export type MerchantPaymentCapability = Readonly<{
  channel: PaymentChannel;
  /** Recorded from authenticated provider console, not frontend input. */
  merchantVerified: boolean;
  productContractApproved: boolean;
  callbackAndQueryVerified: boolean;
  refundsVerified: boolean;
  billingReconciliationVerified: boolean;
  /** This sales surface / appid / licensed digital-product category is allowed. */
  saleSurfaceApproved: boolean;
  /** Timestamp and receipt of the authoritative verification. */
  verifiedAt?: string;
  verificationRef?: string;
}>;

const CHANNEL_SURFACES: Readonly<Record<PaymentChannel, readonly SalesSurface[]>> = {
  wechat_native: ["pc-web"],
  wechat_jsapi: ["wechat-web"],
  wechat_h5: ["mobile-web"],
  wechat_virtual: ["wechat-miniapp"],
  alipay_page: ["pc-web"],
  alipay_wap: ["mobile-web"],
};

/**
 * All facts are deliberately fail-closed until the merchant account owner has
 * provided real console approvals and we have end-to-end transaction evidence.
 * This is a checklist validator, NOT a live authorization or order processor.
 */
export function commerceProductErrors(p: ExamCommerceProduct): string[] {
  const errors:string[] = [];
  if (!/^[a-z0-9][a-z0-9_.-]{3,127}$/.test(p.sku)) errors.push("invalid-sku");
  if (!Number.isInteger(p.revision) || p.revision < 1) errors.push("invalid-product-revision");
  if (!p.name.trim() || !p.entitlementRef.trim() || !Number.isInteger(p.entitlementRevision) ||
    p.entitlementRevision < 1) errors.push("missing-entitlement-target");
  if (!p.rightsVerified) errors.push("rights-unverified");
  if (!p.deliveryVerified) errors.push("delivery-unverified");
  if (p.readiness !== "sellable") errors.push("product-not-sellable");
  if (!Number.isSafeInteger(p.priceMinor) || p.priceMinor === undefined || p.priceMinor <= 0 ||
    p.currency !== "CNY") errors.push("invalid-server-price");
  if (!Number.isSafeInteger(p.quotaUnits) || p.quotaUnits < 1)
    errors.push("missing-cost-budget");
  const expected:Readonly<Record<CommerceProductKind,CommerceDelivery>> = {
    "single-exam":"assessment-attempt",
    "oral-mock":"oral-attempt",
    "practical-sandbox":"sandbox-attempt",
    "exam-pack":"assessment-pack",
    "bounded-membership":"capability-quota",
    "organization-seats":"organization-seat",
  };
  if (expected[p.kind] !== p.delivery) errors.push("mismatched-delivery");
  return errors;
}
export function commerceChannelErrors(
  c: MerchantPaymentCapability, surface: SalesSurface,
): string[] {
  const errors:string[] = [];
  if (!CHANNEL_SURFACES[c.channel]?.includes(surface)) errors.push("channel-wrong-surface");
  if (!c.merchantVerified || !c.productContractApproved || !c.saleSurfaceApproved)
    errors.push("provider-product-not-approved");
  if (!c.callbackAndQueryVerified || !c.refundsVerified ||
      !c.billingReconciliationVerified)
    errors.push("real-payment-chain-unverified");
  if (!c.verifiedAt || !Number.isFinite(Date.parse(c.verifiedAt)) || !c.verificationRef)
    errors.push("missing-provider-verification-evidence");
  return errors;
}

export function canOfferCommerceProduct(
  product: ExamCommerceProduct,
  capability: MerchantPaymentCapability,
  surface: SalesSurface,
): {allowed:boolean; reasons:readonly string[]} {
  const reasons = [...commerceProductErrors(product),...commerceChannelErrors(capability,surface)];
  return {allowed:reasons.length===0,reasons};
}
