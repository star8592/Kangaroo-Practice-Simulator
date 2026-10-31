import Link from "next/link";
import {notFound} from "next/navigation";
import {findStoreProduct} from "@/lib/store-products";
import {nativeCheckoutAllowed} from "@/lib/wechat-native-flags";
import styles from "../shop.module.css";

export const dynamic="force-dynamic";
export const metadata={
  title:"数字资料详情与微信购买 | SOCTHINK",
  description:"购买前查看原创资料内容、交付文件、一次性价格与数字产品规则。",
};

export default async function StoreProductPage({params}:{
  params:Promise<{productId:string}>;
}){
  const {productId}=await params;
  const p=await findStoreProduct(productId);
  if(!p)notFound();
  const checkoutReady=nativeCheckoutAllowed();
  const count=p.title.match(/(\d+)题/);
  return <main className={styles.page} data-site-shell="content">
    <nav className={styles.breadcrumb} aria-label="当前位置">
      <Link href="/">首页</Link><span>/</span>
      <Link href="/shop">资料商城</Link><span>/</span><span>商品详情</span>
    </nav>
    <article className={styles.detail}>
      <span className={styles.kicker}>SOCTHINK / ORIGINAL RESOURCE</span>
      <h1>{p.title}</h1>
      <div className={styles.price}>¥{(p.priceMinor/100).toFixed(2)}<small>一次购买 · 非订阅</small></div>
      <h2>购买后实际获得什么？</h2>
      <ul>
        <li>完整原创数学训练题目{count?"，共"+count[1]+"道":""}</li>
        <li>与题目逐一对应的参考答案、解题过程和复盘提示</li>
        <li>可下载的 PDF 电子文件：{p.fileName}</li>
        <li>文件大小：{(p.sizeBytes/1024).toFixed(0)} KB</li>
        <li>一个微信账号绑定购买记录，付款核实后通过个人账号下载</li>
      </ul>
      <p>适合自主练习和教师备课参考。文件是原创模拟训练内容，不属于任何考试组织的官方真题，也不承诺竞赛名次。</p>
      {checkoutReady
        ?<Link className={styles.action} href={"/membership#buy-"+p.id}>确认商品信息，进入微信扫码购买</Link>
        :<p className={styles.empty}>资料已准备交付，但支付通道仍在核验，本页面暂不扣款。请在正式开放后通过本站下单。</p>}
      <p className={styles.terms}>
        购买前须阅读 <Link href="/digital-purchase-policy">数字产品销售与售后规则</Link>；
        数字文件完成交付后不支持无理由退款，适用法律规定的权利除外。
      </p>
    </article>
  </main>;
}
