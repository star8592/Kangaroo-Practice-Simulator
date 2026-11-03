"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import NativeCheckoutPanel,{type PublishedMembershipOffer} from "@/app/membership/NativeCheckoutPanel";
import styles from "./career-interview.module.css";
type ServiceOffer=Extract<PublishedMembershipOffer,{kind:"service"}>;
type OfferResponse={available:boolean;loggedIn:boolean;offers:ServiceOffer[];
 remainingSessions?:number;perUseRemaining?:number;monthlyRemaining?:number;
 monthlyActiveUntil?:string|null;activeSessions?:number;reason?:string|null};
export default function CareerInterviewPurchasePanel({profileId}:{profileId:string}){
 const [offer,setOffer]=useState<OfferResponse|null>(null);
 const [error,setError]=useState(false);
 const [requestNo,setRequestNo]=useState(0);
 useEffect(()=>{
  let active=true;
  fetch("/api/career/interviews/offer?profileId="+encodeURIComponent(profileId),{cache:"no-store"})
   .then(async r=>{if(!r.ok)throw Error("OFFER_UNAVAILABLE");return r.json();})
   .then(data=>{
    if(!active)return;
    if(!data||typeof data!=="object"||!Array.isArray(data.offers))throw Error("INVALID_OFFER");
    const validated=data.offers.filter((x:unknown):x is ServiceOffer=>{
     if(!x||typeof x!=="object")return false;
     const value=x as Record<string,unknown>;
     return value.kind==="service"&&value.contentKind==="career_interview"&&
       value.contentId===profileId&&(value.billingMode==="monthly"||value.billingMode==="per_use")&&
       typeof value.id==="string"&&typeof value.titleZh==="string"&&
       Number.isSafeInteger(value.priceMinor)&&Number(value.priceMinor)>0&&
       Number.isInteger(value.sessions)&&Number(value.sessions)>=1&&
       Number(value.sessions)<=(value.billingMode==="monthly"?60:20)&&value.currency==="CNY";
    });
    setOffer({...data,offers:validated});setError(false);
   })
   .catch(()=>{if(active){setError(true);setOffer(null);}});
  return()=>{active=false;};
 },[profileId,requestNo]);
 const offers=offer?.offers||[];
 const trial=offers.filter(o=>o.billingMode==="per_use");
 const monthly=offers.filter(o=>o.billingMode==="monthly");
 const label=(items:ServiceOffer[],monthlyMode:boolean)=>items.length
  ? items.map(x=>`${x.sessions}场 · ¥${(x.priceMinor/100).toFixed(2)}`).join(" / ")
  :monthlyMode?"每30天含明确的使用场次":"按购买的场次数使用";
 const until=offer?.monthlyActiveUntil?new Date(offer.monthlyActiveUntil):null;
 return <section className={styles.purchasePanel} aria-label="AI模拟面试收费方式">
  <div className={styles.purchaseHeading}>
   <h3>专业 AI 面试</h3>
   <span>{offer?.available?"按次或包月，自主选择":"付费服务准备中"}</span>
  </div>
  <div className={styles.purchasePlans}>
   <div><strong>按次购买</strong><p>{label(trial,false)}</p><small>场次用完再买，不按月到期</small></div>
   <div><strong>包月购买</strong><p>{label(monthly,true)}</p><small>30天有效，含套餐场次；不自动续费</small></div>
  </div>
  {offer?.loggedIn&&typeof offer.remainingSessions==="number"&&
   <p className={styles.purchaseCredits} role="status">
    可用 {offer.remainingSessions} 场（按次 {offer.perUseRemaining??0} · 本月 {offer.monthlyRemaining??0}）
    {(offer.activeSessions??0)>0&&` · 正在进行 ${offer.activeSessions} 场`}
    {until&&Number.isFinite(until.getTime())&&
     ` · 月度权益截至 ${until.toLocaleDateString("zh-CN",{timeZone:"Asia/Shanghai"})}（北京时间）`}
   </p>}
  {offer?.available&&offers.length>0&&<>
   {!offer.loggedIn&&<p className={styles.small}>
    <Link href={"/login?next="+encodeURIComponent("/career/interviews/"+profileId)}>微信登录后购买</Link>
   </p>}
   <NativeCheckoutPanel offers={offers} accountLoggedIn={offer.loggedIn}
    compact successHref={"/career/interviews/"+profileId}/>
   <p className={styles.small}>付款后返回本页加载已购权益；只有实际通过微信支付核验的订单才会发放场次。</p>
  </>}
  {(!offer?.available||offers.length===0)&&<p className={styles.small}>
   {error?"购买资格查询暂不可用，免费练习仍可继续。":
    "当前尚未开放 AI 面试购买，以下免费结构化练习可正常使用。"}
   {error&&<button className={styles.retryOffer} type="button" onClick={()=>setRequestNo(x=>x+1)}>重试查询</button>}
  </p>}
 </section>;
}
