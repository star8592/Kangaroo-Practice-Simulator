/**
 * Single event-driven Rust catalogue promotion (offline operations only).
 *
 * Input: a candidate public-metadata snapshot produced after the authorized
 * question-content publication. The only live writer is the established
 * atomic snapshot writer; this script signals Rust and verifies the in-memory
 * generation before acknowledging success. No cron, database, or Next API.
 *
 * Example:
 * npx tsx scripts/promote_rust_catalog_snapshot.ts
 *   --candidate /var/lib/socthink/catalog/candidate.json
 *   --snapshot /var/lib/socthink/catalog/current.json
 *   --rust-url http://127.0.0.1:37871
 *   --service socthink-catalog.service
 *
 * For isolated E2E tests, replace --service with --pid <owned Rust PID>.
 */
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {writeCatalogSnapshotAtomic,type TrainingCatalogSnapshot} from "./lib/catalog-snapshot-atomic";

type Options={candidate:string;snapshot:string;url:string;pid?:number;service?:string;allowShrink:boolean};
type LiveStatus={schemaVersion:number;generatedAt:string;rows:number};
const MAX_BYTES=64*1024*1024;
const MAX_ROWS=5000;
const ALLOWED_FIELDS=new Set(["id","titleZh","titleEn","competition","competitionZh","year","gradeBand","gradeZh","gradeEn","paperType","questionCount","durationMinutes","examUrl"]);
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

function options():Options{
 const argv=process.argv.slice(2);
 const args=new Map<string,string>();
 let allowShrink=false;
 for(let i=0;i<argv.length;i++){
  const flag=argv[i];
  if(flag==="--allow-shrink"){allowShrink=true;continue;}
  if(!["--candidate","--snapshot","--rust-url","--pid","--service"].includes(flag)||!argv[i+1]||argv[i+1].startsWith("--"))
   throw new Error("INVALID_CATALOG_PROMOTION_ARGUMENT:"+flag);
  if(args.has(flag))throw new Error("DUPLICATE_ARGUMENT:"+flag);
  args.set(flag,argv[++i]);
 }
 for(const flag of ["--candidate","--snapshot","--rust-url"])if(!args.has(flag))throw new Error("MISSING_ARGUMENT:"+flag);
 if(Number(args.has("--service"))+Number(args.has("--pid"))!==1)
  throw new Error("Exactly one of --service or --pid must be specified");
 const url=args.get("--rust-url")!;
 if(!/^http:\/\/127\.0\.0\.1:[0-9]{2,5}$/.test(url)||!(Number(new URL(url).port)>0&&Number(new URL(url).port)<=65535))
  throw new Error("Rust runtime status must use literal loopback HTTP");
 const service=args.get("--service");
 if(service && service!=="socthink-catalog.service")throw new Error("Unexpected systemd service");
 const pidString=args.get("--pid");
 const pid=pidString===undefined?undefined:Number(pidString);
 if(pid!==undefined&&(!Number.isSafeInteger(pid)||pid<=1))throw new Error("Invalid Rust process pid");
 const candidate=args.get("--candidate")!,snapshot=args.get("--snapshot")!;
 if(!path.isAbsolute(candidate)||!path.isAbsolute(snapshot)||candidate===snapshot||!candidate.endsWith(".json")||!snapshot.endsWith(".json"))
  throw new Error("Candidate and active snapshots must be distinct absolute JSON paths");
 return {candidate,snapshot,url,pid,service,allowShrink};
}

