import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sourcesJson from "../../data/competition-intelligence/watch-sources.json";
import {userDataPath} from "./user-data-store";
import {WORLD_COMPETITIONS} from "./world-competitions";

export type OfficialWatchSource={
  id:string;eventId:string;region:string;label:string;url:string;matchPhrases:string[];
};
export type SourceObservation={
  id:string;sourceId:string;eventId:string;region:string;url:string;label:string;
  observedAt:string;previousDigest:string|null;digest:string;
  summary:string;status:"pending"|"reviewed"|"dismissed";
  reviewedBy?:string;reviewedAt?:string;reviewNote?:string;
};
export type SourceHealth={
  sourceId:string;checkedAt:string;lastSuccessAt?:string;digest?:string;
  etag?:string;lastModified?:string;error?:string;httpStatus?:number;
};
export type WatchStore={version:1;health:SourceHealth[];observations:SourceObservation[]};

const HOSTS=new Set(["maa.org","www.cms.org.cn","amt.edu.au","cemc.uwaterloo.ca","ukmt.org.uk"]);
const SOURCE_DIR=path.resolve(process.env.SOCTHINK_SOURCE_WATCH_DIR?.trim()||
  (process.env.NODE_ENV==="production"
    ? "/var/lib/socthink-competition-source-watch"
    : userDataPath("source-watch")));
const STORE=path.join(SOURCE_DIR,"competition-source-watch.json");
const LOCK=path.join(SOURCE_DIR,"competition-source-watch.lock");
function ensureSourceDataDir(){fs.mkdirSync(SOURCE_DIR,{recursive:true,mode:0o700});}

