import assert from "node:assert/strict";
import fs from "node:fs";
import {getInstrument,INSTRUMENTS} from "../src/lib/measurement-center";
import {buildDetailedReport,GUIDANCE} from "../src/lib/assessment-report-detail";
for(const instrument of INSTRUMENTS){
 const answers=Object.fromEntries(instrument.items.map(q=>[q.id,3]));
 const result=buildDetailedReport(instrument,answers,new Date("2026-11-01T03:00:00Z"));
 assert.equal(result.instrumentId,instrument.id);
 assert.equal(result.itemCount,instrument.items.length);
 assert.equal(result.version,instrument.version);
 assert.equal(result.generatedAt,"2026-11-01T03:00:00.000Z");
 assert.equal(result.dimensions.length,instrument.factors.length);
 assert.equal(result.consistencyNotes.length,3);
 assert.equal(result.priorities.length,3);
 for(const d of result.dimensions){
  assert(d.mean===3 && d.answered===(instrument.id.startsWith("ipip")?10:5));
  assert.equal(d.reverseItems,instrument.items.filter(x=>x.factor===d.id&&x.reverse).length);
  assert(d.insight.length>=16&&d.opportunity.length>=16&&d.caution.length>=16);
  assert(d.experiment.length>=16&&d.check.length>=16);
  assert(d.examples.length>=1);
  for(const ex of d.examples){
   const item=instrument.items.find(q=>q.text===ex.text);
   assert(item && item.factor===d.id,"examples are real source questions");
   assert.equal(ex.keyedResponse,item.reverse?6-ex.response:ex.response);
  }
 }
 const weighted={...answers,[instrument.items[0].id]:5};
 const result2=buildDetailedReport(instrument,weighted);
 assert.notDeepEqual(result.dimensions[0].mean,result2.dimensions[0].mean);
 assert.throws(()=>buildDetailedReport(instrument,{}),/INCOMPLETE/);
 assert.throws(()=>buildDetailedReport(instrument,{...answers,extra:1}),/invalid response/i);
 assert.throws(()=>buildDetailedReport(instrument,{...answers,[instrument.items[0].id]:7}),/invalid response/i);
 assert(result.restrictions.some(x=>x.includes("心理")));
 assert(result.consistencyNotes.some(x=>x.includes("常模")));
}
assert.equal(Object.keys(GUIDANCE).length,11);
const endpoint=fs.readFileSync("src/app/api/assessment-reports/full/route.ts","utf8");
assert(endpoint.indexOf("hasVerifiedItemEntitlement")<endpoint.indexOf("buildDetailedReport(instrument,answers)"));
assert(endpoint.includes("PREMIUM_REPORT_REQUIRES_VERIFIED_PAYMENT"));
assert(endpoint.includes('"noindex, nofollow"'));
const offer=fs.readFileSync("src/app/api/assessment-reports/offer/route.ts","utf8");
assert(offer.includes("amount_minor::text"),"published price must come from billing SQL");
assert(offer.includes("enabled=true"));
assert(offer.includes("nativeCheckoutAllowed()"));
const ui=fs.readFileSync("src/components/MeasurementRunner.tsx","utf8");
assert(ui.includes("你的免费简要结果") && ui.includes("ReportPremiumPanel"));
assert(!ui.includes("打印本页报告"),"old free detailed print shortcut removed");
const premium=fs.readFileSync("src/components/ReportPremiumPanel.tsx","utf8");
assert(premium.includes("DIGITAL_SALES_POLICY_VERSION")&&premium.includes("/api/payments/wechat/checkout"));
assert(premium.includes("remainingQrSeconds(deadline,performance.now())"),"report checkout must hide QR according to monotonic deadline");
assert(!premium.includes("localStorage")&&!premium.includes("sessionStorage"));
const migrated=fs.readFileSync("ops/db/009_assessment_report_rights.sql","utf8");
assert(migrated.includes("'report'")&&migrated.includes("BEGIN;")&&migrated.includes("COMMIT;"));
const sql=fs.readFileSync("src/app/assessment-center/sql-lab/page.tsx","utf8");
assert(sql.includes('permanentRedirect("/skill-labs/sql-lab")'));
assert(getInstrument("career-interest-exploration-30"));
console.log("REPORT_V4=PASS instruments=2 dimensions=11 raw_evidence=REAL gated=LEDGER price=SERVER_ONLY details=PAID schema=REPORT_MIGRATION sql=SEPARATE");
