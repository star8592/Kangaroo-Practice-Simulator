import Link from "next/link";
import type { Metadata } from "next";
import { homepageUpdates, matchDiscoveryEntries, publicDiscoveryEntries, type DiscoveryEntry, type DiscoveryKind } from "@/lib/site-discovery";
import { listTrainingExamProfiles } from "@/lib/training-question-bank";
import { buildTrainingResourceCatalog, filterTrainingResources } from "@/lib/resource-catalog";
import { listStoreProducts } from "@/lib/store-products";
import s from "./search.module.css";

export const dynamic = "force-dynamic";
export const metadata:Metadata = {
  title: "全站搜索：考试、试卷、技术书、课程和职业资料｜SOC THINK",
  description: "一次搜索 SOC THINK 的可用考试、训练卷、技术书库、技能实训、岗位资料、测评和原创数字商品。",
  robots: { index:false, follow:true },
};
type Props = { searchParams:Promise<{q?:string|string[]}> };
const KINDS:readonly DiscoveryKind[] = ["考试","试卷","技能","技术书","岗位资料","测评","商城"];

export default async function SiteSearchPage({searchParams}:Props) {
  const params=await searchParams;
  const q=typeof params.q==="string"?params.q.trim().slice(0,100):"";
  let entries:DiscoveryEntry[]=q?matchDiscoveryEntries(publicDiscoveryEntries(),q):[];
  if(q){
    // Identical training-readiness gate and metadata projection used by /resources.
    // A training-ready paper is NOT an authorized resale/download item.
    const papers=filterTrainingResources(
      buildTrainingResourceCatalog(listTrainingExamProfiles()),{query:q});
    entries=entries.concat(papers.slice(0,80).map(p=>({
      id:"paper-"+p.id,kind:"试卷" as const,title:p.titleZh,
      summary:[p.competitionZh,p.year,p.gradeZh,p.questionCount+"题"].filter(Boolean).join(" · "),
      href:p.examUrl,
    })));
    // Only actually listed, verified digital products: no speculative SKUs.
    const products=await listStoreProducts();
    const lower=q.toLocaleLowerCase();
    entries=entries.concat(products.filter(p=>
      [p.title,p.fileName].some(value=>value.toLocaleLowerCase().includes(lower)))
      .map(p=>({
        id:"product-"+p.id,kind:"商城" as const,title:p.title,
        summary:"原创数字资料 · 查看实际文件与商品详情",
        href:"/shop/"+encodeURIComponent(p.id),
      })));
  }
  const groups=KINDS.map(kind=>({kind,rows:entries.filter(item=>item.kind===kind)}))
    .filter(group=>group.rows.length);
  return <div className={s.shell}>
    <nav className={s.crumb} aria-label="当前位置"><Link href="/">首页</Link><span>/</span><span>全站搜索</span></nav>
    <header className={s.head}>
      <span className={s.kicker}>DISCOVER / SOC THINK</span>
      <h1>全站搜索</h1>
      <p>考试、资料、技术书、技能课程、岗位服务，一次找到。</p>
      <form method="get" action="/search" role="search" className={s.search}>
        <input name="q" type="search" aria-label="搜索所有学习资源" placeholder="输入书名、考试、岗位、技能..." defaultValue={q} maxLength={100}/>
        <button type="submit">搜索</button>
      </form>
    </header>
    {!q?
      <section className={s.empty}>
        <h2>从你要做的事情开始</h2>
        <div className={s.suggestions}>
          {[["数学竞赛","AMC"],["技术书籍","Rust"],["AI 工程","Agent"],["数据技能","SQL"],["职业岗位","采购"]].map(([label,query])=>
            <Link key={label} href={"/search?q="+encodeURIComponent(query)}>{label} →</Link>)}
        </div>
      </section>:
      <>
        <div className={s.headline}><h2>“{q}”的搜索结果</h2><span>{entries.length} 条匹配</span></div>
        {groups.length?groups.map(({kind,rows})=>
          <section className={s.group} key={kind}>
            <div className={s.groupTitle}><h3>{kind} <small>{rows.length}</small></h3>
              {kind==="试卷"?<Link href="/resources">查看更多试卷 →</Link>:
                kind==="技术书"?<Link href="/skill-labs/books">打开技术书库 →</Link>:
                kind==="商城"?<Link href="/shop">进入商城 →</Link>:null}
            </div>
            <div className={s.results}>
              {rows.slice(0,12).map(item=><article key={item.id} className={s.item}>
                <h4><Link href={item.href}>{item.title}</Link></h4>
                <p>{item.summary}</p>
                <Link className={s.open} href={item.href}>查看内容 →</Link>
              </article>)}
            </div>
            {rows.length>12&&<p className={s.more}>本类匹配 {rows.length} 项，此处优先显示前 12 项。可尝试更精确的关键词。</p>}
          </section>
        ):<section className={s.empty}><h2>暂时没有匹配的已开放内容</h2><p>试试更短的关键词，或者先按业务目录浏览。</p></section>}
      </>
    }
    <nav className={s.bottom} aria-label="按业务浏览">
      <Link href="/assessments">全部考试</Link>
      <Link href="/resources">真题资料</Link>
      <Link href="/skill-labs">技能实训</Link>
      <Link href="/career">职业岗位</Link>
      <Link href="/assessment-center">测评中心</Link>
      <Link href="/shop">数字商城</Link>
    </nav>
    <p className={s.footnote}>搜索只展示实际可访问的内容与在架商品。训练用试卷不代表拥有第三方出版或商业下载授权。</p>
  </div>;
}
