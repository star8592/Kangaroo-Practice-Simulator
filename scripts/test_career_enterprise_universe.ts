import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  getCareerEnterprises,validateCareerEnterpriseUniverse,
  enterpriseIdForMarketTicker,summarizeCareerEnterprises,
  searchCareerEnterprises
} from "../src/lib/career-enterprise-universe";
import {parseIssuerCsv,importOfficialIssuerCsv,importSecTickerExchangeJson,
  buildIssuerSnapshot} from "../src/lib/career-market-import";
import {validateCareerDemandSignals,listCareerDemandFamilies} from "../src/lib/career-demand";

assert.deepEqual(validateCareerEnterpriseUniverse(),[]);
assert.deepEqual(validateCareerDemandSignals(),[]);

const list=getCareerEnterprises(),stats=summarizeCareerEnterprises();
assert.equal(stats.knownGroups,list.length);
assert(stats.knownGroups>=19);
assert(stats.listingReferences>stats.knownGroups/2);
assert(stats.inChinaForeign>=3);
assert(stats.jointVentures>=1);
assert.equal(stats.actualVacanciesVerified,0,"issuer universe is not live recruiting data");
assert.equal(enterpriseIdForMarketTicker("HKEX","09999"),"cn-multi-netease");
assert.equal(enterpriseIdForMarketTicker("NASDAQ","NTES"),"cn-multi-netease");
assert.equal(enterpriseIdForMarketTicker("NASDAQ","JD"),"cn-multi-jd");
assert.equal(enterpriseIdForMarketTicker("HKEX","09618"),"cn-multi-jd");
assert.equal(enterpriseIdForMarketTicker("NASDAQ","AAPL"),null);
assert.equal(enterpriseIdForMarketTicker("HKEX","00700"),"cn-hk-tencent");
assert.equal(searchCareerEnterprises("华晨宝马").length,1);
assert.equal(searchCareerEnterprises("NTES").length,1);
assert.equal(searchCareerEnterprises("德国不确定企业").length,0);
assert(searchCareerEnterprises("","foreign_china_operation").length>=3);
assert.equal(list.filter(x=>x.id==="cn-multi-netease").length,1);
assert(list.find(x=>x.id==="jv-bmw-brilliance")?.parentGroupNames.length===2);
assert(list.some(x=>x.entityKind==="china_unlisted_key_employer"));

const csv="code,issuer_name,security_type\r\n" +
  "00700,Tencent Holdings,EQUITY\r\n" +
  "09999,\"NetEase, Inc\",EQUITY\r\n" +
  "02800,ETF tracker,ETF\r\n"+
  "00700,Tencent Holdings,EQUITY\r\n" +
  "XBAD$$,Invalid Security,EQUITY\r\n";
assert.deepEqual(parseIssuerCsv(csv)[2],["09999","NetEase, Inc","EQUITY"]);
const h=importOfficialIssuerCsv(csv,"HKEX");
assert.equal(h.length,2,"must reject ETFs and dedupe repeated securities");
assert.equal(h.find(x=>x.ticker==="00700")?.verifiedChinaEntityId,"cn-hk-tencent");
assert.equal(h.find(x=>x.ticker==="09999")?.verifiedChinaEntityId,"cn-multi-netease");
assert.equal(importOfficialIssuerCsv("code,issuer_name,security_type\n600028,中国石化,EQUITY\n","SSE")[0].verifiedChinaEntityId,"cn-sse-sinopec");
assert.throws(()=>importOfficialIssuerCsv("name,ticker\na,b","HKEX"),/REQUIRED_COLUMNS/);

const sec=JSON.stringify({fields:["cik","name","ticker","exchange"],data:[
  [10001,"NetEase Inc","NTES","Nasdaq"],
  [10002,"Apple Inc","AAPL","Nasdaq"],
  [10003,"JD.com Inc","JD","Nasdaq"],
  [10004,"Some NYSE issuer","SOME","NYSE"],
  [10005,"No OTC Company","UNKNOWN","OTC"]
]});
const secRecords=importSecTickerExchangeJson(sec);
assert.equal(secRecords.length,4);
assert.equal(secRecords.find(x=>x.ticker==="AAPL")?.verifiedChinaEntityId,null,
  "US listed companies are not automatically China related");
assert.equal(secRecords.find(x=>x.ticker==="NTES")?.verifiedChinaEntityId,"cn-multi-netease");
assert(!secRecords.some(x=>x.ticker==="UNKNOWN"));
const staged=buildIssuerSnapshot({
  input:sec,sourceUrl:"https://www.sec.gov/files/company_tickers_exchange.json",
  snapshotAt:"2026-11-01",sourceType:"sec-json"
});
assert.equal(staged.statistics.issuerSecurityCandidates,4);
assert.equal(staged.statistics.linkedToVerifiedChinaEntities,2);
assert.equal(staged.statistics.unclassified,2);
assert.equal(staged.sourceSha256.length,64);
assert.equal(staged.disclaimer.includes("NOT confirmed Chinese"),true);
const groups=listCareerDemandFamilies();
assert(groups.some(x=>x.signals.some(s=>s.companyId==="fie-schneider-cn"&&s.evidenceLevel==="job")));
assert(groups.some(x=>x.signals.some(s=>s.companyId==="jv-bmw-brilliance"&&s.evidenceLevel==="process")));

const page=fs.readFileSync(path.join(process.cwd(),"src/app/career/companies/page.tsx"),"utf8");
assert(page.includes("searchCareerEnterprises"));
assert(page.includes("中国岗位"));
assert(!page.includes('href="/shop"'));
console.log("CAREER_COMPANY_UNIVERSE_TEST=PASS",JSON.stringify(stats));
