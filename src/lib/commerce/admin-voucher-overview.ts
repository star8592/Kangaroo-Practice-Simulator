export const voucherStates=["all","unclaimed","activated","expired","refunded","inconsistent"] as const;
export type VoucherFilter=typeof voucherStates[number];
export type AdminVoucherRow={
 channel:string;
 merchant_id:string;
 order_line_id:string;
 unit_index:number;
 sku:string;
 owner_id:string|null;
 central_order_id:string|null;
 status:string;
 amount_minor:string;
 capacity:number;
 remaining:number|null;
 expires_at:string|null;
};
export type AdminVoucherOverview={
 counts:{
  total:number;
  unclaimed:number;
  activated:number;
  expired:number;
  refunded:number;
  inconsistent:number;
  unclaimed_paid_minor:string;
 };
 rows:AdminVoucherRow[];
 state:VoucherFilter;
 q:string;
 limit:number;
 preview:boolean;
};
export function parseVoucherFilters(input:{state?:unknown;q?:unknown}){
 const state=typeof input.state==="string"&&voucherStates.includes(input.state as VoucherFilter)?input.state as VoucherFilter:"all";
 const q=typeof input.q==="string"?input.q.trim().slice(0,128):"";
 return {state,q};
}

/**
 * Presentation-layer transport only. Voucher SQL, owner authorization and
 * ledger reads are owned by the internal Rust commerce service.
 */
export async function readAdminVoucherOverview(
 input:{state?:unknown;q?:unknown},
 sessionToken:string|undefined,
):Promise<AdminVoucherOverview|null>{
 const rawBase=process.env.SOCTHINK_RUST_COMMERCE_INTERNAL_URL?.trim()||"http://127.0.0.1:37872";
 if(!sessionToken)return null;
 try{
  const base=new URL(rawBase);
  if(base.protocol!=="http:"||!(base.hostname==="127.0.0.1"||base.hostname==="localhost"))return null;
  const filters=parseVoucherFilters(input);
  const url=new URL("/api/platform/admin/commerce",base);
  url.searchParams.set("state",filters.state);
  if(filters.q)url.searchParams.set("q",filters.q);
  const response=await fetch(url,{
   headers:{cookie:"socthink_parent_session="+sessionToken},
   cache:"no-store",
   signal:AbortSignal.timeout(4000),
  });
  if(!response.ok)return null;
  return await response.json() as AdminVoucherOverview;
 }catch{return null;}
}
