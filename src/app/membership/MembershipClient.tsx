"use client";
import Link from "next/link";
import {useSiteLanguage} from "@/lib/site-language";
import type {Plan} from "@/lib/access-policy";
import NativeCheckoutPanel,{type PublishedMembershipOffer} from "./NativeCheckoutPanel";
import styles from "./MembershipPage.module.css";
import {DIGITAL_SALES_POLICY_SHORT_ZH,DIGITAL_SALES_POLICY_SHORT_EN} from "@/lib/digital-sales-policy";

export default function MembershipClient({
  plan,ledgerAvailable,offers,accountLoggedIn,
}:{
  plan:Plan;ledgerAvailable:boolean;
  offers:readonly PublishedMembershipOffer[];accountLoggedIn:boolean;
}){
  const en=useSiteLanguage()==="en";
  const copy=en?{
    breadcrumb:"Exams / Purchases & access",eyebrow:"SOCTHINK / COMMERCE & ACCESS",
    title:"Choose an exam or resource. Know exactly what you get.",
    intro:"One WeChat account for browsing, studying and purchases. No child profiles, separate PINs or repeated registration.",
    current:"My access",notLogged:"Not signed in",
    enabled:"Only verified and published offers below can be purchased.",
    offline:"Checkout is not yet active. You can still use the available training and exam finder.",
    introLabel:"WHAT YOU CAN USE TODAY",servicesTitle:"Start with the real service, not a pricing promise",
    servicesIntro:"Explore actual training content. Only verified, deliverable items will later show a payable price.",
    exam:"All exams",examDesc:"Find an exam direction and available practice.",
    resource:"Resource finder",resourceDesc:"Browse verified training papers and open online practice.",
    training:"Math practice",trainingDesc:"Quick calculation and grade-based training.",
    reports:"My learning & orders",reportsDesc:"Your learning record and purchases stay with your WeChat account.",
    go:"Explore",checkout:"Published purchases",checkoutOpen:"A live product is displayed only when rights, delivery and payment readiness are verified.",
    checkoutClosed:"No payable products are active yet. Please use the free training and resource finder; no payment is requested.",
    policyTitle:"Before you pay · Digital content is not returnable for change of mind after delivery",
    full:"Read full purchase terms",auth:"Sign in with WeChat to buy and use digital content.",
    signIn:"WeChat sign in",note:"We do not invent SKU prices, sell unauthorized papers or charge before the payment and fulfillment system is verified.",
  }:{
    breadcrumb:"考试大全 / 购买与权益",eyebrow:"SOCTHINK / 数字内容与学习权益",
    title:"先找到真正能用的考试和资料，再决定是否购买",
    intro:"一个微信账号即可浏览、训练、购买和查看订单。不需要添加孩子、另设学生 PIN 或重复注册。",
    current:"当前账号权益",notLogged:"未登录",
    enabled:"仅下方已经审核、可履约的正式商品允许付款。",
    offline:"微信正式收款尚未开放；现有考试检索与免费训练仍可直接使用。",
    introLabel:"现在就能使用",servicesTitle:"先进入真实功能，而不是只看套餐宣传",
    servicesIntro:"可用服务直接进入。只有内容、交付、价格与支付链路都验收的商品才会出现付款按钮。",
    exam:"考试大全",examDesc:"按考试方向查找已开放的训练与测评。",
    resource:"试卷资料检索",resourceDesc:"查看已核查的试卷，直接进入在线练习。",
    training:"数学计算训练",trainingDesc:"按学段进入计算、巧算与专项练习。",
    reports:"我的学习与订单",reportsDesc:"同一微信账号查看考试记录和购买权益。",
    go:"立即进入",checkout:"可购买的正式商品",checkoutOpen:"价格、授权、交付与微信支付全部真实就绪的商品才会显示。",
    checkoutClosed:"目前没有可付款的正式商品。可以直接使用上面的考试、资料检索和数学训练，不会产生扣款。",
    policyTitle:"购买前须知 · 数字内容交付后不支持无理由退款",
    full:"查看完整购买与售后规则",auth:"购买时只需微信登录，使用和订单都绑定同一个账号。",
    signIn:"微信登录",note:"不设置虚构套餐价格，不出售未经授权的试卷，也不在收款及交付尚未验收时向用户扣款。",
  };
  const entries=[
    {href:"/assessments",name:copy.exam,description:copy.examDesc,number:"01"},
    {href:"/resources",name:copy.resource,description:copy.resourceDesc,number:"02"},
    {href:"/arithmetic",name:copy.training,description:copy.trainingDesc,number:"03"},
    {href:"/account",name:copy.reports,description:copy.reportsDesc,number:"04"},
  ];
  return <div className={styles.page}>
    <nav className={styles.breadcrumb} aria-label={en?"Breadcrumb":"当前位置"}>
      <Link href="/assessments">{en?"All exams":"考试大全"}</Link>
      <span aria-hidden="true">/</span><span>{en?"Purchases & access":"购买与权益"}</span>
    </nav>
    <section className={styles.hero}>
      <div className={styles.heroText}>
        <small>{copy.eyebrow}</small>
        <h1>{copy.title}</h1>
        <p>{copy.intro}</p>
        <div className={styles.status} role="status">
          <b>{copy.current}：{accountLoggedIn?plan.toUpperCase():copy.notLogged}</b>
          <span>{offers.length&&ledgerAvailable?copy.enabled:copy.offline}</span>
        </div>
      </div>
      <div className={styles.heroAside} aria-hidden="true">
        <span>ONE ACCOUNT</span><strong>01</strong><span>EXAMS · RESOURCES · LEARNING</span>
      </div>
    </section>
    <section className={styles.services} aria-label={copy.servicesTitle}>
      <div className={styles.sectionHeading}>
        <div><small>{copy.introLabel}</small><h2>{copy.servicesTitle}</h2><p>{copy.servicesIntro}</p></div>
      </div>
      <div className={styles.serviceGrid}>
        {entries.map(entry=><Link href={entry.href} key={entry.href} className={styles.serviceCard}>
          <span className={styles.serviceNumber}>{entry.number}</span>
          <h3>{entry.name}</h3><p>{entry.description}</p>
          <span className={styles.serviceAction}>{copy.go}<span aria-hidden="true"> →</span></span>
        </Link>)}
      </div>
    </section>
    <section className={styles.purchaseArea} aria-label={copy.checkout}>
      <div className={styles.sectionHeading}>
        <div><small>CHECKOUT / VERIFIED PRODUCTS</small><h2>{copy.checkout}</h2>
          <p>{offers.length&&ledgerAvailable?copy.checkoutOpen:copy.checkoutClosed}</p>
        </div>
      </div>
      <section className={styles.purchasePolicyNotice} aria-label={en?"Digital purchase terms":"数字商品售后提示"}>
        <strong>{copy.policyTitle}</strong>
        <p>{en?DIGITAL_SALES_POLICY_SHORT_EN:DIGITAL_SALES_POLICY_SHORT_ZH}{" "}
          <Link href="/digital-purchase-policy">{copy.full}</Link></p>
      </section>
      <NativeCheckoutPanel offers={offers} accountLoggedIn={accountLoggedIn}/>
    </section>
    {!accountLoggedIn&&<p className={styles.note}>{copy.auth}{" "}
      <Link href="/login?next=%2Fmembership">{copy.signIn}</Link></p>}
    <p className={styles.note}>{copy.note}</p>
  </div>;
}
