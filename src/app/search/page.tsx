import Link from "next/link";
import type { Metadata } from "next";
import { matchDiscoveryEntries, publicDiscoveryEntries, type DiscoveryEntry, type DiscoveryKind } from "@/lib/site-discovery";
import s from "./search.module.css";

export const dynamic = "force-dynamic";
export const metadata:Metadata = {
  title: "职业服务搜索：岗位、课程、实训和模拟面试｜SOC THINK",
  description: "搜索现有岗位、职业课程、技术书、实训和招聘相关能力训练。",
  robots: { index:false, follow:true },
};
type Props = { searchParams:Promise<{q?:string|string[]}> };
const KINDS:readonly DiscoveryKind[] = ["职业岗位","技能","技术书","岗位资料","测评"];
const careerReady=(e:DiscoveryEntry)=>
  ["职业岗位","技能","技术书","岗位资料"].includes(e.kind) ||
  (e.kind==="测评" && /career-aptitude|advanced-reasoning|reasoning-practice|work-values|workplace-sjt/.test(e.href));

export default async function SiteSearchPage({searchParams}:Props) {
  const params=await searchParams;
  const q=typeof params.q==="string"?params.q.trim().slice(0,100):"";
  const entries:DiscoveryEntry[]=q?
    matchDiscoveryEntries(publicDiscoveryEntries().filter(careerReady),q):[];
  const groups=KINDS.map(kind=>({kind,rows:entries.filter(item=>item.kind===kind)}))
    .filter(group=>group.rows.length);
  return <div className={s.shell}>
    <nav className={s.crumb} aria-label="当前位置"><Link href="/">首页</Link><span>/</span><span>全站搜索</span></nav>
    <header className={s.head}>
      <span className={s.kicker}>DISCOVER / SOC THINK</span>
      <h1>搜索职业学习资源</h1>
      <p>查找岗位、课程、实操练习和模拟面试。数学课堂另有独立入口。</p>
      <form method="get" action="/search" role="search" className={s.search}>
        <input name="q" type="search" aria-label="搜索职业学习资源" placeholder="输入岗位、技能、课程或面试..." defaultValue={q} maxLength={100}/>
        <button type="submit">搜索</button>
      </form>
    </header>
    {!q?
      <section className={s.empty}>
        <h2>从你要做的事情开始</h2>
        <div className={s.suggestions}>
          {[["技术书籍","Rust"],["AI 工程","Agent"],["数据技能","SQL"],["职业岗位","采购"],["职业面试","面试"]].map(([label,query])=>
            <Link key={label} href={"/search?q="+encodeURIComponent(query)}>{label} →</Link>)}
        </div>
      </section>:
      <>
        <div className={s.headline}><h2>“{q}”的搜索结果</h2><span>{entries.length} 条匹配</span></div>
        {groups.length?groups.map(({kind,rows})=>
          <section className={s.group} key={kind}>
            <div className={s.groupTitle}><h3>{kind} <small>{rows.length}</small></h3>
              {kind==="技术书"?<Link href="/skill-labs/books">打开技术书库 →</Link>:null}
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
    <nav className={s.bottom} aria-label="按职业任务浏览">
      <Link href="/career">岗位方向</Link>
      <Link href="/learn">学习与实训</Link>
      <Link href="/practice">模拟笔试与面试</Link>
    </nav>
    <p className={s.footnote}>搜索只展示已建立的职业学习入口；未核验的第三方资料不作为自有课程或商品销售。</p>
  </div>;
}
