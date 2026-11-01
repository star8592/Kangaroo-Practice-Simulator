import Link from "next/link";
import Image from "next/image";
import {listStoreProducts} from "@/lib/store-products";
import {nativeCheckoutAllowed} from "@/lib/wechat-native-flags";
import styles from "./shop.module.css";

export const dynamic="force-dynamic";
export const metadata={
  title:"原创数学资料商城 · 真题以外的专项练习 | SOCTHINK",
  description:"小学一年级至初三原创数学训练卷、专题练习与逐题解析。清楚展示真实文件、价格与交付内容。",
};

export default async function ShopPage(){
  const [products,checkoutReady]=await Promise.all([
    listStoreProducts(),Promise.resolve(nativeCheckoutAllowed())
  ]);
  return <div className={styles.page} data-site-shell="content">
    <nav className={styles.breadcrumb} aria-label="当前位置">
      <Link href="/">首页</Link><span>/</span><span>数字资料商城</span>
    </nav>
    <section className={styles.hero}>
      <div>
        <span className={styles.kicker}>SOCTHINK / DIGITAL RESOURCE SHOP</span>
        <h1>原创数学资料商城</h1>
        <p>价格、文件名和交付内容清楚列明。微信支付核实后，使用同一个账号查看订单并下载完整 PDF。</p>
      </div>
      <div className={styles.count}>{products.length}<small> 款在架资料</small></div>
    </section>
    <p className={styles.note}>
      {checkoutReady
        ?"以下商品已完成内容与交付校验，可进入商品详情并使用微信扫码付款。"
        :"资料已上架展示，微信收款通道仍在最终核验，暂不接受付款；请勿向任何私人账号转账。"}
      {" "}所有商品均为原创模拟训练资料，并非官方竞赛真题。
    </p>
    {products.length
      ?<div className={styles.grid}>
        {products.map(p=><article key={p.id} className={styles.card}>
          <Link href={"/shop/"+encodeURIComponent(p.id)} className={styles.cardPreviewLink}
            aria-label={p.title+" · 查看真实 PDF 首页样张"}>
            <Image src={"/shop/previews/"+p.id+".png"} width={620} height={880}
              alt={p.title+" 的实际 PDF 首页样张"} unoptimized/>
            <span>真实 PDF 首页样张</span>
          </Link>
          <h2><Link href={"/shop/"+encodeURIComponent(p.id)}>{p.title}</Link></h2>
          <p>PDF 电子文档 · 付款确认后按账号交付</p>
          <p>文件：{p.fileName}</p>
          <div className={styles.price}>¥{(p.priceMinor/100).toFixed(2)}<small>一次购买</small></div>
          <Link href={"/shop/"+encodeURIComponent(p.id)} className={styles.action}>查看文件和商品详情</Link>
        </article>)}
      </div>
      :<p className={styles.empty}>资料正在整理上架，暂时没有可展示的已审核交付文件。</p>}
    <p className={styles.note}>付款前请阅读 <Link href="/digital-purchase-policy">数字内容购买与售后规则</Link>。买过的资料可以从 <Link href="/account">我的订单与下载</Link> 查看。法定消费者权利不受影响。</p>
  </div>;
}
