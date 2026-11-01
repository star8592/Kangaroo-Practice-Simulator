import {billingConfigured,billingPool} from "@/lib/billing-ledger";
import {resourceFileSizeMatches} from "@/lib/digital-resource-file";

/** Read-only inventory: only verified rights and immutable private files.
 * Checkout remains the sole source of paid orders and entitlements.
 */
export type StoreProduct=Readonly<{
  id:string;
  title:string;
  priceMinor:number;
  fileName:string;
  sizeBytes:number;
  resourceId:string;
}>;

type ProductRow={
  id:string;title_zh:string;amount_minor:string;file_name:string;
  size_bytes:string;resource_id:string;sha256:string;mime_type:string;
};

async function queryStoreProducts(targetId?:string, strict=false):Promise<StoreProduct[]> {
  if(!billingConfigured())return [];
  try{
    const result=await billingPool().query<ProductRow>(
      "SELECT p.id,p.title_zh,p.amount_minor::text,"+
      " a.file_name,a.size_bytes::text,a.resource_id,a.sha256,a.mime_type"+
      " FROM billing_products p JOIN billing_resource_assets a ON p.content_id=a.resource_id"+
      " WHERE p.enabled=true AND p.product_kind='item'"+
      " AND p.content_kind='resource' AND p.currency='CNY'"+
      " AND p.amount_minor>0 AND p.access_restricted=true"+
      " AND p.rights_approved=true AND p.delivery_verified=true"+
      " AND a.rights_approved=true AND a.delivery_verified=true"+
      " AND p.title_zh IS NOT NULL"+
      (targetId?" AND p.id=$1":"")+
      " ORDER BY p.created_at DESC,p.id DESC LIMIT "+(targetId?"1":"240"),
      targetId?[targetId]:[]
    );
    const products:StoreProduct[]=[];
    for(const row of result.rows){
      const priceMinor=Number(row.amount_minor);
      const sizeBytes=Number(row.size_bytes);
      if(!/^[A-Za-z0-9_.-]{4,120}$/.test(row.id) ||
         !Number.isSafeInteger(priceMinor)||priceMinor<=0 ||
         !Number.isSafeInteger(sizeBytes)||sizeBytes<=0)continue;
      if(!await resourceFileSizeMatches({
        sha256:row.sha256,size_bytes:row.size_bytes,
        file_name:row.file_name,mime_type:row.mime_type
      }))continue;
      products.push({id:row.id,title:row.title_zh,
        priceMinor,fileName:row.file_name,sizeBytes,resourceId:row.resource_id});
    }
    return products;
  }catch(error){
    // The public shop stays safely empty on failure; the admin dashboard must
    // report source unavailability instead of presenting a fabricated zero.
    if(strict)throw new Error("Store product catalogue unavailable",{cause:error});
    return [];
  }
}

export type StorefrontAvailability = Readonly<{
  status:"available"|"not_configured"|"unavailable";
  visibleItems:number|null;
}>;
export async function readStorefrontAvailability():Promise<StorefrontAvailability> {
  if(!billingConfigured())return {status:"not_configured",visibleItems:null};
  try {
    const items=await queryStoreProducts(undefined,true);
    return {status:"available",visibleItems:items.length};
  } catch {
    return {status:"unavailable",visibleItems:null};
  }
}

export async function listStoreProducts():Promise<StoreProduct[]>{
  return queryStoreProducts();
}

export async function findStoreProduct(id:string):Promise<StoreProduct|null>{
  if(!/^[A-Za-z0-9_.-]{4,120}$/.test(id))return null;
  return (await queryStoreProducts(id))[0]??null;
}
