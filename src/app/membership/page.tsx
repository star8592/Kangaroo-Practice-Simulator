import { cookies } from "next/headers";
import { parentFromSessionToken, PARENT_SESSION_COOKIE } from "@/lib/parent-auth";
import { attachVerifiedBilling } from "@/lib/access-context-server";
import { effectivePlan, type AccessContext } from "@/lib/access-policy";
import MembershipClient from "./MembershipClient";
import {nativeCheckoutAllowed} from "@/lib/wechat-native-flags";
import {billingPool} from "@/lib/billing-ledger";
import type {PublishedMembershipOffer} from "./NativeCheckoutPanel";

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
        id:string;tier:"plus"|"pro";period:"month"|"year";
        amount_minor:string;currency:string;
      }>("SELECT id,tier,period,amount_minor,currency FROM billing_products WHERE enabled=true AND amount_minor>0 AND currency='CNY' ORDER BY tier,period");
      offers=rows.rows.filter(p=>Number.isSafeInteger(Number(p.amount_minor)) &&
        Number(p.amount_minor)>0).map(p=>({
          id:p.id,tier:p.tier,period:p.period,
          priceMinor:Number(p.amount_minor),currency:"CNY" as const,
        }));
    } catch { offers=[]; }
  }
  return <MembershipClient plan={plan}
    ledgerAvailable={available} offers={offers} accountLoggedIn={identity.kind==="parent"}/>;
}
