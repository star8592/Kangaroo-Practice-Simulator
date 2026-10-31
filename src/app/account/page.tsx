import Link from "next/link";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {parentFromSessionToken,PARENT_SESSION_COOKIE} from "@/lib/parent-auth";
import {attachVerifiedBilling} from "@/lib/access-context-server";
import {effectivePlan} from "@/lib/access-policy";
import {billingConfigured,billingPool} from "@/lib/billing-ledger";
import ParentLogoutButton from "@/components/ParentLogoutButton";
import styles from "./AccountPage.module.css";

export const dynamic="force-dynamic";

type PurchasedOrder={
  id:string;product_id:string;state:string;
  price_minor:string;currency:string;created_at:Date;
  product_kind:string;content_kind:string|null;content_id:string|null;title_snapshot:string|null;
  sales_policy_version:string|null;sales_policy_accepted_at:Date|null;
};

const ORDER_STATUS:Record<string,string>={
  pending:"待付款",paid:"已付款",closed:"已关闭",refunded:"已退款",
};

export default async function AccountPage(){
  const jar=await cookies();
  const account=parentFromSessionToken(jar.get(PARENT_SESSION_COOKIE)?.value);
  if(!account?.active||!(account.wechatId||account.wechatOpenId))
    redirect("/login?next=%2Faccount");
  let plan:"free"|"plus"|"pro"="free";
  let orderList:PurchasedOrder[]=[];
  const billingReady=billingConfigured();
  let queryFailed=false;
  try{
    const context=await attachVerifiedBilling({kind:"parent",accountId:account.id});
    plan=effectivePlan(context);
    if(billingReady){
      const q=await billingPool().query<PurchasedOrder>(
        "SELECT id,product_id,state,price_minor,currency,created_at,product_kind,content_kind,content_id,title_snapshot,sales_policy_version,sales_policy_accepted_at FROM billing_orders WHERE payer_parent_id=$1 ORDER BY created_at DESC LIMIT 30",
        [account.id],
      );
      orderList=q.rows;
    }
  }catch{queryFailed=true;}
  const planLabel=plan==="free"?"免费账号":plan.toUpperCase();
  const entries=[
    {href:"/assessments",title:"选择考试或资料",desc:"查看考试大全，发现考试方向和已开放测评"},
    {href:"/resources",title:"试卷资料",desc:"检索已核查的在线练习资料"},
    {href:"/arithmetic",title:"数学训练",desc:"直接进入计算与巧算训练"},
    {href:"/student",title:"学习报告",desc:"查看同一账号累积的练习记录"},
  ];
  return <div className={styles.page}>
    <nav className={styles.breadcrumb} aria-label="当前位置">
      <Link href="/assessments">考试大全</Link><span>/</span><span>我的账号</span>
    </nav>
    <section className={styles.hero}>
      <div>
        <small>SOCTHINK / ONE WECHAT ACCOUNT</small>
        <h1>我的学习与订单</h1>
        <h2 className={styles.accountName}>{account.name||"微信账号"}</h2>
        <p>已登录微信 · 考试、练习、购买记录统一归属这个账号，无需设置额外家庭档案或学生身份。</p>
        <div className={styles.heroStatus} role="status">
          <strong>{planLabel}</strong>
          <span>{queryFailed?"权益暂时不可查询":!billingReady
            ?"新支付账本尚未开放，免费训练继续可用":"当前订单与权益可查询"}</span>
        </div>
      </div>
      <div className={styles.logout}><ParentLogoutButton/></div>
    </section>

    <section className={styles.section} aria-label="可用功能">
      <div className={styles.sectionHeading}>
        <small>START HERE · 一个账号，直接使用</small><h2>考试与资料</h2>
        <p>选择考试或资料后即可进入对应服务，不必先购买套餐或填写家庭资料。</p>
      </div>
      <div className={styles.serviceGrid}>
        {entries.map(x=><Link key={x.href} href={x.href} className={styles.service}>
          <strong>{x.title}</strong><span>{x.desc}</span><em>立即进入 →</em>
        </Link>)}
      </div>
    </section>

    <section className={styles.orders} aria-label="我的订单与权益">
      <div className={styles.sectionHeading}>
        <small>PURCHASES / ENTITLEMENTS</small><h2>我的订单与权益</h2>
        <p>只有微信支付官方确认完成的订单才会发放正式购买权益。</p>
      </div>
      {!billingReady?<div className={styles.empty} role="status">
        <strong>正式收款尚未开放</strong>
        <p>网站正在完成新账本和商户支付迁接，目前不会产生新的数字商品扣款。可以继续使用现有免费考试与训练。</p>
        <Link href="/resources">先查看可用资料 →</Link>
      </div>:queryFailed?<div className={styles.empty} role="alert">
        <strong>暂时无法查询交易记录</strong>
        <p>请稍后刷新。不会因为页面加载失败重复创建或扣取订单。</p>
      </div>:orderList.length===0?<div className={styles.empty}>
        <strong>还没有已购买的数字商品</strong>
        <p>未来购买的单份试卷、数字资料及服务权益都会显示在这里。</p>
        <Link href="/membership">查看可购买服务 →</Link>
      </div>:<ol className={styles.orderList}>
        {orderList.map(order=><li key={order.id} className={styles.order}>
          <div className={styles.orderTop}>
            <strong>{order.title_snapshot||order.product_id}</strong>
            <span className={styles.orderStatus} data-status={order.state}>
              {ORDER_STATUS[order.state]||"正在处理"}
            </span>
          </div>
          <p>{order.currency==="CNY"?"¥"+(Number(order.price_minor)/100).toFixed(2):order.currency}{" · "}
            {new Date(order.created_at).toLocaleDateString("zh-CN")}</p>
          {order.sales_policy_version&&order.sales_policy_accepted_at&&<p>
            购买前已确认数字商品售后规则 · {new Date(order.sales_policy_accepted_at).toLocaleString("zh-CN")}
            {" · "}<Link href="/digital-purchase-policy">查看规则</Link>
          </p>}
          {order.state==="paid"&&order.content_kind==="exam"&&order.content_id&&
            <Link className={styles.orderAction} href={"/exam/"+encodeURIComponent(order.content_id)}>
              进入已购试卷 →
            </Link>}
          {order.state==="paid"&&order.content_kind==="resource"&&order.content_id&&
            <a className={styles.orderAction} href={"/api/resources/download/"+encodeURIComponent(order.content_id)}>
              下载已购资料 →
            </a>}
        </li>)}
      </ol>}
      <div className={styles.ordersActions}>
        <Link href="/membership">查看购买与权益</Link>
        <Link href="/digital-purchase-policy">数字商品售后规则</Link>
      </div>
    </section>
  </div>;
}
