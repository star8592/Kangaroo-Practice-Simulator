import type {ResourceListing} from "@/lib/resource-catalog";

/**
 * Web-server presentation adapter for the Rust-owned resource catalogue.
 *
 * This does NOT decide training-readiness, exercise rights, exam authorization
 * or commercial entitlements. Rust returns only already-approved metadata.
 * Keep the Rust API on 127.0.0.1; do not let request input select upstreams.
 */
const PAGE_SIZE=100;
const MAX_ROWS=5000;
const FETCH_TIMEOUT_MS=2500;
const RUST_INTERNAL_URL_ENV="SOCTHINK_RUST_CATALOG_INTERNAL_URL";

export class RustCatalogUnavailable extends Error {
  constructor(reason:string) {
    super("RUST_CATALOG_UNAVAILABLE:"+reason);
    this.name="RustCatalogUnavailable";
  }
}

function upstreamBase():string {
  const raw=process.env[RUST_INTERNAL_URL_ENV]?.trim();
  if(!raw)throw new RustCatalogUnavailable("upstream-not-configured");
  // No custom hosts, paths, userinfo or query: protect all SSR calls from SSRF.
  if(!/^http:\/\/127\.0\.0\.1:[0-9]{2,5}\/?$/.test(raw))
    throw new RustCatalogUnavailable("non-loopback-upstream-disallowed");
  const u=new URL(raw);
  const port=Number(u.port);
  if(port<1||port>65535)throw new RustCatalogUnavailable("invalid-port");
  return u.origin;
}

type RustCatalogPage={
  total:number;
  offset:number;
  limit:number;
  hasMore:boolean;
  items:ResourceListing[];
};

function isValidRow(v:unknown):v is ResourceListing {
  if(!v||typeof v!=="object")return false;
  const row=v as Partial<ResourceListing>;
  return typeof row.id==="string"&&row.id.length>0&&row.id.length<=200
    &&typeof row.titleZh==="string"&&row.titleZh.length>0
    &&typeof row.titleEn==="string"&&row.titleEn.length>0
    &&typeof row.competition==="string"&&typeof row.competitionZh==="string"
    &&typeof row.gradeZh==="string"&&typeof row.gradeEn==="string"
    &&(row.gradeBand===null||typeof row.gradeBand==="string")
    &&(row.year===null||(Number.isSafeInteger(row.year)&&Number(row.year)>1900))
    &&["past","sample","smart","practice","unspecified"].includes(String(row.paperType))
    &&Number.isSafeInteger(row.questionCount)&&Number(row.questionCount)>0
    &&(row.durationMinutes===null||(Number.isSafeInteger(row.durationMinutes)&&Number(row.durationMinutes)>0))
    &&typeof row.examUrl==="string"&&/^\/exam\/[a-zA-Z0-9%_.-]+$/.test(row.examUrl)
    &&!row.examUrl.includes("..");
}

function validPage(input:unknown,expectedOffset:number):RustCatalogPage {
  if(!input||typeof input!=="object")throw new RustCatalogUnavailable("invalid-payload");
  const p=input as Partial<RustCatalogPage>;
  if(!Number.isSafeInteger(p.total)||p.total===undefined||p.total<1||p.total>MAX_ROWS)
    throw new RustCatalogUnavailable("invalid-total");
  if(p.offset!==expectedOffset||p.limit!==PAGE_SIZE||!Array.isArray(p.items)
    ||p.items.length>PAGE_SIZE||typeof p.hasMore!=="boolean"
    ||!p.items.every(isValidRow))
    throw new RustCatalogUnavailable("invalid-page");
  const expectedCount=Math.min(PAGE_SIZE,p.total-expectedOffset);
  if(expectedCount<1||p.items.length!==expectedCount
    ||p.hasMore!==(expectedOffset+p.items.length<p.total))
    throw new RustCatalogUnavailable("incomplete-page");
  return p as RustCatalogPage;
}

async function getPage(base:string,offset:number,fetcher:typeof fetch):Promise<RustCatalogPage> {
  const url=base+"/v1/catalog/resources?limit="+PAGE_SIZE+"&offset="+offset;
  let response:Response;
  try {
    response=await fetcher(url,{cache:"no-store",signal:AbortSignal.timeout(FETCH_TIMEOUT_MS)});
  }catch {
    throw new RustCatalogUnavailable("upstream-unreachable");
  }
  if(!response.ok)throw new RustCatalogUnavailable("upstream-status-"+response.status);
  let payload:unknown;
  try {payload=await response.json();}catch{throw new RustCatalogUnavailable("invalid-json");}
  return validPage(payload,offset);
}

/** SSR data for the existing public catalogue UI. No TS catalogue fallback. */
export async function readRustTrainingCatalog(fetcher:typeof fetch=fetch):Promise<ResourceListing[]> {
  const base=upstreamBase();
  const first=await getPage(base,0,fetcher);
  const pages=Math.ceil(first.total/PAGE_SIZE);
  const batches=await Promise.all(Array.from({length:pages-1},(_,i)=>getPage(base,(i+1)*PAGE_SIZE,fetcher)));
  const all=[...first.items,...batches.flatMap(p=>{
    if(p.total!==first.total)throw new RustCatalogUnavailable("snapshot-changed-during-read");
    return p.items;
  })];
  if(all.length!==first.total||new Set(all.map(x=>x.id)).size!==all.length)
    throw new RustCatalogUnavailable("catalog-not-consistent");
  // "smart" is not a published exercise paper. The old resources UI excluded it.
  return all.filter(row=>row.paperType!=="smart");
}
