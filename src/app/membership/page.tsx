import { cookies } from "next/headers";
import { parentFromSessionToken, PARENT_SESSION_COOKIE } from "@/lib/parent-auth";
import { attachVerifiedBilling } from "@/lib/access-context-server";
import { effectivePlan, type AccessContext } from "@/lib/access-policy";
import MembershipClient from "./MembershipClient";
import {nativeCheckoutAllowed} from "@/lib/wechat-native-flags";
import {billingPool} from "@/lib/billing-ledger";
import type {PublishedMembershipOffer} from "./NativeCheckoutPanel";
import {isExamBundleTrainingReady,loadTrainingExamBundle} from "@/lib/training-question-bank";
import {resourceFileSizeMatches} from "@/lib/digital-resource-file";

export const dynamic = "force-dynamic";

export default async function MembershipPage() {
  const jar = await cookies();
  const parent = parentFromSessionToken(jar.get(PARENT_SESSION_COOKIE)?.value);
  // One WeChat purchaser is the only public billing subject. The historical
  // DB column payer_parent_id is an internal legacy name, not another account.
  const identity:AccessContext=parent?.active&&(parent.wechatId||parent.wechatOpenId)
    ? {kind:"parent",accountId:parent.id} : {kind:"anonymous"};
  let plan = effectivePlan(identity);
  let available=true;
  try { plan=effectivePlan(await attachVerifiedBilling(identity)); }
  catch { available=false; }
  // Never advertise a pay button without explicit merchant approval,
  // real billing database, and genuinely enabled server-side SKUs.
  let offers: PublishedMembershipOffer[]=[];
  if (nativeCheckoutAllowed() && available) {
    try {
      const rows=await billingPool().query<{
        id:string;tier:"plus"|"pro"|null;period:"month"|"year"|null;
        product_kind:"subscription"|"item";content_kind:"exam"|"resource"|null;
        content_id:string|null;title_zh:string|null;
        amount_minor:string;currency:string;
        asset_sha:string|null;asset_size:string|null;
        asset_filename:string|null;asset_mime:string|null;
        asset_approved:boolean|null;asset_delivery:boolean|null;
      }>(`SELECT p.id,p.tier,p.period,p.product_kind,p.content_kind,p.content_id,
          p.title_zh,p.amount_minor,p.currency,
          a.sha256 AS asset_sha,a.size_bytes::text AS asset_size,
          a.file_name AS asset_filename,a.mime_type AS asset_mime,
          a.rights_approved AS asset_approved,a.delivery_verified AS asset_delivery
        FROM billing_products p LEFT JOIN billing_resource_assets a
          ON p.product_kind='item' AND p.content_kind='resource'
             AND p.content_id=a.resource_id
        WHERE p.enabled=true AND p.amount_minor>0 AND p.currency='CNY'
          AND (p.product_kind='subscription' OR
            (p.product_kind='item' AND p.rights_approved=true
              AND p.delivery_verified=true AND p.access_restricted=true))
        ORDER BY p.product_kind, p.id LIMIT 50`);
      for (const p of rows.rows) {
        const priceMinor=Number(p.amount_minor);
        if(!Number.isSafeInteger(priceMinor)||priceMinor<=0)continue;
        if(p.product_kind==="subscription"){
          if(p.tier && p.period)
            offers.push({kind:"subscription",id:p.id,tier:p.tier,period:p.period,
              priceMinor,currency:"CNY"});
          continue;
        }
        if(process.env.SOCTHINK_ITEM_ACCESS_ENFORCED!=="1" ||
           !p.title_zh || !p.content_id)continue;
        if(p.content_kind==="exam"){
          try{
            if(isExamBundleTrainingReady(loadTrainingExamBundle(p.content_id)))
              offers.push({kind:"item",id:p.id,contentKind:"exam",contentId:p.content_id,
                titleZh:p.title_zh,priceMinor,currency:"CNY"});
          }catch{ /* Missing training papers are not for sale. */ }
        }else if(p.content_kind==="resource" && p.asset_approved && p.asset_delivery &&
                 p.asset_sha && p.asset_size && p.asset_filename && p.asset_mime){
          if(await resourceFileSizeMatches({sha256:p.asset_sha,
              size_bytes:p.asset_size,file_name:p.asset_filename,mime_type:p.asset_mime}))
            offers.push({kind:"item",id:p.id,contentKind:"resource",contentId:p.content_id,
              titleZh:p.title_zh,priceMinor,currency:"CNY",
              fileName:p.asset_filename,sizeBytes:Number(p.asset_size)});
        }
      }
    } catch { offers=[]; }
  }
  return <MembershipClient plan={plan}
    ledgerAvailable={available} offers={offers} accountLoggedIn={identity.kind==="parent"}/>;
}
