"use client";

import {useEffect,useState} from "react";
import Image from "next/image";
import Link from "next/link";
import {useSiteLanguage} from "@/lib/site-language";
import styles from "./MembershipPage.module.css";
import {DIGITAL_SALES_POLICY_VERSION,DIGITAL_SALES_POLICY_SHORT_ZH,
  DIGITAL_SALES_POLICY_SHORT_EN} from "@/lib/digital-sales-policy";
import {remainingQrSeconds,validServerQrTtl} from "@/lib/native-qr-expiry";

export type PublishedMembershipOffer=Readonly<
  {kind:"subscription";id:string;tier:"plus"|"pro";period:"month"|"year";priceMinor:number;currency:"CNY"}
  | {kind:"item";id:string;contentKind:"exam";contentId:string;titleZh:string;priceMinor:number;currency:"CNY"}
  | {kind:"item";id:string;contentKind:"resource";contentId:string;titleZh:string;fileName:string;sizeBytes:number;priceMinor:number;currency:"CNY"}
>;

type CheckoutReply={
  orderId?:string;qrDataUrl?:string;code?:string;error?:string;
  status?:string;priceMinor?:number;currency?:string;qrTtlSeconds?:number;
  orderCreated?:boolean;
};

/** Called only after a browser checkout event, never while rendering React. */
function qrDeadlineFromAcceptedResponse(ttl:number):number {
  return performance.now()+ttl*1000;
}

