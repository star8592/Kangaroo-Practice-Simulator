import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(file)=>readFileSync(file,"utf8");
const membership=read("src/app/membership/MembershipClient.tsx");
const checkout=read("src/app/membership/NativeCheckoutPanel.tsx");
const product=read("src/app/shop/[productId]/page.tsx");
assert.match(membership,/<details className=\{styles.purchasePolicyNotice\}/,
  "Membership must preserve accessible expandable purchase rules");
assert.match(membership,/href="\/digital-purchase-policy"/,
  "Full legally effective purchase terms must stay accessible");
assert.match(membership,/showPolicySummary=\{false\}/,
  "Membership should not render the same policy paragraph twice");
assert.match(checkout,/showPolicySummary=true/,
  "Checkout component must still show standalone policy disclosure by default");
assert.match(checkout,/\{showPolicySummary&&<div className=\{styles.purchasePolicyNotice\}/,
  "Disclosure must be optional only when the parent owns it");
assert.match(checkout,/checked=\{policyAcknowledgements\[offer\.id\]===true\}/,
  "Every product still requires an explicit, initially unchecked confirmation");
assert.match(checkout,/disabled=\{!accountLoggedIn\|\|!policyAcknowledgements\[offer\.id\]/,
  "Payment button must remain disabled until authenticated affirmative consent");
assert.match(product,/\{publicCheckoutReady\s*\?/,
  "Product payment help must reflect production checkout availability");
assert.doesNotMatch(product,/<p>正式开放后，登录微信账号并扫码/,
  "Do not tell buyers to wait for a payment feature already active");
console.log("MEMBERSHIP_CHECKOUT_NOTICE=PASS parent disclosure, consent intact, no duplicate paragraph, live checkout copy");
