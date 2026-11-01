import Link from "next/link";
import {CAREER_UNIVERSE_AS_OF,CAREER_ENTERPRISE_GROUPS,
  searchCareerEnterprises,summarizeCareerEnterprises} from "@/lib/career-enterprise-universe";
import styles from "../career.module.css";

export const metadata={
  title:"中国上市公司、在华外企与合资企业｜职业需求研究｜SOCTHINK",
  description:"从沪深北、港股和美股中国企业扩展到在华外企、中外合资及重要非上市企业。展示有依据的企业身份、股票代码、官方招聘来源及查证状态。",
  alternates:{canonical:"/career/companies"},
};
type Props={searchParams:Promise<{q?:string|string[];kind?:string|string[]}>};

export default async function CareerCompaniesPage({searchParams}:Props){
  const params=await searchParams;
  const q=typeof params.q==="string"?params.q.slice(0,120).trim():"";
  const kind=typeof params.kind==="string"?params.kind:"";
  const companies=searchCareerEnterprises(q,kind);
  const totals=summarizeCareerEnterprises();
  return <main className={styles.shell}>
    <nav className={styles.breadcrumb} aria-label="位置">
      <Link href="/assessments">综合考试</Link><span>/</span>
      <Link href="/career">职业需求</Link><span>/</span><span>企业研究库</span>
    </nav>
    <section className={styles.hero}>
      <p className={styles.eyebrow}>SOCTHINK · EMPLOYER UNIVERSE</p>
      <h1>从中国上市企业，延伸到全球企业的中国岗位。</h1>
      <p className={styles.lead}>把公司、上市证券、实际招聘主体分开管理。一家企业同时在港股和美股上市，只计算一个企业；华晨宝马等合资公司使用自己的招聘主体。公司被收录不代表现在有岗位，也不代表本站有其官方面试真题。</p>
      <div className={styles.stats}>
        <div><strong>{totals.knownGroups}</strong><span>首批核查企业实体</span></div>
        <div><strong>{totals.listingReferences}</strong><span>证券代码映射</span></div>
        <div><strong>{totals.exchangeMarkets}</strong><span>涉及交易市场</span></div>
        <div><strong>{totals.inChinaForeign+totals.jointVentures}</strong><span>外企及合资样本</span></div>
      </div>
      <p className={styles.sampleNote}>当前仅展示已核对的初批企业样本，不是沪深北港美全量公司库，也不代表职位招聘数。核查批次：{CAREER_UNIVERSE_AS_OF}。</p>
    </section>
    <section className={styles.intro}>
      <div><span className={styles.kicker}>COMPANY IDENTITY / JOB EVIDENCE</span><h2>按企业类型与股票代码查询</h2></div>
      <p>本页的企业身份和官方招聘入口有单独的来源。具体职位、职责、考核流程另行核验；内容商品只有验证实际可交付后才会出售。</p>
    </section>
    <form method="GET" action="/career/companies" className={styles.filters} role="search">
      <label className={styles.searchLabel}>搜索企业或上市代码
        <input type="search" name="q" maxLength={120} defaultValue={q} placeholder="例如：百度、00700、BMW"/>
      </label>
      <label className={styles.familyLabel}>企业类别
        <select name="kind" defaultValue={kind}>
          <option value="">全部类型</option>
          {CAREER_ENTERPRISE_GROUPS.map(g=><option value={g.id} key={g.id}>{g.title}</option>)}
        </select>
      </label>
      <button type="submit">查询</button>
      {(q||kind)&&<Link href="/career/companies" className={styles.clear}>清除条件</Link>}
    </form>
    <p className={styles.resultCount}>本批企业身份记录：{companies.length} 家</p>
    {companies.length===0?<div className={styles.empty}>当前核查样本里暂未找到该企业，不代表企业不存在或未招聘。</div>:
      <div className={styles.grid}>{companies.map(company=>{
        const group=CAREER_ENTERPRISE_GROUPS.find(g=>g.id===company.entityKind);
        return <article className={styles.card} key={company.id}>
          <div className={styles.cardHeading}>
            <div><span className={styles.idTag}>{company.entityKind.toUpperCase().replaceAll("_"," ")}</span><h3>{company.displayName}</h3></div>
            <span className={styles.evidenceCount}>企业身份已核查</span>
          </div>
          <p className={styles.summary}>{group?.title??"企业"} · {group?.caption??""}</p>
          {company.listings.length>0&&<>
            <div className={styles.subheading}>公开上市证券（同一家企业）</div>
            <div className={styles.skills}>{company.listings.map(l=><a key={l.exchange+":"+l.ticker}
              href={l.proofUrl} target="_blank" rel="noopener noreferrer">{l.exchange} · {l.ticker}</a>)}</div>
          </>}
          {company.parentGroupNames.length>0&&
            <p className={styles.employers}>合资股东：{company.parentGroupNames.join("、")}（招聘主体独立）</p>}
          <div className={styles.subheading}>公开官方招聘入口</div>
          {company.recruitmentSources.length>0?
            <ul className={styles.sourceList}>{company.recruitmentSources.map((r,i)=><li key={r.url+i}>
              <a href={r.url} target="_blank" rel="noopener noreferrer">官方职业/岗位来源 {i+1}</a>
              <span>需按具体职位二次核验招聘有效性与能力要求</span>
            </li>)}</ul>:<p className={styles.summary}>尚未核实该集团的中国职位入口；不能据此认定当前招聘。</p>}
          {company.entityProofUrl&&<a href={company.entityProofUrl} target="_blank" rel="noopener noreferrer"
            className={styles.clear}>查看公司身份依据</a>}
        </article>;
      })}</div>}
    <section className={styles.disclosure}>
      <h2>从企业名单到求职训练，要分清三件事</h2>
      <p><strong>企业身份</strong>通过证券交易所/企业投资者关系资料核查；<strong>招聘证据</strong>通过该企业在中国实际招聘的官方职位页面核查；<strong>站内训练商品</strong>则是独立开发和评分的原创内容。三类状态不能互相替代。</p>
      <p>交易所完整名单及美国 SEC 数据是接下来扩容的来源，不把证券代码数、集团数、职位数混加成同一种“采集数量”。</p>
      <Link href="/career">查看按职位需求倒推的训练产品方向</Link>
    </section>
  </main>;
}