export default function NativeCheckoutPanel({offers,accountLoggedIn,compact=false}:{
  offers:readonly PublishedMembershipOffer[];accountLoggedIn:boolean;compact?:boolean;
}) {
  const en=useSiteLanguage()==="en";
  const [pendingId,setPendingId]=useState<string|null>(null);
  const [qrDataUrl,setQrDataUrl]=useState<string|null>(null);
  const [qrDeadlineMonoMs,setQrDeadlineMonoMs]=useState<number|null>(null);
  const [qrRemainingSeconds,setQrRemainingSeconds]=useState(0);
  const [loading,setLoading]=useState(false);
  const [state,setState]=useState<"idle"|"pending"|"paid"|"failed">("idle");
  const [message,setMessage]=useState<string>("");
  // A separate explicit, initially UNCHECKED confirmation per SKU.
  const [policyAcknowledgements,setPolicyAcknowledgements]=useState<Record<string,boolean>>({});

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
    const tick=()=>setQrRemainingSeconds(
      remainingQrSeconds(qrDeadlineMonoMs,performance.now()));
    tick();
    void check();
    const timer=setInterval(()=>{tick();void check()},3000);
    const onFocus=()=>tick();
    window.addEventListener("focus",onFocus);
    document.addEventListener("visibilitychange",onFocus);
    return ()=>{
      closed=true;clearInterval(timer);
      window.removeEventListener("focus",onFocus);
      document.removeEventListener("visibilitychange",onFocus);
    };
  },[pendingId,state,qrDeadlineMonoMs]);

  async function purchase(productId:string) {
    if (loading || state==="pending" || !policyAcknowledgements[productId]) return;
    setLoading(true);
    setMessage("");
    try {
      const response=await fetch("/api/payments/wechat/checkout",{
        method:"POST",
        credentials:"same-origin",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({productId,policyAccepted:true,
          policyVersion:DIGITAL_SALES_POLICY_VERSION}),
      });
      const data:CheckoutReply=await response.json();
      if(!response.ok || !data.orderId || !data.qrDataUrl){
        // The local order may have been created before a network/provider failure.
        // Keep polling exactly this order; never silently offer a second QR.
        if(data.orderCreated===true && typeof data.orderId==="string" &&
           /^ord_[a-zA-Z0-9_-]{6,28}$/.test(data.orderId)){
          setPendingId(data.orderId);
          setQrDeadlineMonoMs(null);
          setQrRemainingSeconds(0);
          setQrDataUrl(null);
          setState("pending");
          setMessage(en
            ?"Payment initiation is uncertain. We are checking the original order; view its status in My account. Do not pay again."
            :"微信下单响应尚未确认，系统会继续核对这笔原订单；请在「我的账号」查看状态，不要重复付款。");
          return;
        }
        setState("failed");setMessage(data.error||(en?"Checkout temporarily unavailable":"微信支付暂时不可用"));return;
      }
      // Treat malformed/missing server TTL as expired, never show an
      // unbounded QR while the order remains pending at WeChat.
      const ttl=validServerQrTtl(data.qrTtlSeconds)?data.qrTtlSeconds:0;
      setPendingId(data.orderId);
      setQrDeadlineMonoMs(qrDeadlineFromAcceptedResponse(ttl));
      setQrRemainingSeconds(ttl);
      setQrDataUrl(ttl>0?data.qrDataUrl:null);
      setState("pending");
      setPolicyAcknowledgements(prev=>({...prev,[productId]:false}));
    } catch {
      setState("failed");setMessage(en?"Network unavailable; no payment confirmed":"网络暂不可用，未确认支付成功");
    } finally {setLoading(false);}
  }

  if (!offers.length) return null;
  return <section className={styles.checkout+" "+(compact?styles.checkoutCompact:"")} aria-label={en?"WeChat Native checkout":"微信扫码购买"}>
    {!compact&&<><h2>{en?"WeChat QR payment":"微信扫码购买"}</h2>
    <p>{en?"Only active offers from the live billing catalogue are shown. Confirm pricing before you pay.":"以下仅展示当前交易账本真实启用的商品，支付前请确认价格与交付内容。"}</p>
    <div className={styles.purchasePolicyNotice} role="note">
      <strong>{en?"Important: digital purchase terms":"重要提醒：数字内容不支持无理由退款"}</strong>
      <p>{en?DIGITAL_SALES_POLICY_SHORT_EN:DIGITAL_SALES_POLICY_SHORT_ZH}{" "}
        <Link href="/digital-purchase-policy">{en?"Read the full policy":"查看完整购买与售后规则"}</Link>
      </p>
    </div></>}
    {!accountLoggedIn && <p>{en?"Sign in with WeChat to purchase.":"请先微信登录，再购买考试或资料。"} <Link href="/login?next=%2Fmembership">{en?"WeChat sign in":"微信登录"}</Link></p>}
    <div className={styles.checkoutOffers}>
      {offers.map(offer=><div id={"buy-"+offer.id} key={offer.id} className={styles.checkoutOffer}>
        <b>{offer.kind==="item"
          ? (offer.contentKind==="exam"?(en?"Individual exam":"单张试卷"):(en?"Digital resource":"数字资料"))+" · "+offer.titleZh
          : offer.tier.toUpperCase()+" · "+(offer.period==="month"?(en?"Monthly":"月度"):(en?"Yearly":"年度"))}</b>
        {offer.kind==="item"&&offer.contentKind==="resource"&&
          <small>{offer.fileName} · {(offer.sizeBytes/1048576).toFixed(2)} MB · {en?"Download immediately after verified payment":"付款核实后在我的账号下载"}</small>}
        <span>¥{(offer.priceMinor/100).toFixed(2)}</span>
        <label className={styles.purchasePolicyCheckbox}>
          <input type="checkbox"
            checked={policyAcknowledgements[offer.id]===true}
            onChange={event=>setPolicyAcknowledgements(prev=>({
              ...prev,[offer.id]:event.target.checked
            }))}/>
          <span>{en
            ?"I have read and agree: no change-of-mind refunds once this digital item or service is delivered/activated; statutory rights remain."
            :"我已阅读并确认：本考试、数字资料或服务开通／交付后不支持无理由退款，法定售后权利不受影响。"}</span>
        </label>
        <button type="button" onClick={()=>void purchase(offer.id)}
          disabled={!accountLoggedIn||!policyAcknowledgements[offer.id]||loading||state==="pending"}>
          {loading?(en?"Creating order…":"正在创建订单…"):(en?"Pay with WeChat":"微信扫码购买")}
        </button>
      </div>)}
    </div>
    {state==="pending"&&qrDataUrl&&qrRemainingSeconds>0&&<div className={styles.checkoutQr} role="status">
      <strong>{en?"Scan the official WeChat Pay QR code":"请使用微信扫码支付"}</strong>
      <Image src={qrDataUrl} width={256} height={256} alt={en?"WeChat Pay QR code":"微信支付二维码"} unoptimized/>
      <span>{en
        ?`QR available for ${Math.ceil(qrRemainingSeconds/60)} more min. Official payment status is checked automatically.`
        :`二维码剩余约 ${Math.ceil(qrRemainingSeconds/60)} 分钟，系统正在核对微信官方支付状态。到期停止展示二维码，待官方确认关单后才能重新购买。`}</span>
    </div>}
    {state==="pending"&&(!qrDataUrl||qrRemainingSeconds===0)&&
      <p role="status">{message || (en
        ?"The payment QR has expired or could not be safely displayed. We will continue checking the original order with WeChat; do not create another payment until its final status is confirmed."
        :"本订单二维码已过期或无法安全展示，正在继续核对原订单的微信官方支付状态。确认关单之前请勿重复付款。")}</p>}
    {state==="paid"&&<div role="status" className={styles.checkoutPaid}><p>{en?"Verified payment recorded.":"已确认微信付款并完成权益记账。"}</p><Link href="/account">{en?"Open My orders and downloads":"前往我的订单下载资料"} →</Link></div>}
    {state==="failed"&&<p role="alert">{message||(en?"Order closed or refunded":"订单已关闭或退款")}</p>}
  </section>;
}
