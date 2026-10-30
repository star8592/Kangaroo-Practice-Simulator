"use client";
import Link from "next/link";
import {useSiteLanguage} from "@/lib/site-language";
import type {Plan} from "@/lib/access-policy";
import NativeCheckoutPanel,{type PublishedMembershipOffer} from "./NativeCheckoutPanel";
import styles from "./MembershipPage.module.css";

export default function MembershipClient({
 plan,ledgerAvailable,offers,accountLoggedIn,
}:{
 plan:Plan;ledgerAvailable:boolean;
 offers:readonly PublishedMembershipOffer[];accountLoggedIn:boolean;
}) {
 const en=useSiteLanguage()==="en";
 return <main className={styles.page}>
  <section className={styles.hero}>
   <small>{en?"EXAMS · DIGITAL RESOURCES":"考试 · 测评 · 数字资料"}</small>
   <h1>{en?"Choose what you need. Pay only when ready.":"选择考试或资料，按需购买"}</h1>
   <p>{en?"One verified WeChat account holds your purchases, exam history and access.":
     "用一个微信账号浏览、购买、参加考试或获取资料。无需添加孩子、选择学生或重复注册。"}</p>
   <div className={styles.status}>
    <b>{en?"Current account access":"当前账号权益"}：{accountLoggedIn?plan.toUpperCase():"未登录"}</b>
    <span>{!ledgerAvailable
      ? (en?"Purchase records temporarily unavailable.":"暂时无法查询权益，系统不会重复扣款。")
      : offers.length
        ? (en?"Only the listed verified products can be purchased.":"仅下方真实启用的商品可以购买。")
        : (en?"Payments are not yet enabled; no charges will be made.":"正式收款尚未开放，当前不会向你收款。")}</span>
   </div>
  </section>
  <div className={styles.actions}>
   <Link href="/assessments">{en?"Browse exams & resources":"浏览考试与资料"}</Link>
   <Link href="/competitions">{en?"Mock exams":"竞赛模拟"}</Link>
   <Link href="/account">{en?"My purchases":"我的订单与权益"}</Link>
  </div>
  <NativeCheckoutPanel offers={offers} accountLoggedIn={accountLoggedIn}/>
  {!accountLoggedIn&&<p className={styles.note}>
   {en?"When a product is ready, sign in with WeChat to buy and use it.":
     "购买时只需微信登录，不需要创建学生或家庭档案。"}{" "}
   <Link href="/login?next=%2Fmembership">{en?"WeChat sign in":"微信登录"}</Link>
  </p>}
  <p className={styles.note}>{en
   ?"Only actual published products with verified fulfillment and pricing may be sold. Existing free practice remains available."
   :"只会对实际可交付、价格明确且经过支付验收的商品开放收款。免费的样题和训练继续保留。"}</p>
 </main>;
}
