import Link from "next/link";
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
  return <main className={styles.page} data-site-shell="content">
    <nav className={styles.breadcrumb} aria-label="当前位置">
      <Link href="/">首页</Link><span>/</span><span>数字资料商城</span>
    </nav>
    <section className={styles.hero}>
      <div>
        <span className={styles.kicker}>SOCTHINK / DIGITAL RESOURCE SHOP</span>
        <h1>原创数学资料商城</h1>
        <p>按实际文件展示数字资料，购买前看到题目数量、解析范围、交付格式与价格。一个微信账号完成购买、订单查询和下载。</p>
      </div>
      <div className={styles.count}>{products.length}<small> 款在架资料</small></div>
    </section>
    <p className={styles.note}>
      {checkoutReady
        ?"以下商品已完成内容与交付校验，可进入商品详情并使用微信扫码付款。"
        :"资料已上架展示，微信收款通道仍在最终核验，暂不接受付款；请勿向任何私人账号转账。"}
      {" "}本商城的原创训练资料并非任何官方竞赛真题。
    </p>
    {products.length
      ?<div className={styles.grid}>
        {products.map(p=><article key={p.id} className={styles.card}>
          <h2><Link href={"/shop/"+encodeURIComponent(p.id)}>{p.title}</Link></h2>
          <p>PDF 电子文档 · 付款确认后按账号交付</p>
          <p>文件：{p.fileName}</p>
          <div className={styles.price}>¥{(p.priceMinor/100).toFixed(2)}<small>一次购买</small></div>
          <Link href={"/shop/"+encodeURIComponent(p.id)} className={styles.action}>查看真实内容与购买入口</Link>
        </article>)}
      </div>
      :<p className={styles.empty}>资料正在整理上架，暂时没有可展示的已审核交付文件。</p>}
    <p className={styles.note}>付款前请阅读 <Link href="/digital-purchase-policy">数字内容购买与售后规则</Link>。法定消费者权利不受影响。</p>
  </main>;
}