const MAX_BYTES=800_000;
export const WATCH_SOURCES:OfficialWatchSource[]=sourcesJson;
export const blankWatchStore=():WatchStore=>({version:1,health:[],observations:[]});
export function validateWatchSource(s:OfficialWatchSource){
  try {
    const url=new URL(s.url);
    return url.protocol==="https:"&&HOSTS.has(url.hostname)&&!url.username&&!url.password&&!url.hash&&
      WORLD_COMPETITIONS.some(e=>e.id===s.eventId)&&
      /^[a-z0-9-]+$/.test(s.id)&&s.matchPhrases.length>0&&s.matchPhrases.length<=8&&
      s.matchPhrases.every(x=>typeof x==="string"&&x.length>=4&&x.length<=120);
  }catch{return false;}
}
if(WATCH_SOURCES.some(s=>!validateWatchSource(s))||
  new Set(WATCH_SOURCES.map(s=>s.id)).size!==WATCH_SOURCES.length){
  throw new Error("Unsafe/duplicate official watch-source configuration");
}
export function loadWatchStore():WatchStore{
  if(!fs.existsSync(STORE))return blankWatchStore();
  const obj=JSON.parse(fs.readFileSync(STORE,"utf8")) as WatchStore;
  if(obj.version!==1||!Array.isArray(obj.health)||!Array.isArray(obj.observations)||
    obj.observations.some(x=>!x.id||!["pending","reviewed","dismissed"].includes(x.status)))
    throw new Error("Corrupt source-watch store: refusing to overwrite review evidence");
  return obj;
}
function saveWatchStore(store:WatchStore){
  ensureSourceDataDir();
  const tmp=STORE+".tmp."+process.pid+"."+crypto.randomBytes(4).toString("hex");
  try{
    fs.writeFileSync(tmp,JSON.stringify(store,null,2),{mode:0o600,flag:"wx"});
    fs.renameSync(tmp,STORE);
  }finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}
}
function exclusive<T>(fn:()=>T):T{
  ensureSourceDataDir();
  let fd:number;
  try{fd=fs.openSync(LOCK,"wx",0o600);}
  catch{throw new Error("Source-watch already running or stale lock; refuse concurrent mutations");}
  try{return fn();}
  finally{fs.closeSync(fd);fs.unlinkSync(LOCK);}
}
export function reviewObservation(args:{id:string;decision:"reviewed"|"dismissed";note:string;reviewer:string}){
  if(!args.note.trim()||args.note.length>1000||!args.reviewer.trim())throw new Error("A review reason and reviewer are mandatory");
  return exclusive(()=>{
    const store=loadWatchStore();
    const item=store.observations.find(x=>x.id===args.id);
    if(!item)throw new Error("Unknown observation");
    if(item.status!=="pending")throw new Error("Already decided: review decisions are not silently overwritten");
    item.status=args.decision;
    item.reviewNote=args.note.trim();
    item.reviewedBy=args.reviewer;
    item.reviewedAt=new Date().toISOString();
    saveWatchStore(store);
    // Reviewing a discovered change NEVER promotes an official edition.
    return {...item};
  });
}
const decode=(s:string)=>s.replace(/&(?:nbsp|amp|lt|gt|quot|#39|#x27);/gi,x=>
  ({"&nbsp;":" ","&amp;":"&","&lt;":"<","&gt;":">","&quot;":'"',"&#39;":"'","&#x27;":"'"} as Record<string,string>)[x.toLowerCase()]||" ");
export function sourceFingerprint(html:string,s:OfficialWatchSource){
  const text=decode(html.replace(/<!--[\s\S]*?-->/g," ")
    .replace(/<(script|style|nav|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi," ")
    .replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim());
  const chunks:string[]=[];
  for(const phrase of s.matchPhrases){
    const start=text.toLocaleLowerCase().indexOf(phrase.toLocaleLowerCase());
    if(start>=0)chunks.push(text.slice(Math.max(0,start-80),start+1600));
  }
  if(!chunks.length)throw new Error("Expected official competition terms absent; possible redesign or block page");
  const joined=chunks.join("\n-- anchor --\n");
  if(joined.length<80)throw new Error("Suspiciously short official source content");
  return {digest:crypto.createHash("sha256").update(joined).digest("hex"),
    summary:joined.slice(0,700)};
}
type Fetcher=(input:string,init?:RequestInit)=>Promise<Response>;
async function boundedText(response:Response){
  const len=Number(response.headers.get("content-length")||0);
  if(len>MAX_BYTES)throw new Error("Official source exceeded content length limit");
  const reader=response.body?.getReader();
  if(!reader)throw new Error("Missing HTTP response body");
  const chunks:Uint8Array[]=[];
  let total=0;
  try{
    while(true){
      const x=await reader.read();
      if(x.done)break;
      total+=x.value.byteLength;
      if(total>MAX_BYTES)throw new Error("Official source exceeded streamed byte limit");
      chunks.push(x.value);
    }
  }finally{await reader.cancel().catch(()=>{});}
  return new TextDecoder("utf-8",{fatal:false}).decode(Buffer.concat(chunks));
}
export type WatchRun={checked:number;unchanged:number;newObservations:number;errors:number;pending:number;details:{sourceId:string;result:string}[]};
export async function runSourceWatch(args?:{fetcher?:Fetcher;now?:Date;persist?:boolean;sources?:OfficialWatchSource[]}):Promise<WatchRun>{
  const fetcher=args?.fetcher||fetch;
  const now=args?.now||new Date();
  const sources=args?.sources||WATCH_SOURCES;
  if(sources.some(x=>!validateWatchSource(x)))throw new Error("Unsafe watch source");
  ensureSourceDataDir();
  let fd:number;
  try{fd=fs.openSync(LOCK,"wx",0o600);}
  catch{throw new Error("Source-watch already running or stale lock");}
  try{
    const state=loadWatchStore();
    const result:WatchRun={checked:0,unchanged:0,newObservations:0,errors:0,pending:0,details:[]};
    for(const source of sources){
      result.checked++;
      const health=state.health.find(x=>x.sourceId===source.id)||{sourceId:source.id,checkedAt:""};
      if(!state.health.some(x=>x.sourceId===source.id))state.health.push(health);
      health.checkedAt=now.toISOString();
      const headers:Record<string,string>={
        "User-Agent":"SocThink-Math-Competition-SourceWatch/1.0 (public-pages-only; max-5-sources/6h)",
        Accept:"text/html,application/xhtml+xml",
      };
      if(health.etag)headers["If-None-Match"]=health.etag;
      if(health.lastModified)headers["If-Modified-Since"]=health.lastModified;
      try{
        const response=await fetcher(source.url,{
          method:"GET",redirect:"manual",headers,signal:AbortSignal.timeout(18000),
        });
        health.httpStatus=response.status;
        if(response.status===304&&health.digest){
          health.error=undefined;health.lastSuccessAt=now.toISOString();
          result.unchanged++;result.details.push({sourceId:source.id,result:"not-modified"});
          continue;
        }
        if(response.status!==200)throw new Error("HTTP "+response.status+"; no redirected or blocked content accepted");
        const type=response.headers.get("content-type")?.toLowerCase()||"";
        if(!type.includes("text/html"))throw new Error("Unexpected content type: "+type.slice(0,45));
        const html=await boundedText(response);
        const fingerprint=sourceFingerprint(html,source);
        if(health.digest===fingerprint.digest){
          result.unchanged++;result.details.push({sourceId:source.id,result:"unchanged"});
        }else{
          const id=crypto.createHash("sha256").update(source.id+":"+fingerprint.digest).digest("hex").slice(0,32);
          if(!state.observations.some(x=>x.id===id)){
            if(state.observations.filter(x=>x.status==="pending").length>=250)
              throw new Error("Source review backlog full (250 pending); manual review required");
            state.observations.push({id,sourceId:source.id,eventId:source.eventId,
              region:source.region,url:source.url,label:source.label,observedAt:now.toISOString(),
              previousDigest:health.digest||null,digest:fingerprint.digest,summary:fingerprint.summary,status:"pending"});
            result.newObservations++;
          }
          result.details.push({sourceId:source.id,result:health.digest?"content-changed":"baseline"});
        }
        health.digest=fingerprint.digest;health.lastSuccessAt=now.toISOString();health.error=undefined;
        const etag=response.headers.get("etag"),modified=response.headers.get("last-modified");
        if(etag&&etag.length<=200)health.etag=etag;
        if(modified&&modified.length<=200)health.lastModified=modified;
      }catch(err){
        health.error=err instanceof Error?err.message.slice(0,180):"unknown fetch error";
        result.errors++;
        result.details.push({sourceId:source.id,result:"error:"+health.error});
      }
      if(args?.persist!==false)saveWatchStore(state); // checkpoint successful and error states after each source
    }
    result.pending=state.observations.filter(x=>x.status==="pending").length;
    return result;
  }finally{fs.closeSync(fd);fs.unlinkSync(LOCK);}
}
