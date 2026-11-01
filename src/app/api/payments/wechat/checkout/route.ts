import {NextRequest,NextResponse} from "next/server";
import QRCode from "qrcode";
import {PARENT_SESSION_COOKIE,parentFromSessionToken} from "@/lib/parent-auth";
import {BillingConflictError,billingConfigured,billingPool,createBillingOrder,hasVerifiedItemEntitlement} from "@/lib/billing-ledger";
import {isExamBundleTrainingReady,loadTrainingExamBundle} from "@/lib/training-question-bank";
import {nativeCheckoutAllowed,nativeServerContext} from "@/lib/wechat-native-server";
import {createVerifiedWechatNativeCheckout} from "@/lib/wechat-native-transport";
import {DIGITAL_SALES_POLICY_VERSION,validDigitalSalesPolicyConsent} from "@/lib/digital-sales-policy";
import {NATIVE_ORDER_WINDOW_SECONDS,checkoutQrTtlSeconds} from "@/lib/native-qr-expiry";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const NO_STORE={"Cache-Control":"private, no-store, max-age=0"};
const reply=(payload:object,status:number)=>NextResponse.json(payload,{status,headers:NO_STORE});

export async function POST(req:NextRequest) {
  if (!nativeCheckoutAllowed() || !billingConfigured())
    return reply({error:"网站收款尚未开放",code:"WEB_NATIVE_DISABLED"},503);
  if (req.headers.get("origin")!==process.env.SOCTHINK_PUBLIC_ORIGIN ||
      req.headers.get("sec-fetch-site")==="cross-site")
    return reply({error:"请求来源无效"},403);
  const parent=parentFromSessionToken(req.cookies.get(PARENT_SESSION_COOKIE)?.value);
  if (!parent || !parent.active || !(parent.wechatId||parent.wechatOpenId))
    return reply({error:"请先使用微信登录"},401);
  let productId:string;
  let policyAccepted=false;
  try {
    const raw=await req.text();
    if (raw.length>2048) return reply({error:"请求格式不正确"},400);
    const body:unknown=JSON.parse(raw);
    const obj=body && typeof body==="object"&&!Array.isArray(body)?
      body as Record<string,unknown>:null;
    productId=typeof obj?.productId==="string"?obj.productId:"";
    policyAccepted=validDigitalSalesPolicyConsent(obj);
  } catch {return reply({error:"请求格式不正确"},400);}
  if (!/^[a-zA-Z0-9_.-]{4,80}$/.test(productId))
    return reply({error:"商品不可购买"},400);
  if(!policyAccepted)
    return reply({error:"请先主动确认数字内容交付及无理由退款规则",
      code:"PURCHASE_POLICY_CONFIRMATION_REQUIRED"},409);
  let orderCreated=false;
  let createdOrderId:string|undefined;
  try {
    const context=nativeServerContext();
    const recent=await billingPool().query<{count:string}>(
      "SELECT count(*)::text AS count FROM billing_orders WHERE payer_parent_id=$1 AND provider='wechat_native' AND state='pending' AND created_at > now()-interval '30 minutes'",
      [parent.id]);
    if (Number(recent.rows[0]?.count)>2)
      return reply({error:"待支付订单过多，请稍后再试",code:"TOO_MANY_PENDING"},429);
    // Product price and delivery tier come from a trusted server table.
    // Never trust a posted amount, name or entitlement.
    const product=await billingPool().query<{
      id:string;amount_minor:string;currency:string;product_kind:"subscription"|"item";
      content_kind:"exam"|"resource"|"report"|null;content_id:string|null;title_zh:string|null;
      rights_approved:boolean;delivery_verified:boolean;access_restricted:boolean;
    }>(
      "SELECT id,amount_minor,currency,product_kind,content_kind,content_id,title_zh,rights_approved,delivery_verified,access_restricted FROM billing_products WHERE id=$1 AND enabled=true",[productId]);
    const p=product.rows[0];
    if (!p || p.currency!=="CNY" || !Number.isSafeInteger(Number(p.amount_minor)) ||
      Number(p.amount_minor)<=0) return reply({error:"商品尚未开放购买"},409);
    if(p.product_kind==="item"){
      if(process.env.SOCTHINK_ITEM_ACCESS_ENFORCED!=="1" ||
         !p.rights_approved || !p.delivery_verified || !p.access_restricted ||
         !p.content_id || !p.title_zh ||
         (p.content_kind!=="exam" && p.content_kind!=="resource" && p.content_kind!=="report"))
        return reply({error:"本商品尚未开放购买"},409);
      if(p.content_kind==="report"){
        // The only sellable reports are original, versioned self-exploration instruments.
        // No clinical or employment decisions; no client-side payment flag.
        const {getInstrument}=await import("@/lib/measurement-center");
        if(!getInstrument(p.content_id))
          return reply({error:"该报告尚未完成交付配置"},409);
      }
      if(p.content_kind==="exam"){
        try{
          if(!isExamBundleTrainingReady(loadTrainingExamBundle(p.content_id)))
            return reply({error:"试卷尚未完成交付验收"},409);
        }catch{return reply({error:"试卷尚未完成交付验收"},409);}
      }
      // For resources, createBillingOrder verifies rights and the exact
      // private SHA256 file bytes before an order can reach WeChat Pay.
      if(await hasVerifiedItemEntitlement(parent.id,p.content_kind,p.content_id))
        return reply({error:"已购买该商品，请在我的账号中使用",code:"ALREADY_OWNED"},409);
    }
    const order=await createBillingOrder(parent.id,productId,"wechat_native",{
      policyVersion:DIGITAL_SALES_POLICY_VERSION,acceptedAt:new Date(),
    });
    orderCreated=true;
    createdOrderId=order.id;
    const orderExpiresAtSeconds=context.nowSeconds+NATIVE_ORDER_WINDOW_SECONDS;
    const payment=await createVerifiedWechatNativeCheckout(context,{
      orderId:order.id,description:"SOCTHINK "+p.id,
      amountMinor:order.priceMinor,currency:"CNY",
      timeExpireSeconds:orderExpiresAtSeconds,
    });
    // The checkout API and the UI must share the same deadline; otherwise a
    // stale QR can invite payment after the official time_expire window.
    const qrTtlSeconds=checkoutQrTtlSeconds(
      orderExpiresAtSeconds,Math.floor(Date.now()/1000));
    if(qrTtlSeconds<=0)
      return reply({error:"二维码已超过支付截止时间，请查询原订单状态",
        code:"QR_EXPIRED",orderId:payment.orderId,orderCreated:true},503);
    const qrDataUrl=await QRCode.toDataURL(payment.codeUrl,{margin:1,width:256,errorCorrectionLevel:"M"});
    return reply({orderId:payment.orderId,qrDataUrl,priceMinor:order.priceMinor,currency:"CNY",
      qrTtlSeconds:checkoutQrTtlSeconds(orderExpiresAtSeconds,Math.floor(Date.now()/1000)),
      status:"pending",note:"请以微信支付结果和服务端权益到账为准"},200);
  } catch(error) {
    if(error instanceof BillingConflictError &&
       error.message==="Item payment already pending")
      return reply({error:"该商品已有待支付订单，请先完成或关闭原订单，避免重复扣款",
        code:"ITEM_PAYMENT_PENDING"},409);
    if(error instanceof BillingConflictError && error.message==="Item already owned")
      return reply({error:"已购买该商品，请在我的账号中使用",code:"ALREADY_OWNED"},409);
    // If the provider reply was lost, this order may exist remotely.
    // Return its ID only to this authenticated buyer; never create a replacement.
    return reply({error:"微信支付暂时不可用",code:"CHECKOUT_UNAVAILABLE",
      orderCreated,orderId:createdOrderId},503);
  }
}
