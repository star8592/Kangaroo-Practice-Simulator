import assert from "node:assert/strict";
import {readFileSync,readdirSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
const header=read("src/components/SiteHeader.tsx");
const accountNav=read("src/components/SessionNav.tsx");
const footer=read("src/components/SiteFooter.tsx");
const member=read("src/app/membership/MembershipClient.tsx");
const account=read("src/app/account/page.tsx");
const memberCss=read("src/app/membership/MembershipPage.module.css");
const accountCss=read("src/app/account/AccountPage.module.css");
const authCss=read("src/components/AuthExperience.module.css");
const checkout=read("src/app/api/payments/wechat/checkout/route.ts");
const homeCompetition=read("src/components/HomeClient.tsx");
const eventHub=read("src/components/WorldCompetitionHub.tsx");
const resourceClient=read("src/components/ResourceLibraryClient.tsx");
const loginClient=read("src/components/UnifiedLoginClient.tsx");

for(const slug of ["/assessments","/resources","/exam-planner","/membership",
  "/arithmetic","/competitions","/review"]){
  assert.ok(header.includes(`href:"${slug}"`),`NAV_MISSING_${slug}`);
}
assert.ok(accountNav.includes('href="/login?next=%2Faccount"')&&accountNav.includes('"/account"'),
  "ACCOUNT_ENTRY_MUST_HAVE_ONE_SESSION_NAV");
assert.match(header,/EXAM_DIRECTORY\.map\(/,"Navigation must read the existing full exam taxonomy");
assert.ok(!header.includes('href:"/events"'),"Math-specific events must not be top-level tasks");
assert.match(footer,/href:"\/membership"/);
for(const slug of ["/assessments","/resources","/arithmetic","/account"]){
  assert.ok(member.includes(`href:"${slug}"`),`REAL_SERVICE_ENTRY_MISSING_${slug}`);
  assert.ok(account.includes(`href:"${slug}"`)||slug==="/account",
    `ACCOUNT_SERVICE_ENTRY_MISSING_${slug}`);
}
assert.match(member,/NativeCheckoutPanel offers={offers}/);
assert.match(member,/DIGITAL_SALES_POLICY_SHORT_ZH/);
assert.match(checkout,/!nativeCheckoutAllowed\(\) \|\| !billingConfigured\(\)/);
assert.match(checkout,/validDigitalSalesPolicyConsent/);
for(const css of [memberCss,accountCss,authCss]){
  assert.match(css,/--portal-navy/);
}
assert.match(memberCss,/\.serviceGrid/);
assert.match(accountCss,/\.orderStatus\[data-status="paid"\]/);
assert.match(account,/!billingReady/);
assert.match(account,/账本|支付/);
assert.equal((homeCompetition.match(/<h1>/g)||[]).length,1,
  "COMPETITION_MUST_HAVE_EXACTLY_ONE_H1");
assert.match(eventHub,/<h1>\{zh\?/,
  "EVENTS_MUST_HAVE_A_REAL_SERVER_RENDERABLE_H1");
for(const p of [member,account,resourceClient,loginClient]){
  assert.ok(!p.includes("<main"),"NESTED_MAIN_LANDMARK");
}

// One buyer journey: product detail shares the server-authorized checkout
// component, portal-wide grid and the exact paid-download destination.
const shopDetail=read("src/app/shop/[productId]/page.tsx");
const shopIndex=read("src/app/shop/page.tsx");
const shopCss=read("src/app/shop/shop.module.css");
const checkoutPanel=read("src/app/membership/NativeCheckoutPanel.tsx");
const checkoutCss=read("src/app/membership/MembershipPage.module.css");
assert.match(shopCss,/max-width:var\(--layout-wide\)/,
  "SHOP_MUST_SHARE_GLOBAL_PORTAL_WIDTH");
assert.match(shopCss,/grid-template-areas:"head aside" "body aside"/,
  "SHOP_DETAIL_MUST_HAVE_TWO_COLUMN_COMPOSITION");
assert.match(shopCss,/grid-template-areas:"head" "aside" "body"/,
  "MOBILE_PURCHASE_CARD_MUST_FOLLOW_TITLE_BEFORE_LONG_DESCRIPTION");
assert.doesNotMatch(shopCss,/\.detail\s*\{\s*max-width:\s*740px/,
  "DO_NOT_REINTRODUCE_NARROW_CENTERED_PRODUCT_CARD");
assert.match(shopDetail,/NativeCheckoutPanel offers=\{\[offer\]\} accountLoggedIn compact/,
  "PRODUCT_PAYMENT_MUST_REUSE_EXISTING_BILLING_CHECKOUT");
assert.match(shopDetail,/nativeCheckoutAllowed\(\)/,
  "PRODUCT_CANNOT_ADVERTISE_LIVE_CHARGES_WHEN_DISABLED");
assert.match(shopDetail,/hasVerifiedItemEntitlement/,
  "PAID_CUSTOMER_MUST_HAVE_DOWNLOAD_SHORTCUT");
assert.match(shopDetail,/api\/resources\/download\//,
  "DOWNLOAD_MUST_GO_THROUGH_AUTHORIZED_SERVER_ENDPOINT");
assert.match(shopDetail,/\/account/,
  "ACCOUNT_MUST_BE_THE_DELIVERY_LOCATION");
assert.match(checkoutPanel,/compact=false/,
  "SHARED_CHECKOUT_MUST_SUPPORT_PRODUCT_SIDEBAR");
assert.match(checkoutPanel,/前往我的订单下载资料/,
  "AFTER_REAL_PAID_STATE_MUST_LINK_TO_DOWNLOAD");
assert.match(checkoutCss,/\.checkoutCompact/,
  "INLINE_CHECKOUT_MUST_HAVE_EXPLICIT_LAYOUT");
assert.match(shopIndex,/查看文件和商品详情/,
  "SHOP_GRID_LINK_MUST_BE_TRUTHFUL_WHILE_CHECKOUT_IS_OFF");
assert.match(shopDetail,/本样张直接渲染自已核验 PDF 的第一页/,
  "SHOP_PREVIEW_MUST_BE_ACTUAL_PRODUCT_PDF");
assert.match(shopDetail,/shop\/previews\//,
  "PRODUCT_DETAIL_MUST_LINK_TO_AUTHENTIC_PDF_PREVIEW");
assert.match(shopIndex,/cardPreviewLink/,
  "SHOP_CATALOG_MUST_SHOW_ACTUAL_FIRST_PAGE");
const pdfPreviewFiles=readdirSync("public/shop/previews").filter(name=>name.endsWith(".png"));
assert.ok(pdfPreviewFiles.length>=13,"ALL_INITIAL_VERIFIED_PRODUCTS_NEED_PREVIEW");
for(const name of pdfPreviewFiles){
  assert.equal(readFileSync("public/shop/previews/"+name).subarray(0,8).toString("hex"),
    "89504e470d0a1a0a","PREVIEW_NOT_A_REAL_PNG_"+name);
}

console.log("PORTAL_COMMERCE_CONTRACT=PASS consistent_nav real_service_entries shared_theme policy_and_payment_fail_closed");
