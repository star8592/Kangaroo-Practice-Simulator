import Link from "next/link";
import Image from "next/image";
import {cookies} from "next/headers";
import {notFound} from "next/navigation";
import {findStoreProduct} from "@/lib/store-products";
import {nativeCheckoutAllowed} from "@/lib/wechat-native-flags";
import {billingConfigured,hasVerifiedItemEntitlement} from "@/lib/billing-ledger";
import {parentFromSessionToken,PARENT_SESSION_COOKIE} from "@/lib/parent-auth";
import NativeCheckoutPanel,{type PublishedMembershipOffer} from "@/app/membership/NativeCheckoutPanel";
import styles from "../shop.module.css";

export const dynamic="force-dynamic";
export const metadata={
  title:"原创数字资料详情与购买 | SOCTHINK",
  description:"查看实际交付文件、题量与价格，微信验证付款后在同一账号下载。",
};

const money=(fen:number)=>(fen/100).toFixed(2);

export default async function StoreProductPage({params}:{
  params:Promise<{productId:string}>;
}){
  const {productId}=await params;
  const p=await findStoreProduct(productId);
  if(!p)notFound();
  const count=p.title.match(/(\d+)题/);
  const checkoutReady=nativeCheckoutAllowed();
  const jar=await cookies();
  const buyer=parentFromSessionToken(jar.get(PARENT_SESSION_COOKIE)?.value);
  const accountLoggedIn=Boolean(buyer?.active&&(buyer.wechatId||buyer.wechatOpenId));
  let purchased=false;
  if(accountLoggedIn&&buyer&&billingConfigured()){
    try {purchased=await hasVerifiedItemEntitlement(buyer.id,"resource",p.resourceId);}
    catch { /* Buyer entitlement cannot be guessed from a failed ledger read. */ }
  }
  const offer:PublishedMembershipOffer={
    kind:"item",contentKind:"resource",contentId:p.resourceId,
    id:p.id,titleZh:p.title,priceMinor:p.priceMinor,currency:"CNY",
    fileName:p.fileName,sizeBytes:p.sizeBytes,
  };
  const signInUrl="/login?next="+encodeURIComponent("/shop/"+p.id);
  const downloadUrl="/api/resources/download/"+encodeURIComponent(p.resourceId);
  const previewUrl="/shop/previews/"+p.id+".png";
  return <div className={styles.page} data-site-shell="content">
    <nav className={styles.breadcrumb} aria-label="当前位置">
      <Link href="/">首页</Link><span aria-hidden="true">/</span>
      <Link href="/shop">原创资料商城</Link><span aria-hidden="true">/</span>
      <span aria-current="page">商品详情</span>
    </nav>
    <div className={styles.productLayout}>
      <header className={styles.productHeader}>
        <span className={styles.productEyebrow}>SOCTHINK · ORIGINAL STUDY MATERIALS</span>
        <div className={styles.productTags}>
          <span>原创训练资料</span><span>PDF 电子版</span><span>一次购买</span>
        </div>
        <h1>{p.title}</h1>
        <p className={styles.productLead}>付款前了解真实交付文件与价格；付款经微信官方确认后，直接在同一个微信账号下载。</p>
        <div className={styles.productFacts} aria-label="商品概览">
          {count&&<div><strong>{count[1]} 道</strong><span>标题所示题量</span></div>}
          <div><strong>PDF</strong><span>交付格式</span></div>
          <div><strong>{(p.sizeBytes/1024).toFixed(0)} KB</strong><span>实际文件大小</span></div>
        </div>
      </header>
      <aside className={styles.purchaseAside} aria-label="购买与交付">
        <div className={styles.purchaseCard}>
          <p className={styles.purchaseEyebrow}>电子资料 · 一次购买</p>
          <div className={styles.purchasePrice}><span>¥</span>{money(p.priceMinor)}</div>
          <p className={styles.purchaseHint}>按当前商品单独计价，不自动续费</p>
          <div className={styles.purchaseDivider}/>
          <div className={styles.purchaseChecklist}>
            <span><b aria-hidden="true">✓</b> 实际文件已核验</span>
            <span><b aria-hidden="true">✓</b> 官方微信支付确认后发放权益</span>
            <span><b aria-hidden="true">✓</b> 在“我的账号”下载已购文件</span>
          </div>
          {purchased
            ? <div className={styles.purchaseActionArea}>
                <p className={styles.alreadyOwned} role="status">这个微信账号已经拥有此资料。</p>
                <a className={styles.primaryAction} href={downloadUrl}>下载已购 PDF</a>
                <Link className={styles.secondaryAction} href="/account">查看我的订单</Link>
              </div>
            :checkoutReady
              ?accountLoggedIn
                ?<NativeCheckoutPanel offers={[offer]} accountLoggedIn compact/>
                :<div className={styles.purchaseActionArea}>
                    <Link className={styles.primaryAction} href={signInUrl}>微信登录后购买</Link>
                    <p className={styles.purchaseDisclaimer}>登录后回到本页确认价格，再由本人发起微信支付。</p>
                  </div>
              :<div className={styles.purchaseActionArea} role="status">
                  <button type="button" className={styles.disabledAction} disabled>微信支付尚未开放</button>
                  <p className={styles.purchaseDisclaimer}>商户接入已配置，真实付款与交付正在验收。本页目前不会创建订单或扣款。</p>
                </div>}
          <div className={styles.purchaseBottom}>
            <Link href="/digital-purchase-policy">购买与售后规则</Link>
            <span>付款问题可通过本站账户记录核对</span>
          </div>
        </div>
      </aside>
      <div className={styles.productBody}>
        <section className={styles.productSection} aria-labelledby="contents-title">
          <div className={styles.sectionHeading}><span>01 / PRODUCT CONTENT</span><h2 id="contents-title">买到的具体内容</h2></div>
          <p>交付的是这份明确标价的数学训练 PDF，非官方考试真题，也不是按月续费的会员套餐。</p>
          <ul className={styles.benefits}>
            <li>原创数学训练题目{count?"，商品标题标注共 "+count[1]+" 道":""}</li>
            <li>文件包含题目、对应参考答案及解题说明，实际内容以文件为准</li>
            <li>付款经微信官方核实后，在个人账号下载完整文件</li>
          </ul>
        </section>
        <section className={styles.productSection} aria-labelledby="file-title">
          <div className={styles.sectionHeading}><span>02 / VERIFIED DELIVERY</span><h2 id="file-title">交付文件</h2></div>
          <div className={styles.fileOverview}>
            <figure className={styles.previewFigure}>
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" aria-label="打开真实 PDF 首页样张">
                <Image src={previewUrl} width={620} height={880}
                  alt={p.title+" · 实际交付 PDF 第一页样张"} unoptimized/>
              </a>
              <figcaption>真实文件首页样张 · 点击放大查看</figcaption>
            </figure>
            <dl className={styles.fileSpecs}>
              <div><dt>文件名称</dt><dd>{p.fileName}</dd></div>
              <div><dt>格式与大小</dt><dd>PDF · {(p.sizeBytes/1024).toFixed(0)} KB</dd></div>
              <div><dt>交付方式</dt><dd>微信付款核实后，前往“我的账号”下载</dd></div>
              <div><dt>购买类型</dt><dd>单份购买，无自动续费</dd></div>
            </dl>
          </div>
          <p className={styles.previewNotice}>本样张直接渲染自已核验 PDF 的第一页，非 AI 虚构示意图；付款后交付完整 PDF。</p>
        </section>
        <section className={styles.productSection} aria-labelledby="steps-title">
          <div className={styles.sectionHeading}><span>03 / PURCHASE & ACCESS</span><h2 id="steps-title">付款后如何下载</h2></div>
          <ol className={styles.steps}>
            <li><span>1</span><div><strong>确认商品与价格</strong><p>查看文件名、题量、价格和售后规则。</p></div></li>
            <li><span>2</span><div><strong>微信支付</strong><p>正式开放后，登录微信账号并扫码完成支付；以微信官方回执为准。</p></div></li>
            <li><span>3</span><div><strong>进入账号下载</strong><p>订单确认已支付后，在<Link href="/account">我的订单与权益</Link>下载原始 PDF。</p></div></li>
          </ol>
        </section>
        <section className={styles.productSection} aria-labelledby="policy-title">
          <div className={styles.sectionHeading}><span>04 / TERMS</span><h2 id="policy-title">使用与售后</h2></div>
          <p>适合自主练习和教师备课参考。本站原创模拟训练内容不属于任何考试组织的官方真题，也不承诺考试成绩或竞赛名次。</p>
          <p>数字内容交付后，在适用法律允许的范围内不支持无理由退款；未交付、严重不符或其他法定售后事项依法处理。<Link href="/digital-purchase-policy">查看完整规则</Link>。</p>
        </section>
        <nav className={styles.backNav} aria-label="其他购买入口">
          <Link href="/shop">返回原创资料商城</Link>
          <Link href="/account">我的订单与下载</Link>
        </nav>
      </div>
    </div>
  </div>;
}