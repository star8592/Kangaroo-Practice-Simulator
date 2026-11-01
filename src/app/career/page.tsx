import Link from "next/link";
import {CAREER_DEMAND_OBSERVED_AT, CAREER_FAMILIES, countCareerEvidence,
  searchCareerDemand} from "@/lib/career-demand";
import {getCareerSupplyCandidates} from "@/lib/career-product-mapper";

import styles from "./career.module.css";

export const metadata={
  title:"企业招聘需求与职业训练方向 | SOCTHINK",
  description:"从企业公开岗位需求倒推职业能力，覆盖研发、运营、销售、供应链、财务、市场、设计等岗位。明确区分已核对的企业岗位和本站计划研发的原创训练。",
  alternates:{canonical:"/career"},
};

const SKILL_ZH:Record<string,string>={
  python:"Python",sql:"SQL",rag:"RAG",agent:"Agent工程",mcp:"MCP",api:"API开发",
  roi:"ROI分析",category_management:"类目管理",price_strategy:"定价策略",
  retail_metrics:"零售经营指标",inventory_planning:"库存计划",
  supplier_selection:"供应商筛选",cost_negotiation:"成本谈判",
  market_research:"市场研究",product_lifecycle:"商品生命周期",
  process_design:"业务流程设计",project_management:"项目管理",
  business_model:"商业模型",saas_metrics:"SaaS经营指标",
  visual_design:"视觉设计",brief_interpretation:"设计需求理解",
  data_analysis:"数据分析",user_segmentation:"用户分层",statistics:"统计分析",
  ab_testing:"A/B测试",causal_inference:"因果推断",
};