function readSnapshot(filename:string):TrainingCatalogSnapshot{
 const stat=fs.lstatSync(filename);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>MAX_BYTES||stat.size<16)
  throw new Error("Unsafe/non-regular catalogue file");
 const raw=fs.readFileSync(filename,"utf8");
 const data:unknown=JSON.parse(raw);
 if(!data||typeof data!=="object"||Array.isArray(data))throw new Error("Invalid snapshot root");
 const input=data as Record<string,unknown>;
 if(Object.keys(input).sort().join(",")!=="generatedAt,rows,version"||input.version!==1
   ||typeof input.generatedAt!=="string"||!Number.isFinite(Date.parse(input.generatedAt))
   ||!Array.isArray(input.rows)||!input.rows.length||input.rows.length>MAX_ROWS)
  throw new Error("Invalid snapshot version/timestamp/row count");
 const ids=new Set<string>();
 for(const item of input.rows){
  if(!item||typeof item!=="object"||Array.isArray(item))throw new Error("Invalid resource row");
  const row=item as Record<string,unknown>;
  if(Object.keys(row).some(key=>!ALLOWED_FIELDS.has(key)))throw new Error("Forbidden data field in public catalogue");
  for(const f of ["id","titleZh","titleEn","competition","competitionZh","gradeZh","gradeEn","paperType","examUrl"])
   if(typeof row[f]!=="string"||!(row[f] as string).trim())throw new Error("Missing catalogue field "+f);
  if(ids.has(row.id as string))throw new Error("Duplicate catalogue ID");
  ids.add(row.id as string);
  if(!Number.isSafeInteger(row.questionCount)||Number(row.questionCount)<1||
     !["past","sample","smart","practice","unspecified"].includes(row.paperType as string)||
     !/^\/exam\/[a-zA-Z0-9%_.-]+$/.test(row.examUrl as string)||(row.examUrl as string).includes(".."))
   throw new Error("Invalid training-ready catalogue metadata");
 }
 return data as TrainingCatalogSnapshot;
}

async function runtimeStatus(url:string):Promise<LiveStatus>{
 const response=await fetch(url+"/internal/catalog/status",{
  headers:{"accept":"application/json"},cache:"no-store",signal:AbortSignal.timeout(1500)
 });
 if(response.status!==200)throw new Error("RUST_CATALOG_STATUS_HTTP_"+response.status);
 const data:unknown=await response.json();
 if(!data||typeof data!=="object")throw new Error("Malformed Rust live status");
 const status=data as Partial<LiveStatus>;
 if(status.schemaVersion!==1||typeof status.generatedAt!=="string"||
   !Number.isSafeInteger(status.rows)||Number(status.rows)<1)
  throw new Error("Invalid Rust live status");
 return status as LiveStatus;
}

async function awaitActive(url:string,wanted:TrainingCatalogSnapshot,timeoutMs=5000){
 const deadline=Date.now()+timeoutMs;
 let last="unknown";
 do{
  try{
   const status=await runtimeStatus(url);
   if(status.generatedAt===wanted.generatedAt&&status.rows===wanted.rows.length)return status;
   last="actual="+status.generatedAt+"/"+status.rows;
  }catch(e){last=String(e)}
  await sleep(125);
 }while(Date.now()<deadline);
 throw new Error("RUST_CATALOG_ACTIVE_GENERATION_NOT_CONFIRMED "+last);
}

function signalRust(o:Options){
 if(o.pid)process.kill(o.pid,"SIGHUP");
 else execFileSync("systemctl",["kill","--signal=HUP","--kill-who=main",o.service!],{stdio:"pipe",timeout:4000});
}

async function main(){
 const o=options();
 const before=readSnapshot(o.snapshot),after=readSnapshot(o.candidate);
 if(after.generatedAt===before.generatedAt||Date.parse(after.generatedAt)<=Date.parse(before.generatedAt))
  throw new Error("Candidate must have newer generation timestamp");
 if(!o.allowShrink&&after.rows.length<before.rows.length)
  throw new Error("Refusing catalogue inventory shrink without explicit --allow-shrink");
 await awaitActive(o.url,before,1700); // Do not publish into an unknown or already drifted runtime.
 let published=false;
 try{
  const result=writeCatalogSnapshotAtomic(o.snapshot,after);
  published=true;
  signalRust(o);
  await awaitActive(o.url,after);
  console.log("RUST_CATALOG_PROMOTION=PASS activeRows="+after.rows.length+
   " generatedAt="+after.generatedAt+" sha256="+result.sha256);
 }catch(error){
  if(published){
   try{
    const restored=writeCatalogSnapshotAtomic(o.snapshot,before);
    signalRust(o);
    await awaitActive(o.url,before);
    console.error("RUST_CATALOG_PROMOTION=ROLLED_BACK lastGoodRows="+before.rows.length+
      " sha256="+restored.sha256);
   }catch(restoreError){
    console.error("RUST_CATALOG_PROMOTION=ROLLBACK_NOT_CONFIRMED "+String(restoreError));
   }
  }
  throw error;
 }
}
main().catch(e=>{console.error("RUST_CATALOG_PROMOTION=FAILED "+String(e));process.exitCode=1});
