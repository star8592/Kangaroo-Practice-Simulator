/**
 * Controlled, one-shot import of a normalized official webmaster report.
 *
 * Usage:
 *   tsx scripts/import_seo_official_report.ts --input /private/summary.json --evidence /private/original-export.csv
 *
 * The normalized summary MUST be transcribed from the cited official API/export
 * and audited by the operator. This script does not independently authenticate
 * the contents of the original report; it records a SHA256 trace for later audit.
 * The output is private, never served from public/, and never stores API keys.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  type OfficialSeoRecord, type OfficialSeoMetric, type OfficialSeoSource,
  readOfficialSeoReports, seoOfficialReportsPath, validOfficialSeoRecord,
} from "../src/lib/seo-official-reports";

type ImportRequest = {
  site: string;
  provider: string;
  source: OfficialSeoSource;
  periodStart: string;
  periodEnd: string;
  metrics: Partial<Record<OfficialSeoMetric, number>>;
};

function parseArgs(argv: readonly string[]): {input: string; evidence: string} {
  const opts: Record<string,string> = {};
  for (let i=0;i<argv.length;i+=2) {
    if (!["--input","--evidence"].includes(argv[i]) || !argv[i+1]) throw new Error("USE_--input_AND_--evidence");
    opts[argv[i].slice(2)]=argv[i+1];
  }
  if (!opts.input || !opts.evidence || Object.keys(opts).length !== 2)
    throw new Error("MISSING_INPUT_OR_EVIDENCE");
  return {input:opts.input,evidence:opts.evidence};
}

export function importOfficialSeoReport(inputFile: string, evidenceFile: string, now=new Date()) {
  const inputSize = fs.statSync(inputFile).size;
  const evidenceSize = fs.statSync(evidenceFile).size;
  if (inputSize < 10 || inputSize > 100_000 || evidenceSize < 1 || evidenceSize > 10_000_000)
    throw new Error("INPUT_OR_EVIDENCE_SIZE_OUT_OF_RANGE");
  const obj: unknown = JSON.parse(fs.readFileSync(inputFile,"utf8"));
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) throw new Error("INVALID_IMPORT_RECORD");
  const r = obj as ImportRequest;
  if (!r.metrics || typeof r.metrics !== "object" || Array.isArray(r.metrics))
    throw new Error("MISSING_METRICS");
  const pairs = Object.entries(r.metrics);
  if (!pairs.length || pairs.length > 3) throw new Error("INVALID_METRIC_SET");
  const evidenceHash = crypto.createHash("sha256").update(fs.readFileSync(evidenceFile)).digest("hex");
  const rows = pairs.map(([metric,value])=>({
    site:r.site,
    provider:r.provider,
    source:r.source,
    metric,
    value,
    periodStart:r.periodStart,
    periodEnd:r.periodEnd,
    importedAt:now.toISOString(),
    evidenceSha256:evidenceHash,
  }));
  if (rows.some(x=>!validOfficialSeoRecord(x))) throw new Error("INVALID_PROVIDER_METRIC_OR_SOURCE");
  const filename = seoOfficialReportsPath();
  const directory = path.dirname(filename);
  fs.mkdirSync(directory,{recursive:true,mode:0o700});
  const lock=filename+".lock";
  // Serialize the read/merge/replace transaction; never read outside the lock.
  const lockFd=fs.openSync(lock,"wx",0o600);
  const temp=filename+".tmp-"+process.pid;
  try {
    const existing = readOfficialSeoReports();
    if (existing.status === "invalid" || existing.status === "unreadable")
      throw new Error("REFUSING_TO_OVERWRITE_CORRUPT_OFFICIAL_LEDGER");
    const combined: OfficialSeoRecord[] = [...existing.reports];
    for (const item of rows as OfficialSeoRecord[]) {
      const index = combined.findIndex(x=>x.provider===item.provider &&
        x.metric===item.metric && x.periodStart===item.periodStart &&
        x.periodEnd===item.periodEnd && x.source===item.source);
      if (index>=0) combined[index] = item;
      else combined.push(item);
    }
    if (combined.length>2200) throw new Error("OFFICIAL_LEDGER_RETENTION_LIMIT");
    fs.writeFileSync(temp,JSON.stringify(combined,null,2)+"\n",{mode:0o600,flag:"wx"});
    fs.renameSync(temp,filename);
    return {provider:r.provider,records:rows.length,totalRecords:combined.length,evidenceSha256:evidenceHash};
  } finally {
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
    fs.closeSync(lockFd);
    fs.unlinkSync(lock);
  }
}

if (process.argv[1] && /import_seo_official_report\.ts$/.test(process.argv[1])) {
  try {
    const args=parseArgs(process.argv.slice(2));
    const result=importOfficialSeoReport(args.input,args.evidence);
    console.log("SEO_OFFICIAL_IMPORT=PASS");
    console.log(JSON.stringify(result));
  } catch(error) {
    console.error("SEO_OFFICIAL_IMPORT=FAIL "+String(error instanceof Error?error.message:error));
    process.exitCode=2;
  }
}
