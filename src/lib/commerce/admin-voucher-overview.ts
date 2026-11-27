import {billingPool} from "../billing-ledger";
import {voucherPreviewEnabled} from "./voucher-preview";
export const voucherStates=["all","unclaimed","activated","expired","refunded"] as const;
export type VoucherFilter=typeof voucherStates[number];
export function parseVoucherFilters(input:{state?:unknown;q?:unknown}){
 const state=typeof input.state==="string"&&voucherStates.includes(input.state as VoucherFilter)?input.state as VoucherFilter:"all";
 const q=typeof input.q==="string"?input.q.trim().slice(0,128):"";
 return {state,q};
}
type CountRow={total:number;unclaimed:number;activated:number;expired:number;refunded:number;unclaimed_paid_minor:string};
type VoucherRow={channel:string;merchant_id:string;order_line_id:string;unit_index:number;sku:string;owner_id:string|null;central_order_id:string|null;status:string;amount_minor:string;capacity:number;remaining:number|null;expires_at:string};
export async function readAdminVoucherOverview(input:{state?:unknown;q?:unknown}={}){
 if(!voucherPreviewEnabled())throw new Error("Commerce preview unavailable");
 const {state,q}=parseVoucherFilters(input);
 // Snapshot includes paid-but-unclaimed receipts, which have no central order yet.
 // Do not combine the receipt amount with its subsequently linked order amount.
 const result=await billingPool().query<{counts:CountRow;rows:VoucherRow[]}>(`
 WITH vouchers AS (
  SELECT u.channel,u.merchant_id,u.order_line_id,u.unit_index,u.sku,u.owner_id,
   r.central_order_id,r.amount_minor,u.capacity,g.capacity-g.used AS remaining,u.expires_at,u.paid_at,
   CASE WHEN u.revoked_at IS NOT NULL OR o.state='refunded' THEN 'refunded'
    WHEN u.expires_at<=now() THEN 'expired'
    WHEN u.claimed_at IS NOT NULL AND o.state='paid' AND g.revoked_at IS NULL AND g.source_order_id IS NOT NULL THEN 'activated'
    WHEN u.claimed_at IS NULL AND r.central_order_id IS NULL THEN 'unclaimed'
    ELSE 'inconsistent' END AS status
  FROM voucher_draft.units u JOIN voucher_draft.order_receipts r USING(channel,merchant_id,order_line_id,unit_index)
  LEFT JOIN billing_orders o ON o.id=r.central_order_id
  LEFT JOIN exam_access_draft.grants g ON g.source_order_id=r.central_order_id
 ), counts AS (
  SELECT count(*)::int AS total,
   count(*) FILTER(WHERE status='unclaimed')::int AS unclaimed,
   count(*) FILTER(WHERE status='activated')::int AS activated,
   count(*) FILTER(WHERE status='expired')::int AS expired,
   count(*) FILTER(WHERE status='refunded')::int AS refunded,
   count(*) FILTER(WHERE status='inconsistent')::int AS inconsistent,
   COALESCE(sum(amount_minor) FILTER(WHERE status='unclaimed'),0)::text AS unclaimed_paid_minor
  FROM vouchers
 ), selected AS (
  SELECT channel,merchant_id,order_line_id,unit_index,sku,owner_id,central_order_id,status,
   amount_minor::text,capacity,remaining,expires_at
  FROM vouchers WHERE ($1='all' OR status=$1)
  AND ($2='' OR order_line_id=$2 OR central_order_id=$2 OR owner_id=$2)
  ORDER BY paid_at DESC,channel,merchant_id,order_line_id,unit_index LIMIT 100
 )
 SELECT (SELECT row_to_json(counts) FROM counts) AS counts,
 COALESCE((SELECT json_agg(selected) FROM selected),'[]'::json) AS rows
 `,[state,q]);
 return {...result.rows[0],state,q,limit:100,preview:true};
}
