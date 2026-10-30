"use client";

import {useEffect,useState} from "react";
import Image from "next/image";
import Link from "next/link";
import {useSiteLanguage} from "@/lib/site-language";
import styles from "./MembershipPage.module.css";

export type PublishedMembershipOffer=Readonly<
  {kind:"subscription";id:string;tier:"plus"|"pro";period:"month"|"year";priceMinor:number;currency:"CNY"}
  | {kind:"item";id:string;contentKind:"exam";contentId:string;titleZh:string;priceMinor:number;currency:"CNY"}
>;

type CheckoutReply={
  orderId?:string;qrDataUrl?:string;code?:string;error?:string;
  status?:string;priceMinor?:number;currency?:string;
};

export default function NativeCheckoutPanel({offers,accountLoggedIn}:{
  offers:readonly PublishedMembershipOffer[];accountLoggedIn:boolean;
}) {
  const en=useSiteLanguage()==="en";
  const [pendingId,setPendingId]=useState<string|null>(null);
  const [qrDataUrl,setQrDataUrl]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);
  const [state,setState]=useState<"idle"|"pending"|"paid"|"failed">("idle");
  const [message,setMessage]=useState<string>("");

  useEffect(()=>{
    if (!pendingId || state!=="pending") return;
    let closed=false;
    const check=async()=>{
      try {
        const r=await fetch("/api/payments/wechat/orders/"+encodeURIComponent(pendingId),{
          credentials:"same-origin",cache:"no-store",
        });
        if (!r.ok) return;
        const body:CheckoutReply=await r.json();
        if(closed)return;
        if(body.status==="paid") {setState("paid");setQrDataUrl(null);}
        if(body.status==="closed"||body.status==="refunded"){
          setState("failed");setQrDataUrl(null);
        }
      } catch { /* Network faults do not imply a successful payment. */ }
    };
    void check();
    const timer=setInterval(()=>{void check()},3000);
    return ()=>{closed=true;clearInterval(timer)};
  },[pendingId,state]);

  async function purchase(productId:string) {
    if (loading || state==="pending") return;
    setLoading(true);
    setMessage("");
    try {
      const response=await fetch("/api/payments/wechat/checkout",{
        method:"POST",
        credentials:"same-origin",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({productId}),
      });
      const data:CheckoutReply=await response.json();
      if(!response.ok || !data.orderId || !data.qrDataUrl){
        setState("failed");setMessage(data.error||(en?"Checkout temporarily unavailable":"微信支付暂时不可用"));return;
      }
      setPendingId(data.orderId);setQrDataUrl(data.qrDataUrl);setState("pending");
    } catch {
      setState("failed");setMessage(en?"Network unavailable; no payment confirmed":"网络暂不可用，未确认支付成功");
    } finally {setLoading(false);}
  }

  if (!offers.length) return null;
  return <section className={styles.checkout} aria-label={en?"WeChat Native checkout":"微信扫码购买"}>
    <h2>{en?"WeChat QR payment":"微信扫码购买"}</h2>
    <p>{en?"Only active offers from the live billing catalogue are shown. Confirm pricing before you pay.":"以下仅展示当前交易账本正式启用的套餐，支付前请确认价格与交付内容。"}</p>
    {!accountLoggedIn && <p>{en?"Sign in with WeChat to purchase.":"请先微信登录，再购买考试或资料。"} <Link href="/login?next=%2Fmembership">{en?"WeChat sign in":"微信登录"}</Link></p>}
    <div className={styles.checkoutOffers}>
      {offers.map(offer=><div key={offer.id} className={styles.checkoutOffer}>
        <b>{offer.kind==="item"
          ? (en?"Individual exam":"单张试卷")+" · "+offer.titleZh
          : offer.tier.toUpperCase()+" · "+(offer.period==="month"?(en?"Monthly":"月度"):(en?"Yearly":"年度"))}</b>
        <span>¥{(offer.priceMinor/100).toFixed(2)}</span>
        <button type="button" onClick={()=>void purchase(offer.id)}
          disabled={!accountLoggedIn||loading||state==="pending"}>
          {loading?(en?"Creating order…":"正在创建订单…"):(en?"Pay with WeChat":"微信扫码购买")}
        </button>
      </div>)}
    </div>
    {state==="pending"&&qrDataUrl&&<div className={styles.checkoutQr} role="status">
      <strong>{en?"Scan the official WeChat Pay QR code":"请使用微信扫码支付"}</strong>
      <Image src={qrDataUrl} width={256} height={256} alt={en?"WeChat Pay QR code":"微信支付二维码"} unoptimized/>
      <span>{en?"Payment status is checked automatically. Do not close this page.":"系统正在核对微信官方支付状态。支付后自动确认权益。"}</span>
    </div>}
    {state==="paid"&&<p role="status">{en?"Verified payment recorded. Your membership rights can now be viewed in your account.":"已确认微信付款并完成权益记账，请在账号中心查看会员权益。"}</p>}
    {state==="failed"&&<p role="alert">{message||(en?"Order closed or refunded":"订单已关闭或退款")}</p>}
  </section>;
}
