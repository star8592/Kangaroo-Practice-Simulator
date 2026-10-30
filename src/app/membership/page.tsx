import { cookies } from "next/headers";
import { parentFromSessionToken, PARENT_SESSION_COOKIE } from "@/lib/parent-auth";
import { attachVerifiedBilling } from "@/lib/access-context-server";
import { effectivePlan, type AccessContext } from "@/lib/access-policy";
import MembershipClient from "./MembershipClient";
import {nativeCheckoutAllowed} from "@/lib/wechat-native-flags";
import {billingPool} from "@/lib/billing-ledger";
import type {PublishedMembershipOffer} from "./NativeCheckoutPanel";
import {isExamBundleTrainingReady,loadTrainingExamBundle} from "@/lib/training-question-bank";

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
      }>(`SELECT id,tier,period,product_kind,content_kind,content_id,title_zh,
          amount_minor,currency FROM billing_products
        WHERE enabled=true AND amount_minor>0 AND currency='CNY'
          AND (product_kind='subscription' OR
            (product_kind='item' AND rights_approved=true AND delivery_verified=true
              AND access_restricted=true))
        ORDER BY product_kind, id`);
      offers=rows.rows.flatMap((p):PublishedMembershipOffer[]=>{
        const priceMinor=Number(p.amount_minor);
        if(!Number.isSafeInteger(priceMinor)||priceMinor<=0)return [];
        if(p.product_kind==="subscription"){
          if(!p.tier || !p.period)return [];
          return [{kind:"subscription",id:p.id,tier:p.tier,period:p.period,
            priceMinor,currency:"CNY"}];
        }
        // Only sell a real training-ready paper. File-resource delivery is
        // deliberately held back until a verified download entitlement exists.
        if(process.env.SOCTHINK_ITEM_ACCESS_ENFORCED!=="1" ||
           p.content_kind!=="exam" || !p.content_id || !p.title_zh)return [];
        try{
          if(!isExamBundleTrainingReady(loadTrainingExamBundle(p.content_id)))return [];
          return [{kind:"item",id:p.id,contentKind:"exam",contentId:p.content_id,
            titleZh:p.title_zh,priceMinor,currency:"CNY"}];
        }catch{return [];}
      });
    } catch { offers=[]; }
  }
  return <MembershipClient plan={plan}
    ledgerAvailable={available} offers={offers} accountLoggedIn={identity.kind==="parent"}/>;
}
