import Link from "next/link";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {parentFromSessionToken,PARENT_SESSION_COOKIE} from "@/lib/parent-auth";
import {attachVerifiedBilling} from "@/lib/access-context-server";
import {effectivePlan} from "@/lib/access-policy";
import {billingConfigured,billingPool} from "@/lib/billing-ledger";
import ParentLogoutButton from "@/components/ParentLogoutButton";

export const dynamic="force-dynamic";

type PurchasedOrder={
  id:string;product_id:string;state:string;
  price_minor:string;currency:string;created_at:Date;
  product_kind:string;content_kind:string|null;content_id:string|null;title_snapshot:string|null;
};
export default async function AccountPage(){
  const jar=await cookies();
  const account=parentFromSessionToken(jar.get(PARENT_SESSION_COOKIE)?.value);
  if(!account?.active||!(account.wechatId||account.wechatOpenId))
    redirect("/login?next=%2Faccount");
  let plan:"free"|"plus"|"pro"="free";
  let orderList:PurchasedOrder[]=[];
  let ledgerAvailable=true;
  try{
    const context=await attachVerifiedBilling({kind:"parent",accountId:account.id});
    plan=effectivePlan(context);
    if(billingConfigured()){
      const q=await billingPool().query<PurchasedOrder>(
        "SELECT id,product_id,state,price_minor,currency,created_at,product_kind,content_kind,content_id,title_snapshot FROM billing_orders WHERE payer_parent_id=$1 ORDER BY created_at DESC LIMIT 30",
        [account.id],
      );
      orderList=q.rows;
    }
  }catch{ledgerAvailable=false;}
  const label=plan==="free"?"免费账号":plan.toUpperCase();
  return <main style={{maxWidth:880,margin:"0 auto",padding:"clamp(20px,4vw,46px) 20px"}}>
    <header style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
      <div>
        <small>我的账号 · WECHAT ACCOUNT</small>
        <h1 style={{margin:"8px 0"}}>{account.name||"微信账号"}</h1>
        <p>已登录微信 · {ledgerAvailable?label:"权益暂时无法查询"}</p>
      </div>
      <ParentLogoutButton/>
    </header>
    <section style={{border:"1px solid #dfe6ee",borderRadius:18,padding:24,marginTop:24}}>
      <h2>考试与资料</h2>
      <p>选择考试或资料后，购买和使用记录将归属于这个微信账号。</p>
      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        <Link className="primary-button" href="/assessments">选择考试或资料</Link>
        <Link className="secondary-button" href="/competitions">竞赛模拟</Link>
        <Link className="secondary-button" href="/arithmetic">免费训练</Link>
      </div>
    </section>
    <section style={{border:"1px solid #dfe6ee",borderRadius:18,padding:24,marginTop:22}}>
      <h2>我的订单与权益</h2>
      {!ledgerAvailable?<p role="alert">支付记录暂时无法读取，请稍后刷新。不会因此重复扣款。</p>:
        orderList.length===0?<p>目前没有已购买的服务。正式支付开放后，订单和使用权限将在这里展示。</p>:
        <ul style={{listStyle:"none",padding:0,display:"grid",gap:12}}>
          {orderList.map(order=><li key={order.id} style={{borderBottom:"1px solid #e6edf3",paddingBottom:12}}>
            <strong>{order.title_snapshot||order.product_id}</strong>
            <span style={{marginLeft:12}}>{order.state==="paid"?"已付款":order.state==="pending"?"待付款":order.state==="refunded"?"已退款":order.state}</span>
            <p>{order.currency==="CNY"?"¥"+(Number(order.price_minor)/100).toFixed(2):order.currency} · {new Date(order.created_at).toLocaleDateString("zh-CN")}</p>
            {order.state==="paid"&&order.content_kind==="exam"&&order.content_id&&
              <Link href={"/exam/"+encodeURIComponent(order.content_id)}>进入已购试卷</Link>}
          </li>)}
        </ul>}
      <Link className="secondary-button" href="/membership">查看可购买服务</Link>
    </section>
  </main>;
}
