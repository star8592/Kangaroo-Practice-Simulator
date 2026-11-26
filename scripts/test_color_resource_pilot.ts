/** Real ZIP through the existing resource ledger; isolated local test, no provider call. */
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import {NextRequest} from "next/server";
import {billingPool,closeBillingPoolForTests,createBillingOrder,settleVerifiedOrder,refundVerifiedOrder,BillingConflictError,hasVerifiedItemEntitlement} from "../src/lib/billing-ledger";
import {DIGITAL_SALES_POLICY_VERSION} from "../src/lib/digital-sales-policy";
async function main(){
 const u=new URL(process.env.SOCTHINK_BILLING_DATABASE_URL||"postgres://invalid/invalid");
 assert(process.env.SOCTHINK_BILLING_TEST_ISOLATED==="1" && u.hostname==="127.0.0.1" && u.pathname==="/color_resource_ci");
 const zip=process.argv[2];assert(zip);const bytes=fs.readFileSync(zip);assert(bytes.subarray(0,4).equals(Buffer.from([80,75,3,4])));
 const sha=crypto.createHash("sha256").update(bytes).digest("hex");
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"color-delivery-ci-"));const userdir=fs.mkdtempSync(path.join(os.tmpdir(),"color-buyer-ci-"));
 process.env.SOCTHINK_DIGITAL_FILES_DIR=dir;process.env.SOCTHINK_USER_DATA_DIR=userdir;process.env.SOCTHINK_ITEM_ACCESS_ENFORCED="1";
 const db=billingPool();const id="color.lut.sdr.essentials.v1";const file=path.join(dir,sha.slice(0,2),sha+".bin");
 const auth=await import("../src/lib/parent-auth");const {GET:download}=await import("../src/app/api/resources/download/[resourceId]/route");
 try{
  for(const f of fs.readdirSync("ops/db").filter(x=>/^00[1-8]_.*\.sql$/.test(x)).sort())await db.query(fs.readFileSync(path.join("ops/db",f),"utf8"));
  fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});fs.writeFileSync(file,bytes,{mode:0o600});
  const owner=auth.authenticateOrCreateWechatParent({wechatId:"wx_color_ci_owner",openId:"color_ci_owner"});
  const other=auth.authenticateOrCreateWechatParent({wechatId:"wx_color_ci_other",openId:"color_ci_other"});
  const url="https://socthink.cn/api/resources/download/"+id,target={params:Promise.resolve({resourceId:id})};
  const request=(who?:string)=>new NextRequest(url,who?{headers:{cookie:auth.PARENT_SESSION_COOKIE+"="+auth.createParentSessionToken(who)}}:undefined);
  const status=async(who?:string)=>(await download(request(who),target)).status;
  assert.equal(await status(),401);assert.equal(await status(owner.id),403);
  // One cent is an isolated fixture, not a proposed or configured production price.
  const amount=1,consent={policyVersion:DIGITAL_SALES_POLICY_VERSION,acceptedAt:new Date()};
  await db.query("INSERT INTO billing_products(id,tier,period,product_kind,content_kind,content_id,title_zh,amount_minor,currency,enabled,access_restricted) VALUES($1,NULL,NULL,'item','resource',$1,'SDR CI fixture',1,'CNY',false,true)",[id]);
  await db.query("INSERT INTO billing_resource_assets(resource_id,sha256,size_bytes,file_name,mime_type) VALUES($1,$2,$3,$4,'application/zip')",[id,sha,bytes.length,"Chromatic-SDR-Essentials-v1.zip"]);
  await assert.rejects(()=>createBillingOrder(owner.id,id,"wechat_native",consent),BillingConflictError);
  await db.query("UPDATE billing_products SET enabled=true,rights_approved=true,delivery_verified=true WHERE id=$1",[id]);
  await assert.rejects(()=>createBillingOrder(owner.id,id,"wechat_native",consent),BillingConflictError);
  await db.query("UPDATE billing_resource_assets SET rights_approved=true,delivery_verified=true WHERE resource_id=$1",[id]);
  const attempts=await Promise.allSettled(Array.from({length:4},()=>createBillingOrder(owner.id,id,"wechat_native",consent)));
  const fulfilled=attempts.filter(x=>x.status==="fulfilled");assert.equal(fulfilled.length,1);
  const order=fulfilled[0].value;assert.equal(order.priceMinor,amount);assert.equal(await status(owner.id),403);
  const receipt={provider:"wechat_native" as const,orderId:order.id,eventId:"color-fixture-payment",transactionId:"color-fixture-tx",amountMinor:amount,currency:"CNY" as const,payloadSha256:crypto.createHash("sha256").update("isolated-test-receipt").digest("hex"),verifiedAt:new Date(),signatureVerified:true as const,providerStatusConfirmed:true as const};
  await assert.rejects(()=>settleVerifiedOrder({...receipt,amountMinor:2}),BillingConflictError);
  assert.equal(await status(owner.id),403);
  assert.equal((await settleVerifiedOrder(receipt)).created,true);
  assert.equal((await settleVerifiedOrder(receipt)).created,false);
  assert.equal(await status(other.id),403);
  const r=await download(request(owner.id),target);assert.equal(r.status,200);assert.equal(r.headers.get("Content-Type"),"application/zip");assert.deepEqual(Buffer.from(await r.arrayBuffer()),bytes);
  fs.writeFileSync(file,Buffer.alloc(bytes.length,0));assert.equal(await status(owner.id),503);fs.writeFileSync(file,bytes);
  assert.equal(await status(owner.id),200);
  assert.equal((await refundVerifiedOrder({...receipt,eventId:"color-fixture-refund"})).revoked,true);
  assert.equal(await hasVerifiedItemEntitlement(owner.id,"resource",id),false);assert.equal(await status(owner.id),403);
  console.log(JSON.stringify({resource:id,sha256:sha,bytes:bytes.length,guest:401,unpaid:403,disabled_sku_blocked:true,unapproved_asset_blocked:true,concurrent_orders:1,amount_mismatch_blocked:true,synthetic_settlement_idempotent:true,cross_account:403,paid_download:200,exact_zip:true,corrupt_file:503,refund_revokes:403,real_wechat_transaction:false}));
 }finally{await closeBillingPoolForTests();fs.rmSync(dir,{recursive:true,force:true});fs.rmSync(userdir,{recursive:true,force:true})}
}
main().catch(e=>{console.error(e);process.exitCode=1});
