import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {NextRequest} from "next/server";
import {readVerifiedDigitalResource} from "../src/lib/digital-resource-file";
import {DIGITAL_SALES_POLICY_VERSION} from "../src/lib/digital-sales-policy";
import { billingPool,closeBillingPoolForTests,createBillingOrder,
  settleVerifiedOrder,refundVerifiedOrder,consumeUsage,verifiedGrantsForParent,hasVerifiedItemEntitlement,
  verifiedParentsForStudent,linkVerifiedFamilyMember,closeVerifiedNativeOrder,BillingConflictError,
  BillingQuotaExceededError,recordVerifiedNativeNotification,type VerifiedPaymentReceipt } from "../src/lib/billing-ledger";

const testUrl = new URL(process.env.SOCTHINK_BILLING_DATABASE_URL || "postgres://invalid/invalid");
if (!process.env.SOCTHINK_BILLING_DATABASE_URL ||
    process.env.SOCTHINK_BILLING_TEST_ISOLATED !== "1" ||
    !["127.0.0.1", "localhost"].includes(testUrl.hostname) ||
    !testUrl.pathname.endsWith("_ci")) {
  throw new Error("Refusing to run outside localhost isolated *_ci billing test database");
}

const db=billingPool();
function receipt(orderId:string, eventId:string, transactionId:string, amountMinor=3900):VerifiedPaymentReceipt {
  return {provider:"wechat_pay",orderId,eventId,transactionId,amountMinor,
    currency:"CNY",payloadSha256:crypto.createHash("sha256").update(eventId).digest("hex"),
    verifiedAt:new Date(),signatureVerified:true,providerStatusConfirmed:true};
}
async function run() {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"socthink-digital-fixture-"));
  const userdir=fs.mkdtempSync(path.join(os.tmpdir(),"socthink-buyer-fixture-"));
  process.env.SOCTHINK_DIGITAL_FILES_DIR=dir;
  process.env.SOCTHINK_USER_DATA_DIR=userdir;
  const {canOpenItemExam}=await import("../src/lib/item-access-server");
  const parentAuth=await import("../src/lib/parent-auth");
  const {GET:downloadResource}=await import("../src/app/api/resources/download/[resourceId]/route");
  const resourceId="original_training_fixture";
  const bytes=Buffer.from("Original independently-authored study checklist. Private delivery fixture.\n","utf8");
  const digest=crypto.createHash("sha256").update(bytes).digest("hex");
  const digestDir=path.join(dir,digest.slice(0,2));
  fs.mkdirSync(digestDir,{recursive:true,mode:0o700});
  const digestFile=path.join(digestDir,digest+".bin");
  fs.writeFileSync(digestFile,bytes,{mode:0o600});
  const fileMeta={
    sha256:digest,size_bytes:bytes.length,file_name:"原创复习清单.txt",mime_type:"text/plain"
  };
  assert.deepEqual(await readVerifiedDigitalResource(fileMeta),bytes);
  const downloadUrl="https://socthink.cn/api/resources/download/"+resourceId;
  const owner=parentAuth.authenticateOrCreateWechatParent({
    wechatId:"wx_resource_ledger_fixture_owner",openId:"resource_fixture_owner_openid"
  });
  const stranger=parentAuth.authenticateOrCreateWechatParent({
    wechatId:"wx_resource_ledger_fixture_stranger",openId:"resource_fixture_stranger_openid"
  });
  const authed=(accountId:string)=>new NextRequest(downloadUrl,{headers:{
    cookie:parentAuth.PARENT_SESSION_COOKIE+"="+parentAuth.createParentSessionToken(accountId)
  }});
  const target={params:Promise.resolve({resourceId})};
  assert.equal((await downloadResource(new NextRequest(downloadUrl),target)).status,401);
  await db.query(fs.readFileSync("ops/db/001_billing_entitlements.sql","utf8"));
  await db.query(fs.readFileSync("ops/db/002_wechat_reconciliation.sql","utf8"));
  await db.query(fs.readFileSync("ops/db/003_native_notification_inbox.sql","utf8"));
  await db.query(fs.readFileSync("ops/db/004_item_purchases.sql","utf8"));
  await db.query(fs.readFileSync("ops/db/005_digital_resource_delivery.sql","utf8"));
  await db.query(fs.readFileSync("ops/db/006_unique_active_item_orders.sql","utf8"));
  await db.query(fs.readFileSync("ops/db/007_native_close_proof.sql","utf8"));
  await db.query(fs.readFileSync("ops/db/008_digital_sales_consent.sql","utf8"));
  await db.query(fs.readFileSync("ops/db/009_assessment_report_rights.sql","utf8"));
  const consent={policyVersion:DIGITAL_SALES_POLICY_VERSION,acceptedAt:new Date()};
  // Native real orders are rejected without customer-initiated confirmation.
  await assert.rejects(()=>createBillingOrder("par_noconsent","plus_month","wechat_native"),
    BillingConflictError);
  // The caller uses a throwaway database; no production fixture or customer data.
  await db.query("TRUNCATE billing_usage_events,billing_usage_buckets,billing_family_links,billing_item_entitlements,billing_entitlements,billing_payment_events,billing_orders,billing_products,billing_resource_assets RESTART IDENTITY CASCADE");
  assert.equal((await downloadResource(authed(owner.id),target)).status,403);
  assert.equal((await downloadResource(new NextRequest(downloadUrl,{headers:{
    ...Object.fromEntries(authed(owner.id).headers.entries()),
    authorization:"Bearer unrelated_miniapp_token"
  }}),target)).status,401);
  await db.query("INSERT INTO billing_products(id,tier,period,amount_minor,currency,enabled) VALUES('plus_month','plus','month',3900,'CNY',true)");
  const one=await createBillingOrder("par_test01","plus_month");
  assert.equal(one.priceMinor,3900);
  await assert.rejects(()=>settleVerifiedOrder(receipt(one.id,"bad-amount","wx-01",1)),BillingConflictError);
  assert.equal((await db.query("SELECT state FROM billing_orders WHERE id=$1",[one.id])).rows[0].state,"pending");
  const paid=await settleVerifiedOrder(receipt(one.id,"paid-01","wx-01"));
  assert.equal(paid.created,true);
  assert.equal((await settleVerifiedOrder(receipt(one.id,"paid-01","wx-01"))).created,false);
  assert.equal((await verifiedGrantsForParent("par_test01")).length,1);

  process.env.SOCTHINK_ITEM_ACCESS_ENFORCED="1";
  assert.equal(await canOpenItemExam("uncharged-public-exam",null),true);

  // Item SKUs are independent of PLUS/PRO subscriptions and fail closed until
  // human rights review and real content-delivery checks are both complete.
  await db.query(`INSERT INTO billing_products
    (id,tier,period,product_kind,content_kind,content_id,title_zh,amount_minor,currency,enabled)
    VALUES('exam_sample_a',NULL,NULL,'item','exam','verified-sample-a','已核实样卷',199,'CNY',true)`);
  await assert.rejects(()=>createBillingOrder("par_item01","exam_sample_a"),BillingConflictError);
  await db.query("UPDATE billing_products SET rights_approved=true WHERE id='exam_sample_a'");
  await assert.rejects(()=>createBillingOrder("par_item01","exam_sample_a"),BillingConflictError);
  await db.query("UPDATE billing_products SET delivery_verified=true,access_restricted=true WHERE id='exam_sample_a'");
  await assert.rejects(()=>createBillingOrder("par_no_policy","exam_sample_a",
    "wechat_native"),BillingConflictError);
  await assert.rejects(()=>createBillingOrder("par_wrong_policy","exam_sample_a",
    "wechat_native",{policyVersion:"unknown",acceptedAt:new Date()}),
    BillingConflictError);
  assert.equal(await canOpenItemExam("verified-sample-a",null),false);
  assert.equal(await canOpenItemExam("verified-sample-a","par_item01"),false);
  const item=await createBillingOrder("par_item01","exam_sample_a","wechat_native",consent);
  assert.equal(item.priceMinor,199);
  const consentStored=await db.query<{sales_policy_version:string;sales_policy_accepted_at:Date}>(`
    SELECT sales_policy_version,sales_policy_accepted_at
    FROM billing_orders WHERE id=$1`,[item.id]);
  assert.equal(consentStored.rows[0].sales_policy_version,DIGITAL_SALES_POLICY_VERSION);
  assert.ok(consentStored.rows[0].sales_policy_accepted_at instanceof Date);
  await assert.rejects(()=>db.query(
    "UPDATE billing_orders SET sales_policy_version=NULL,sales_policy_accepted_at=NULL WHERE id=$1",
    [item.id]));
  const subscriberConsent=await db.query<{sales_policy_version:string|null}>(
    "SELECT sales_policy_version FROM billing_orders WHERE id=$1",[one.id]);
  assert.equal(subscriberConsent.rows[0].sales_policy_version,null);
  assert.equal(await hasVerifiedItemEntitlement("par_item01","exam","verified-sample-a"),false);
  const itemReceipt={...receipt(item.id,"item-paid-01","item-tx-01",199),provider:"wechat_native" as const};
  await assert.rejects(()=>settleVerifiedOrder({...itemReceipt,amountMinor:200}),BillingConflictError);
  const itemPaid=await settleVerifiedOrder(itemReceipt);
  assert.equal(itemPaid.created,true);
  assert.equal(itemPaid.tier,null);
  assert.equal((await settleVerifiedOrder(itemReceipt)).created,false);
  assert.equal(await hasVerifiedItemEntitlement("par_item01","exam","verified-sample-a"),true);
  assert.equal(await canOpenItemExam("verified-sample-a","par_item01"),true);
  assert.equal(await canOpenItemExam("verified-sample-a","par_stranger"),false);
  // Checkout flag removal cannot bypass an already-sold item entitlement.
  delete process.env.SOCTHINK_ITEM_ACCESS_ENFORCED;
  assert.equal(await canOpenItemExam("verified-sample-a","par_item01"),true);
  assert.equal(await canOpenItemExam("verified-sample-a","par_stranger"),false);
  process.env.SOCTHINK_ITEM_ACCESS_ENFORCED="1";
  await assert.rejects(()=>createBillingOrder("par_item01","exam_sample_a","wechat_native",consent),BillingConflictError);
  assert.equal(await hasVerifiedItemEntitlement("par_stranger","exam","verified-sample-a"),false);
  assert.equal(await hasVerifiedItemEntitlement("par_item01","resource","verified-sample-a"),false);
  assert.equal((await verifiedGrantsForParent("par_item01")).length,0);
  // Existing orders retain immutable content even after catalog changes.
  await db.query("UPDATE billing_products SET content_id='different-content',enabled=false WHERE id='exam_sample_a'");
  assert.equal(await hasVerifiedItemEntitlement("par_item01","exam","verified-sample-a"),true);
  assert.equal(await hasVerifiedItemEntitlement("par_item01","exam","different-content"),false);
  assert.equal((await refundVerifiedOrder({...itemReceipt,eventId:"item-refund-01"})).revoked,true);
  assert.equal(await hasVerifiedItemEntitlement("par_item01","exam","verified-sample-a"),false);
  assert.equal(await canOpenItemExam("verified-sample-a","par_item01"),false);

  // A premium report is a typed item in the SAME immutable billing ledger.
  // Payment never unlocks until a provider-verified settlement grants rights.
  const reportInstrumentId="ipip-big-five-50-cn-preview";
  await db.query(`INSERT INTO billing_products
    (id,tier,period,product_kind,content_kind,content_id,title_zh,amount_minor,currency,enabled,
     rights_approved,delivery_verified,access_restricted)
    VALUES('report_ipip50_v1',NULL,NULL,'item','report',$1,'大五人格完整个人探索报告',1290,'CNY',true,
     true,true,true)`,[reportInstrumentId]);
  await db.query(`INSERT INTO billing_products
    (id,tier,period,product_kind,content_kind,content_id,title_zh,amount_minor,currency,enabled)
    VALUES('report_career30_v1',NULL,NULL,'item','report','career-interest-exploration-30',
      '职业兴趣详细探索报告',990,'CNY',false)`);
  // The same single-buyer pilot used by paid resource SKUs also works for
  // premium reports. Never reveal a pilot price or checkout to anonymous or
  // any other WeChat user while the public Native checkout remains disabled.
  const pilotKeys=[
    "SOCTHINK_WECHAT_NATIVE_PRODUCT_APPROVED",
    "SOCTHINK_WECHAT_NATIVE_RECONCILIATION_ENABLED",
    "SOCTHINK_WEB_NATIVE_PAYMENTS_ENABLED",
    "SOCTHINK_PAYMENT_SURFACE","PAYMENT_PROVIDER",
    "SOCTHINK_WECHAT_NATIVE_PILOT_ENABLED",
    "SOCTHINK_WECHAT_NATIVE_PILOT_BUYER_ID",
    "SOCTHINK_WECHAT_NATIVE_PILOT_PRODUCT_ID",
  ] as const;
  const priorPilot=Object.fromEntries(pilotKeys.map(k=>[k,process.env[k]]));
  Object.assign(process.env,{
    SOCTHINK_WECHAT_NATIVE_PRODUCT_APPROVED:"1",
    SOCTHINK_WECHAT_NATIVE_RECONCILIATION_ENABLED:"1",
    SOCTHINK_WEB_NATIVE_PAYMENTS_ENABLED:"0",
    SOCTHINK_PAYMENT_SURFACE:"web-native",PAYMENT_PROVIDER:"wechat_native",
    SOCTHINK_WECHAT_NATIVE_PILOT_ENABLED:"1",
    SOCTHINK_WECHAT_NATIVE_PILOT_BUYER_ID:owner.id,
    SOCTHINK_WECHAT_NATIVE_PILOT_PRODUCT_ID:"report_ipip50_v1",
  });
  const {GET:reportOffer}=await import("../src/app/api/assessment-reports/offer/route");
  const offerUrl="https://socthink.cn/api/assessment-reports/offer?instrumentId="+reportInstrumentId;
  const offerFor=(accountId?:string)=>reportOffer(new NextRequest(offerUrl,{
    headers:accountId?{cookie:parentAuth.PARENT_SESSION_COOKIE+"="+
      parentAuth.createParentSessionToken(accountId)}:{},
  }));
  try {
    const anonymous=await (await offerFor()).json() as {available:boolean;productId?:string};
    assert.equal(anonymous.available,false,"pilot-only pricing must not reach anonymous visitors");
    assert.equal(anonymous.productId,undefined);
    const other=await (await offerFor(stranger.id)).json() as {available:boolean};
    assert.equal(other.available,false,"pilot-only offer cannot reach a different logged-in user");
    const approved=await (await offerFor(owner.id)).json() as
      {available:boolean;productId?:string;priceMinor?:number;owned:boolean};
    assert.equal(approved.available,true);
    assert.equal(approved.productId,"report_ipip50_v1");
    assert.equal(approved.priceMinor,1290,"price must come from server billing ledger");
    assert.equal(approved.owned,false,"pending/unpaid buyer must not be considered entitled");
    process.env.SOCTHINK_WECHAT_NATIVE_PILOT_PRODUCT_ID="report_career30_v1";
    const wrongSku=await (await offerFor(owner.id)).json() as {available:boolean};
    assert.equal(wrongSku.available,false,"pilot whitelist cannot sell a different report");
  } finally {
    for(const key of pilotKeys){
      const value=priorPilot[key];
      if(value===undefined)delete process.env[key];
      else process.env[key]=value;
    }
  }
  await assert.rejects(()=>createBillingOrder(owner.id,"report_career30_v1","wechat_native",consent),
    BillingConflictError);
  const reportOrder=await createBillingOrder(owner.id,"report_ipip50_v1","wechat_native",consent);
  assert.equal(reportOrder.priceMinor,1290);
  assert.equal(await hasVerifiedItemEntitlement(owner.id,"report",reportInstrumentId),false);
  process.env.SOCTHINK_PUBLIC_ORIGIN="https://socthink.cn";
  const {POST:loadPremiumReport}=await import("../src/app/api/assessment-reports/full/route");
  const reportCookie=parentAuth.PARENT_SESSION_COOKIE+"="+parentAuth.createParentSessionToken(owner.id);
  const rawAnswers=Object.fromEntries(Array.from({length:50},(_,i)=>["ipip-50-"+(i+1),3]));
  const premiumBody=JSON.stringify({instrumentId:reportInstrumentId,answers:rawAnswers});
  const premiumRequest=(cookie:string,body=premiumBody)=>new NextRequest(
    "https://socthink.cn/api/assessment-reports/full",{
      method:"POST",headers:{"content-type":"application/json",
        origin:"https://socthink.cn",cookie},
      body
    });
  assert.equal((await loadPremiumReport(premiumRequest(reportCookie))).status,403,
    "unpaid answers cannot receive premium report");
  const verifiedReportReceipt={...receipt(reportOrder.id,"report-paid-01","report-tx-01",1290),
     provider:"wechat_native" as const};
  await assert.rejects(()=>settleVerifiedOrder({...verifiedReportReceipt,amountMinor:999}),
    BillingConflictError);
  assert.equal(await hasVerifiedItemEntitlement(owner.id,"report",reportInstrumentId),false);
  assert.equal((await settleVerifiedOrder(verifiedReportReceipt)).created,true);
  assert.equal(await hasVerifiedItemEntitlement(owner.id,"report",reportInstrumentId),true);
  assert.equal(await hasVerifiedItemEntitlement(stranger.id,"report",reportInstrumentId),false);
  const premiumResponse=await loadPremiumReport(premiumRequest(reportCookie));
  assert.equal(premiumResponse.status,200);
  const fullReport=await premiumResponse.json() as {report:{dimensions:unknown[];kind:string;version:string}};
  assert.equal(fullReport.report.kind,"personal-exploration-report");
  assert.equal(fullReport.report.version,"ipip50-zh-draft-1.0");
  assert.equal(fullReport.report.dimensions.length,5);
  const strangerCookie=parentAuth.PARENT_SESSION_COOKIE+"="+parentAuth.createParentSessionToken(stranger.id);
  assert.equal((await loadPremiumReport(premiumRequest(strangerCookie))).status,403);
  assert.equal((await loadPremiumReport(premiumRequest(reportCookie,
    JSON.stringify({instrumentId:reportInstrumentId,answers:{}})))).status,400);
  await assert.rejects(()=>createBillingOrder(owner.id,"report_ipip50_v1","wechat_native",consent),
    BillingConflictError);
  assert.equal((await refundVerifiedOrder({...verifiedReportReceipt,eventId:"report-refund-01"})).revoked,true);
  assert.equal(await hasVerifiedItemEntitlement(owner.id,"report",reportInstrumentId),false);
  assert.equal((await loadPremiumReport(premiumRequest(reportCookie))).status,403,
    "refund revokes report content access");

  // A downloadable asset is NOT sellable merely because its SKU exists.
  // Exact private bytes, independent asset approval and settled order are required.
  await db.query(`INSERT INTO billing_products
    (id,tier,period,product_kind,content_kind,content_id,title_zh,amount_minor,currency,enabled,
      rights_approved,delivery_verified,access_restricted)
    VALUES('digital_pack_a',NULL,NULL,'item','resource',$1,'原创数学复习清单',299,'CNY',true,
      true,true,true)`,[resourceId]);
  await assert.rejects(()=>createBillingOrder(owner.id,"digital_pack_a","wechat_native",consent),BillingConflictError);
  await db.query(`INSERT INTO billing_resource_assets
    (resource_id,sha256,size_bytes,file_name,mime_type)
    VALUES($1,$2,$3,$4,$5)`,
    [resourceId,digest,bytes.length,fileMeta.file_name,fileMeta.mime_type]);
  await assert.rejects(()=>createBillingOrder(owner.id,"digital_pack_a","wechat_native",consent),BillingConflictError);
  await db.query("UPDATE billing_resource_assets SET rights_approved=true,delivery_verified=true WHERE resource_id=$1",[resourceId]);

  fs.writeFileSync(digestFile,Buffer.alloc(bytes.length,88));
  await assert.rejects(()=>createBillingOrder(owner.id,"digital_pack_a","wechat_native",consent),BillingConflictError);
  fs.writeFileSync(digestFile,bytes);
  // Simultaneous HTTP checkout clicks cannot create two payable QR orders.
  const concurrent=await Promise.allSettled(
    Array.from({length:4},()=>createBillingOrder("par_concurrent01","digital_pack_a","wechat_native",consent)));
  assert.equal(concurrent.filter(x=>x.status==="fulfilled").length,1);
  assert.equal(concurrent.filter(x=>x.status==="rejected"&&x.reason instanceof BillingConflictError).length,3);
  const uniquePending=await db.query<{count:number}>(`
    SELECT COUNT(*)::int AS count FROM billing_orders
     WHERE payer_parent_id='par_concurrent01' AND product_kind='item'
      AND content_kind='resource' AND content_id=$1 AND state='pending'`,[resourceId]);
  assert.equal(uniquePending.rows[0].count,1);
  const pendingId=concurrent.find(x=>x.status==="fulfilled")!.value.id;
  // Even an accidental direct DB transition cannot mark pending as CLOSED
  // without durable provider proof: enforce this at the schema boundary.
  await assert.rejects(()=>db.query(
    "UPDATE billing_orders SET state='closed' WHERE id=$1",[pendingId]));
  const proof={orderId:pendingId,
    payloadSha256:crypto.createHash("sha256").update("official-signed-closed").digest("hex"),
    verifiedAt:new Date(),signatureVerified:true as const,
    providerClosedConfirmed:true as const};
  await assert.rejects(()=>closeVerifiedNativeOrder({...proof,providerClosedConfirmed:false as never}),
    BillingConflictError);
  assert.equal((await closeVerifiedNativeOrder(proof)).closed,true);
  assert.equal((await closeVerifiedNativeOrder(proof)).closed,false);
  assert.equal((await db.query("SELECT state FROM billing_orders WHERE id=$1",[pendingId])).rows[0].state,"closed");
  // Only a signed official closed query can release the pending slot.
  const reopened=await createBillingOrder("par_concurrent01","digital_pack_a","wechat_native",consent);
  assert.ok(reopened.id!==pendingId);
  const closeEvidence=await db.query<{
    closed_at:Date|null;close_provider_payload_sha256:string|null
  }>("SELECT closed_at,close_provider_payload_sha256 FROM billing_orders WHERE id=$1",
    [pendingId]);
  assert.ok(closeEvidence.rows[0].closed_at);
  assert.equal(closeEvidence.rows[0].close_provider_payload_sha256,proof.payloadSha256);
  await settleVerifiedOrder({...receipt(reopened.id,"reopen-paid-01","reopen-tx-01",299),
    provider:"wechat_native" as const});
  await assert.rejects(()=>closeVerifiedNativeOrder({...proof,orderId:reopened.id}),
    BillingConflictError);
  assert.equal(await hasVerifiedItemEntitlement("par_concurrent01","resource",resourceId),true);
  const resourceOrder=await createBillingOrder(owner.id,"digital_pack_a","wechat_native",consent);
  assert.equal(resourceOrder.priceMinor,299);
  assert.equal((await downloadResource(authed(owner.id),target)).status,403);
  const resourceReceipt={...receipt(resourceOrder.id,"resource-paid-01","resource-tx-01",299),
    provider:"wechat_native" as const};
  await settleVerifiedOrder(resourceReceipt);
  // Versioned content is immutable after any real sale, even if SKU is edited.
  await assert.rejects(()=>db.query(
    "UPDATE billing_resource_assets SET sha256=$1 WHERE resource_id=$2",
    ["a".repeat(64),resourceId]));
  await assert.rejects(()=>db.query(
    "DELETE FROM billing_resource_assets WHERE resource_id=$1",[resourceId]));
  assert.equal(await hasVerifiedItemEntitlement(owner.id,"resource",resourceId),true);
  await assert.rejects(()=>createBillingOrder(owner.id,"digital_pack_a","wechat_native",consent),BillingConflictError);
  assert.equal((await downloadResource(authed(stranger.id),target)).status,403);
  const delivery=await downloadResource(authed(owner.id),target);
  assert.equal(delivery.status,200);
  assert.deepEqual(Buffer.from(await delivery.arrayBuffer()),bytes);
  assert.equal(delivery.headers.get("Cache-Control"),"private, no-store, max-age=0");
  assert.match(delivery.headers.get("Content-Disposition")||"",/filename\*=UTF-8''/);
  assert.equal(delivery.headers.get("Content-Type"),"text/plain");
  const traversal=await downloadResource(authed(owner.id),{
    params:Promise.resolve({resourceId:"../etc/passwd"})
  });
  assert.equal(traversal.status,404);
  fs.writeFileSync(digestFile,Buffer.alloc(bytes.length,33));
  assert.equal((await downloadResource(authed(owner.id),target)).status,503);
  fs.unlinkSync(digestFile);
  const substitute=path.join(dir,"substitute.txt");
  fs.writeFileSync(substitute,bytes);
  fs.symlinkSync(substitute,digestFile);
  assert.equal((await downloadResource(authed(owner.id),target)).status,503);
  fs.unlinkSync(digestFile);
  fs.writeFileSync(digestFile,bytes);
  assert.equal((await downloadResource(authed(owner.id),target)).status,200);
  await db.query("UPDATE billing_resource_assets SET rights_approved=false WHERE resource_id=$1",[resourceId]);
  assert.equal((await downloadResource(authed(owner.id),target)).status,503);
  await db.query("UPDATE billing_resource_assets SET rights_approved=true WHERE resource_id=$1",[resourceId]);
  await refundVerifiedOrder({...resourceReceipt,eventId:"resource-refund-01"});
  assert.equal(await hasVerifiedItemEntitlement(owner.id,"resource",resourceId),false);
  // A verified refund releases the unique slot so the buyer can repurchase.
  const repurchase=await createBillingOrder(owner.id,"digital_pack_a","wechat_native",consent);
  assert.ok(repurchase.id!==resourceOrder.id);
  await assert.rejects(()=>createBillingOrder(owner.id,"digital_pack_a","wechat_native",consent),
    BillingConflictError);
  assert.equal((await downloadResource(authed(owner.id),target)).status,403);
  fs.rmSync(dir,{recursive:true,force:true});
  fs.rmSync(userdir,{recursive:true,force:true});

  // Native payment uses the exact same PostgreSQL orders and entitlements.
  const native=await createBillingOrder("par_native01","plus_month","wechat_native",consent);
  assert.equal((await db.query("SELECT provider FROM billing_orders WHERE id=$1",[native.id])).rows[0].provider,"wechat_native");
  const beforeAttempt=await db.query(
    "SELECT reconcile_checked_at FROM billing_orders WHERE id=$1",[native.id]);
  assert.equal(beforeAttempt.rows[0].reconcile_checked_at,null);
  await db.query("UPDATE billing_orders SET reconcile_checked_at=now() WHERE id=$1",[native.id]);
  assert.ok((await db.query(
    "SELECT reconcile_checked_at IS NOT NULL AS checked FROM billing_orders WHERE id=$1",
    [native.id])).rows[0].checked);
  // Signed callbacks ACK only after durable order-row storage; a callback
  // is NOT a verified payment and must never grant entitlements on its own.
  const signedNotice={
    orderId:native.id,eventId:"notify-native-001",
    transactionId:"native-tx-01",amountMinor:3900,currency:"CNY" as const,
    payloadSha256:crypto.createHash("sha256").update("official-signed-callback-fixture").digest("hex"),
    signatureVerified:true as const,signedTradeMatched:true as const,
  };
  assert.equal(await recordVerifiedNativeNotification(signedNotice),"recorded");
  assert.equal(await recordVerifiedNativeNotification(signedNotice),"recorded");
  const storedNotice=await db.query(
    "SELECT state,notification_transaction_id,notification_event_id,notification_received_at IS NOT NULL AS received,reconcile_checked_at FROM billing_orders WHERE id=$1",
    [native.id]);
  assert.equal(storedNotice.rows[0].state,"pending");
  assert.equal(storedNotice.rows[0].notification_transaction_id,"native-tx-01");
  assert.equal(storedNotice.rows[0].notification_event_id,"notify-native-001");
  assert.equal(storedNotice.rows[0].received,true);
  assert.equal(storedNotice.rows[0].reconcile_checked_at,null);
  assert.equal((await verifiedGrantsForParent("par_native01")).length,0);
  await assert.rejects(()=>recordVerifiedNativeNotification({
    ...signedNotice,amountMinor:3901,
  }),BillingConflictError);
  await assert.rejects(()=>recordVerifiedNativeNotification({
    ...signedNotice,transactionId:"native-tx-conflict",
  }),BillingConflictError);
  await assert.rejects(()=>recordVerifiedNativeNotification({
    ...signedNotice,payloadSha256:"invalid",
  }),BillingConflictError);
  await assert.rejects(()=>recordVerifiedNativeNotification({
    ...signedNotice,signatureVerified:false as never,
  }),BillingConflictError);
  await assert.rejects(()=>recordVerifiedNativeNotification({
    ...signedNotice,orderId:one.id,
  }),BillingConflictError);
  const nativeReceipt={...receipt(native.id,"native-paid-01","native-tx-01"),provider:"wechat_native" as const};
  assert.equal((await settleVerifiedOrder(nativeReceipt)).created,true);
  assert.equal((await settleVerifiedOrder(nativeReceipt)).created,false);
  assert.equal(await recordVerifiedNativeNotification(signedNotice),"already_settled");
  assert.equal((await verifiedGrantsForParent("par_native01")).length,1);
  assert.equal((await refundVerifiedOrder({...nativeReceipt,eventId:"native-refund-01"})).revoked,true);
  assert.equal((await verifiedGrantsForParent("par_native01")).length,0);
  assert.equal(await recordVerifiedNativeNotification(signedNotice),"already_settled");
  await assert.rejects(()=>settleVerifiedOrder({...nativeReceipt,provider:"wechat_pay"}),BillingConflictError);

  const two=await createBillingOrder("par_test01","plus_month");
  const renewal=await settleVerifiedOrder(receipt(two.id,"paid-02","wx-02"));
  assert.equal(renewal.created,true);
  const terms=await db.query("SELECT starts_at,ends_at FROM billing_entitlements WHERE payer_parent_id='par_test01' ORDER BY starts_at");
  assert.equal(terms.rows.length,2);
  assert.ok(new Date(terms.rows[1].starts_at).getTime()>=new Date(terms.rows[0].ends_at).getTime());
  assert.equal((await verifiedGrantsForParent("par_attacker")).length,0);

  await linkVerifiedFamilyMember("par_test01","stu_test01",new Date());
  assert.deepEqual(await verifiedParentsForStudent("stu_test01"),["par_test01"]);
  assert.deepEqual(await verifiedParentsForStudent("stu_stranger"),[]);

  // Concurrent reservations must not overdraw the bucket.
  const day=new Date("2026-10-08T00:00:00Z");
  const end=new Date("2026-10-09T00:00:00Z");
  const quota={parentId:"par_test01",capability:"solution_ai",periodStart:day,periodEnd:end,capacity:2,units:1};
  const attempts=await Promise.allSettled(Array.from({length:4},(_,i)=>
    consumeUsage({...quota,idempotencyKey:"req-"+i,actionId:"job-"+i})));
  assert.equal(attempts.filter(x=>x.status==="fulfilled").length,2);
  assert.equal(attempts.filter(x=>x.status==="rejected" && x.reason instanceof BillingQuotaExceededError).length,2);
  const bucket=(await db.query("SELECT used,capacity FROM billing_usage_buckets WHERE payer_parent_id='par_test01'")).rows[0];
  assert.deepEqual(bucket,{used:2,capacity:2});
  const duplicate=await consumeUsage({...quota,idempotencyKey:"req-0",actionId:"job-0"});
  assert.equal(duplicate.duplicated,true);
  await assert.rejects(()=>consumeUsage({...quota,idempotencyKey:"req-0",actionId:"different"}),BillingConflictError);

  // Simultaneous replays of one idempotency key only consume one unit.
  const sameKey={...quota,capability:"quota_replay",capacity:1,idempotencyKey:"replay-key",actionId:"same-job"};
  const replays=await Promise.all([
    consumeUsage(sameKey),
    consumeUsage(sameKey),
  ]);
  assert.equal(replays.filter(x=>!x.duplicated).length,1);
  assert.equal(replays.filter(x=>x.duplicated).length,1);
  assert.equal((await db.query("SELECT used FROM billing_usage_buckets WHERE capability='quota_replay'")).rows[0].used,1);

  // Refund ends entitlement without deleting historical learning data.
  const refunded=await refundVerifiedOrder(receipt(one.id,"refund-01","wx-01"));
  assert.equal(refunded.revoked,true);
  assert.equal((await refundVerifiedOrder(receipt(one.id,"refund-01","wx-01"))).revoked,false);
  assert.equal((await verifiedGrantsForParent("par_test01")).length,0); // renewal starts after first term
  await refundVerifiedOrder(receipt(two.id,"refund-02","wx-02"));
  assert.equal((await db.query("SELECT count(*)::int AS count FROM billing_entitlements WHERE revoked_at IS NOT NULL")).rows[0].count,3);
  await assert.rejects(()=>settleVerifiedOrder(receipt(one.id,"paid-new","wx-01")),BillingConflictError);
  console.log("BILLING_LEDGER_PASS order-payment, renewal, refund, owner isolation, 4-way quota concurrency, idempotency");
}
run().then(()=>closeBillingPoolForTests()).catch(async e=>{
  console.error("BILLING_LEDGER_FAIL",e);await closeBillingPoolForTests();process.exitCode=1;
});
