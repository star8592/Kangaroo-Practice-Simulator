import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
 getSeoMonitorDashboard,readSeoHistory,seoMonitorHistoryPath,
} from "../src/lib/seo-monitor-store";

const home=fs.mkdtempSync(path.join(os.tmpdir(),"socthink-seo-dashboard-"));
const seo=path.join(home,"seo");
const identities=path.join(home,"user-identities");
const previousSeo=process.env.SOCTHINK_SEO_DATA_DIR;
const previousUser=process.env.SOCTHINK_USER_DATA_DIR;
try{
 fs.mkdirSync(seo,{recursive:true,mode:0o700});
 fs.mkdirSync(identities,{recursive:true,mode:0o700});
 process.env.SOCTHINK_SEO_DATA_DIR=seo;
 process.env.SOCTHINK_USER_DATA_DIR=identities;
 assert.equal(seoMonitorHistoryPath(),path.join(seo,"seo-monitor-snapshots.json"));
 assert.equal(readSeoHistory().sourceStatus,"missing");
 const sample={
  date:new Date().toISOString().slice(0,10),observedAt:new Date().toISOString(),
  sitemapCount:73,checkedCount:73,healthyCount:73,robotsOk:true,failures:[],
 };
 // A sentinel under the identity directory must NOT become the SEO source.
 fs.writeFileSync(path.join(identities,"seo-monitor-snapshots.json"),
  JSON.stringify([{...sample,sitemapCount:999,checkedCount:999,healthyCount:999}]));
 fs.writeFileSync(seoMonitorHistoryPath(),JSON.stringify([sample]),{mode:0o600});
 const dashboard=getSeoMonitorDashboard();
 assert.equal(dashboard.sourceStatus,"ok");
 assert.equal(dashboard.siteStatus,"healthy");
 assert.equal(dashboard.latest?.sitemapCount,73);
 assert.equal(dashboard.latest?.healthyCount,73);
 assert.equal(dashboard.history.length,1);
 assert.ok(dashboard.providers.every(x=>x.indexCount===null&&x.clicks===null&&x.impressions===null));
 fs.writeFileSync(seoMonitorHistoryPath(),"{ invalid json");
 assert.equal(getSeoMonitorDashboard().siteStatus,"read_error");
 assert.equal(getSeoMonitorDashboard().sourceStatus,"invalid");
 fs.writeFileSync(seoMonitorHistoryPath(),JSON.stringify([{...sample,healthyCount:123}]));
 assert.equal(getSeoMonitorDashboard().sourceStatus,"invalid");
 fs.unlinkSync(seoMonitorHistoryPath());
 assert.equal(getSeoMonitorDashboard().sourceStatus,"missing");
 assert.equal(getSeoMonitorDashboard().latest,null);
 console.log("SEO_DASHBOARD_SOURCE=PASS seo_only=true real_samples=73 no_fake_index=true corrupt_visible=true");
}finally{
 if(previousSeo===undefined)delete process.env.SOCTHINK_SEO_DATA_DIR;
 else process.env.SOCTHINK_SEO_DATA_DIR=previousSeo;
 if(previousUser===undefined)delete process.env.SOCTHINK_USER_DATA_DIR;
 else process.env.SOCTHINK_USER_DATA_DIR=previousUser;
 fs.rmSync(home,{recursive:true,force:true});
}