type SearchParams=Promise<{q?:string|string[];family?:string|string[]}>;
export default async function CareerDemandPage({searchParams}:{searchParams:SearchParams}){
  const params=await searchParams;
  const q=typeof params.q==="string"?params.q.trim().slice(0,100):"";
  const family=typeof params.family==="string" ? params.family:"";
  const results=searchCareerDemand(q,family);
  const stats=countCareerEvidence();
  return <main className={styles.shell}>
    <nav className={styles.breadcrumb} aria-label="位置">
      <Link href="/assessments">综合考试</Link><span>/</span><span>职业与招聘需求</span>
    </nav>
    <section className={styles.hero}>
      <p className={styles.eyebrow}>SOCTHINK · EMPLOYER DEMAND INTELLIGENCE</p>
      <h1>从企业真正需要什么，决定我们教什么、考什么。</h1>
      <p className={styles.lead}>先研究公开招聘要求，再组织职业技能训练、岗位案例、模拟面试和可执行实验。不是先囤教程再想办法销售，也不把自编训练冒充大厂官方真题。</p>
      <Link href="/career/companies" style={{display:"inline-block",color:"#ffffff",textDecoration:"underline",fontWeight:700,marginBottom:12}}>查看沪深北、港美上市企业及在华外企、合资企业库 →</Link>
      <div className={styles.stats} aria-label="首轮非随机招聘资料样本">
        <div><strong>{stats.employers}</strong><span>家企业的公开来源</span></div>
        <div><strong>{stats.families}</strong><span>个岗位领域有样本</span></div>
        <div><strong>{stats.signals}</strong><span>条岗位/类别证据</span></div>
        <div><strong>{stats.detailedJobs}</strong><span>份具体岗位示例</span></div>
      </div>
      <p className={styles.sampleNote}>这是首轮非随机公开资料样本，不代表实际招聘岗位总量、市场占比或在招状态。最近汇总：{CAREER_DEMAND_OBSERVED_AT}。</p>
    </section>
    <section className={styles.intro}>
      <div><span className={styles.kicker}>DEMAND → TRAINING</span><h2>按真实岗位领域组织内容</h2></div>
      <p>以下「官方证据」仅说明招聘页面公开了哪些岗位或职责。「本站规划」是我们据此推导的原创教学与评测方向，尚未开放购买。</p>
    </section>
    <form className={styles.filters} method="GET" action="/career" role="search">
      <label className={styles.searchLabel}>搜索公司、岗位或能力
        <input name="q" defaultValue={q} maxLength={100} placeholder="例如：美团、采购、Agent、产品" type="search"/>
      </label>
      <label className={styles.familyLabel}>岗位领域
        <select name="family" defaultValue={family}>
          <option value="">全部岗位</option>
          {CAREER_FAMILIES.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
      </label>
      <button type="submit">筛选需求</button>
      {(q||family)&&<Link className={styles.clear} href="/career">清除筛选</Link>}
    </form>
    <p className={styles.resultCount}>符合条件的岗位领域：{results.length}</p>
    {results.length===0?<div className={styles.empty}>目前样本中没有对应记录。请换一个关键词；这不代表企业没有这类需求。</div>:
    <div className={styles.grid}>
      {results.map(group=>{const candidates=getCareerSupplyCandidates(group.id);
      const available=candidates.filter(x=>x.readiness==="free-practice"&&x.liveHref);
      return <article className={styles.card} key={group.id}>
        <div className={styles.cardHeading}>
          <div><span className={styles.idTag}>{group.id.toUpperCase()}</span><h3>{group.name}</h3></div>
          <span className={styles.evidenceCount}>{group.signals.length} 条公开样本</span>
        </div>
        <p className={styles.summary}>{group.summary}</p>
        <p className={styles.employers}>样本企业：{group.employers.join("、")}</p>
        <div className={styles.subheading}>官方招聘证据</div>
        <ul className={styles.sourceList}>
          {group.signals.map(s=><li key={s.id}>
            <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer">{s.company} · {s.roleTitle}</a>
            <span>{s.evidenceLevel==="job"?"具体岗位说明":"岗位类别证据"} · {s.observedAt}</span>
          </li>)}
        </ul>
        {group.skillCodes.length>0&&<>
          <div className={styles.subheading}>具体岗位中明确体现的能力</div>
          <div className={styles.skills}>{group.skillCodes.map(s=><span key={s}>{SKILL_ZH[s]??s.replaceAll("_"," ")}</span>)}</div>
        </>}
        <div className={styles.proposal}>
          <div className={styles.proposalTop}><strong>本站原创训练供应</strong><span>已开放或规划中 · 非企业官方考题</span></div>
          {candidates.length>0?<ul>{candidates.map(candidate=><li key={candidate.id}>
            {candidate.title}<small> · {candidate.evidenceCount} 条具体岗位证据 · {candidate.readiness==="free-practice"?"免费实操已开放":"尚在规划"}</small>
          </li>)}</ul>:<p className={styles.noSupply}>目前只有岗位类别证据，没有足够具体的岗位能力要求；暂不自动生成培训商品。</p>}
        </div>
        {available.length>0&&<div className={styles.practiceLive}>
          <strong>现在可以免费完成的原创实操</strong>
          {available.map(x=><Link key={x.id} href={x.liveHref!}>
            {x.title} · 免费在线作答与评分 →
          </Link>)}
        </div>}
      </article>;})}
    </div>}
    <section className={styles.disclosure}>
      <h2>依据和产品分开，才能真正专业</h2>
      <p>企业岗位类别不证明一定存在对应笔试；只有具体岗位描述才支持相应能力要求，具体考试流程必须以当届官方通知为准。本站训练方向是基于岗位需求的原创设计，不涉及未授权真题、内部题库或录用保证。</p>
      <p>后续接入岗位需求增量采集、跨企业技能映射、真实课程/考卷交付状态和训练数据后，页面将由版本化需求数据自动更新，不需要手工维护一堆公司的硬编码展示页。</p>
      <Link href="/assessments">返回综合考试中心</Link>
    </section>
  </main>;
}
