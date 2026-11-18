import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {readVerifiedBotAudit,validVerifiedBotAudit} from "../src/lib/seo-bot-audit-store";
import {getSeoMonitorDashboard} from "../src/lib/seo-monitor-store";

const dir=fs.mkdtempSync(path.join(os.tmpdir(),"seo-bot-audit-unit-"));
const prev=process.env.SOCTHINK_SEO_DATA_DIR;
process.env.SOCTHINK_SEO_DATA_DIR=dir;
const filename=path.join(dir,"seo-verified-bots.json");
try {
  assert.equal(readVerifiedBotAudit().status,"missing");
  const record={
    observedAt:"2026-11-18T03:20:00Z",windowDays:7,
    source:"nginx_access_logs",method:"reverse_forward_dns",
    providers:{
      google:{verifiedRequests:20,verifiedPublicPage200:5,distinctPublicPages200:3,publicPageErrors:0,lastVerifiedAt:"2026-11-18T02:10:00Z",samplePublicPaths:["/","/english"]},
      bing:{verifiedRequests:6,verifiedPublicPage200:2,distinctPublicPages200:1,publicPageErrors:0,lastVerifiedAt:"2026-11-17T13:00:00Z",samplePublicPaths:["/"]},
      baidu:{verifiedRequests:0,verifiedPublicPage200:0,distinctPublicPages200:0,publicPageErrors:0,lastVerifiedAt:null,samplePublicPaths:[]},
    }
  };
  fs.writeFileSync(filename,JSON.stringify(record));
  assert.equal(readVerifiedBotAudit().status,"ok");
  assert.equal(readVerifiedBotAudit().report?.providers.google.distinctPublicPages200,3);
  assert.equal(getSeoMonitorDashboard().providers.find(x=>x.id==="google")?.indexCount,null);
  assert.equal(getSeoMonitorDashboard().providers.find(x=>x.id==="google")?.clicks,null);
  assert.equal(validVerifiedBotAudit({...record,providers:{...record.providers,google:{...record.providers.google,samplePublicPaths:["/admin/users"]}}}),false);
  assert.equal(validVerifiedBotAudit({...record,providers:{...record.providers,google:{...record.providers.google,distinctPublicPages200:99}}}),false);
  assert.equal(validVerifiedBotAudit({...record,providers:{...record.providers,google:{...record.providers.google,ip:"66.249.70.110"}}}),false);
  fs.writeFileSync(filename,"{bad");
  assert.equal(readVerifiedBotAudit().status,"invalid");
  console.log("SEO_VERIFIED_BOT_STORE=PASS unknown_not_zero=true no_ips=true validated_counts=true");
} finally {
  if(prev === undefined) delete process.env.SOCTHINK_SEO_DATA_DIR;
  else process.env.SOCTHINK_SEO_DATA_DIR=prev;
  fs.rmSync(dir,{recursive:true,force:true});
}
