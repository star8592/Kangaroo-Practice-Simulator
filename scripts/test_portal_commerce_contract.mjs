import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
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

for(const slug of ["/assessments","/resources","/events","/membership",
  "/arithmetic","/competitions","/review"]){
  assert.ok(header.includes(`href:"${slug}"`),`NAV_MISSING_${slug}`);
}
assert.ok(accountNav.includes('href="/login?next=%2Faccount"')&&accountNav.includes('"/account"'),
  "ACCOUNT_ENTRY_MUST_HAVE_ONE_SESSION_NAV");
assert.match(header,/EXAM_DIRECTORY\.map\(/,"Navigation must read the existing full exam taxonomy");
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
console.log("PORTAL_COMMERCE_CONTRACT=PASS consistent_nav real_service_entries shared_theme policy_and_payment_fail_closed");
