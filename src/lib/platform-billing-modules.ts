/**
 * Platform-owned commerce contract. This is a registry, NOT a list of
 * saleable SKUs or a substitute for the verified PostgreSQL ledger.
 * Product role grants and monetary entitlements are always independent.
 */
import {ENGLISH_PRODUCTS,type EnglishProductId} from "./english-products";

export type BillingModuleId = "platform" | "math" | EnglishProductId;
export type BillingModule = Readonly<{
  id: BillingModuleId;
  name: string;
  checkoutUrl: "/membership";
  accountUrl: "/account";
  owner: "socthink";
  fulfillment: "central-settled-items" | "central-plan" | "not-onboarded";
}>;

const CORE: BillingModule = {
  id:"platform",name:"平台数字资料与报告",checkoutUrl:"/membership",
  accountUrl:"/account",owner:"socthink",fulfillment:"central-settled-items",
};
const MATH: BillingModule = {
  id:"math",name:"数学竞赛与训练",checkoutUrl:"/membership",
  accountUrl:"/account",owner:"socthink",fulfillment:"central-plan",
};
export const PLATFORM_BILLING_MODULES: ReadonlyArray<BillingModule> =
  Object.freeze([CORE,MATH,...ENGLISH_PRODUCTS.filter(item=>item.id!=="reading").map(item=>({
    id:item.id,name:item.name,checkoutUrl:"/membership" as const,
    accountUrl:"/account" as const,owner:"socthink" as const,
    // No English module may claim a paid seat or plan until a *verified*
    // central SKU and a product-specific fulfillment adapter exist.
    fulfillment:"not-onboarded" as const,
  }))]);

export function platformBillingModule(id:unknown): BillingModule|null {
  return typeof id==="string" ? PLATFORM_BILLING_MODULES.find(m=>m.id===id)??null : null;
}
export function publicPlatformBillingCatalog() {
  return {
    schemaVersion:1,
    model:"one-wechat-identity-one-payment-ledger",
    checkoutUrl:"/membership",
    accountUrl:"/account",
    // A published destination is not a live SKU or an authorization.
    modules:PLATFORM_BILLING_MODULES,
    readOnlyLegacyModules:["reading"] as const,
    noNewProductMerchantIntegrations:true,
  } as const;
}
