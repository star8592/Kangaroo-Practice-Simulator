import type {NextRequest} from "next/server";

/** Validate a browser action against explicitly allowed SOC THINK origins.
 * Next may rewrite req.url to an internal localhost origin behind a proxy.
 * Never trust an arbitrary x-forwarded-host value as sufficient proof.
 */
export function trustedFamilyActionOrigin(req:NextRequest):boolean{
 const raw=req.headers.get("origin");
 if(!raw)return false;
 try{
  const origin=new URL(raw);
  if(origin.username||origin.password||origin.pathname!=="/"||origin.search||origin.hash)return false;
  const url=new URL(req.url);
  if(origin.origin===url.origin)return true;
  if(origin.protocol==="https:"&&
    (origin.hostname==="socthink.cn"||origin.hostname==="www.socthink.cn")&&
    (!origin.port||origin.port==="443"))return true;
  // Local testing only: production cannot authorize arbitrary loopback origins.
  if(process.env.NODE_ENV!=="production"&&origin.protocol==="http:"&&
     (origin.hostname==="localhost"||origin.hostname==="127.0.0.1")&&
     (url.hostname==="localhost"||url.hostname==="127.0.0.1"))return true;
 }catch{return false}
 return false;
}
