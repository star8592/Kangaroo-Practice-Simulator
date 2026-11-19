import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/** Test-only signed approval for a *generated synthetic QA* file.
 * Production archived papers (maa-amc8-*), real sellers and public assets
 * are intentionally rejected even if a caller accidentally invokes this.
 */
export function configureSyntheticMarketplaceRights(examId:string,examFile:string,qaBase:string):void{
  if(!/^amc8-original-qa-[a-z0-9_-]{4,40}$/.test(examId))
    throw Error("QA_ONLY_EXAM_ID_REQUIRED");
  if(!path.isAbsolute(examFile)||!path.isAbsolute(qaBase))throw Error("QA_PATH_NOT_ABSOLUTE");
  const raw=fs.readFileSync(examFile);
  const b=JSON.parse(raw.toString("utf8"));
  const p=b?.profile;
  if(p?.id!==examId||p?.sourceLabel!=="Generated synthetic QA arithmetic; never for sale"||
     p?.rightsPolicy?.rightsClass!=="original-verified"||
     p?.rightsPolicy?.license!=="synthetic-qa-original-only")
    throw Error("QA_SOURCE_NOT_SYNTHETIC");
  const dir=path.join(qaBase,"rights");
  fs.mkdirSync(dir,{recursive:true,mode:0o700});
  fs.chmodSync(dir,0o700);
  const key=crypto.randomBytes(32).toString("hex");
  const approvedAt=Date.now();
  const license=p.rightsPolicy.license;
  const contentSha256=crypto.createHash("sha256").update(raw).digest("hex");
  const reviewer="qa-only";
  const message=["v1",examId,contentSha256,license,String(approvedAt),reviewer].join("|");
  const signature=crypto.createHmac("sha256",key).update(message).digest("hex");
  fs.writeFileSync(path.join(dir,examId+".json"),
    JSON.stringify({v:1,examId,contentSha256,license,approvedAt,reviewer,signature}),
    {flag:"wx",mode:0o600});
  process.env.SOCTHINK_MARKETPLACE_RIGHTS_REVIEW_SECRET=key;
  process.env.SOCTHINK_MARKETPLACE_RIGHTS_REVIEW_DIR=dir;
}
