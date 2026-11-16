import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {ENGLISH_PRODUCTS,englishPlatformCatalog,ENGLISH_PLATFORM_CATALOG_VERSION} from "../src/lib/english-products";
import {englishRoleEntries} from "../src/lib/english-role-hubs";

const ids=["pronunciation","vocabulary","reading","aelos"];
const catalog=englishPlatformCatalog();
for(const audience of ["teacher","student"] as const){
 const entries=englishRoleEntries(audience);
 assert.deepEqual(entries.map(e=>e.id),ids,"Role hub must reuse one four-product registry");
 for(const entry of entries){
  assert(entry.url.startsWith("/english/"+entry.id+"/"),
   "Role hub must keep each product in its own same-origin path");
  assert(!entry.url.startsWith("//")&&!entry.url.includes("\\"),
   "Role hub must not redirect to a foreign site");
 }
}
const teacherEntries=englishRoleEntries("teacher");
assert.deepEqual(teacherEntries.filter(e=>e.classroomReady).map(e=>e.id),
 ["pronunciation","vocabulary"],"No fake teacher backend for reading/AelOS");
assert.equal(teacherEntries.find(e=>e.id==="vocabulary")?.url,
 "/english/vocabulary/app/teacher/access");
assert(englishRoleEntries("student").find(e=>e.id==="vocabulary")?.url
 ==="/english/vocabulary/app/app/classroom");

assert.equal(catalog.schemaVersion,ENGLISH_PLATFORM_CATALOG_VERSION);
assert.deepEqual(catalog.products.map(p=>p.id),ids);
assert.equal(new Set(catalog.products.map(p=>p.capability)).size,ids.length);
for(const product of catalog.products){
 assert.match(product.id,/^[a-z]+$/);
 assert.equal(product.capability,"english."+product.id);
 assert.equal(product.href,"/english/"+product.id);
 assert(product.serviceUrl.startsWith(product.href+"/app/"));
 assert(!product.serviceUrl.includes("//")&&!product.serviceUrl.includes("\\"));
 assert(["main-wechat","product-native","public-preview"].includes(product.authMode));
 assert(["native","not-integrated"].includes(product.federationStatus));
 assert(!("ticket" in product)&&!("accountId" in product));
}
assert.equal(ENGLISH_PRODUCTS[0].authMode,"main-wechat");
assert(catalog.products.slice(1).every(p=>p.federationStatus==="not-integrated"),
 "Unverified SSO must never be advertised as integrated");
const sso=fs.readFileSync(path.join(process.cwd(),"src/lib/english-sso-ticket.ts"),"utf8");
assert(sso.includes("ENGLISH_PRODUCTS.map(p=>p.id)"),"SSO allowlist must use the ONE catalog");
assert(!sso.includes('= ["pronunciation", "vocabulary", "reading", "aelos"]'));
const route=fs.readFileSync(path.join(process.cwd(),"src/app/api/english/catalog/route.ts"),"utf8");
assert(route.includes("englishPlatformCatalog()"));
assert(!route.includes("parentFromSessionToken")&&!route.includes("process.env"));
const eventSchema=JSON.parse(fs.readFileSync(path.join(process.cwd(),"schemas/english-learning-event.v1.schema.json"),"utf8"));
assert.equal(eventSchema.additionalProperties,false,"Evidence contract must deny unknown fields");
assert.deepEqual(eventSchema.properties.productId.enum,ids,"All products must use same capability IDs");
assert(eventSchema.required.includes("productEventId")&&eventSchema.required.includes("subject"));
assert(!("rawAudio" in eventSchema.properties)&&!("wechatOpenId" in eventSchema.properties));
assert(eventSchema.properties.metric.description.includes("Never average unlike metrics"));
console.log("ENGLISH_PLATFORM_PUBLIC_CATALOG_CONTRACT_PASS=28 products="+ids.length);
