import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {getSeoMonitorDashboard} from "../src/lib/seo-monitor-store";
import {importOfficialSeoReport} from "./import_seo_official_report";
import {
  seoOfficialReportsPath, readOfficialSeoReports, validOfficialSeoRecord,
  summarizeOfficialSeoProvider,
} from "../src/lib/seo-official-reports";

const dir=fs.mkdtempSync(path.join(os.tmpdir(),"socthink-seo-official-test-"));
const prior=process.env.SOCTHINK_SEO_DATA_DIR;
try {
  process.env.SOCTHINK_SEO_DATA_DIR=path.join(dir,"seo");
  const input=path.join(dir,"normalized.json");
  const evidence=path.join(dir,"original-google-export.csv");
  const now=new Date("2026-11-18T04:00:00Z");
  fs.writeFileSync(evidence,"query,clicks,impressions\nenglish,4,120\n",{mode:0o600});
  assert.equal(readOfficialSeoReports().status,"missing");
  const base={
    site:"https://socthink.cn",provider:"google",source:"google_search_analytics_api",
    periodStart:"2026-11-16",periodEnd:"2026-11-17",metrics:{clicks:4,impressions:120},
  };
  fs.writeFileSync(input,JSON.stringify(base));
  const imported=importOfficialSeoReport(input,evidence,now);
  assert.equal(imported.records,2);
  assert.equal(readOfficialSeoReports().status,"ok");
  assert.equal(fs.statSync(seoOfficialReportsPath()).mode & 0o777,0o600);
  const stats=getSeoMonitorDashboard().providers.find(p=>p.id==="google");
  assert.equal(stats?.clicks,4);
  assert.equal(stats?.impressions,120);
  assert.equal(stats?.indexCount,null);
  assert.equal(stats?.sourceStatus,"reported");
  assert.ok(stats?.source.includes("Google Search Console"));
  const again=importOfficialSeoReport(input,evidence,now);
  assert.equal(again.totalRecords,2);
  const stale=summarizeOfficialSeoProvider("google",readOfficialSeoReports().reports,"ok",new Date("2026-12-02T00:00:00Z"));
  assert.equal(stale.status,"stale");
  assert.equal(stale.clicks,4);
  fs.writeFileSync(input,JSON.stringify({...base,site:"https://another.example"}));
  assert.throws(()=>importOfficialSeoReport(input,evidence,now),/INVALID_PROVIDER/);
  fs.writeFileSync(input,JSON.stringify({...base,source:"baidu_index_report_export"}));
  assert.throws(()=>importOfficialSeoReport(input,evidence,now),/INVALID_PROVIDER/);
  assert.equal(validOfficialSeoRecord({...readOfficialSeoReports().reports[0],value:-1}),false);
  assert.equal(validOfficialSeoRecord({...readOfficialSeoReports().reports[0],evidenceSha256:"no-proof"}),false);
  fs.writeFileSync(seoOfficialReportsPath(),"{broken");
  assert.equal(readOfficialSeoReports().status,"invalid");
  const invalid=getSeoMonitorDashboard().providers.find(p=>p.id==="google");
  assert.equal(invalid?.clicks,null);
  assert.equal(invalid?.sourceStatus,"read_error");
  console.log("SEO_OFFICIAL_REPORT=PASS source_gates=true evidence_sha256=true imported=2 no_fabricated_index=true stale_and_corrupt_visible=true");
} finally {
  if(prior===undefined) delete process.env.SOCTHINK_SEO_DATA_DIR;
  else process.env.SOCTHINK_SEO_DATA_DIR=prior;
  fs.rmSync(dir,{recursive:true,force:true});
}
