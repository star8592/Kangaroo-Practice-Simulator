import Link from "next/link";
import {CAREER_DEMAND_OBSERVED_AT,CAREER_FAMILIES,countCareerEvidence,
  searchCareerDemand} from "@/lib/career-demand";
import {getCareerSupplyCandidates} from "@/lib/career-product-mapper";
import {CAREER_MARKET_GROWTH,getCareerMarketGrowth} from "@/lib/career-market-growth";
import {CAREER_ORIGINAL_GUIDES,guideForFamily} from "@/lib/career-original-guides";
import {CAREER_FORMAL_PAPERS} from "@/lib/career-formal-bank";
import CareerRoleExplorer from "@/components/CareerRoleExplorer";
import commerce from "./career-commerce.module.css";
import styles from "./career.module.css";

export const metadata={
  title:"职业考试与复习资料｜270个分类岗位｜SOCTHINK",
  description:"免费参与原创40题招聘通用能力模拟、采购/运营/质量24题岗位笔试及SQL工程实训；查询来源明确的岗位资料与原创职业教程。",
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
  const family=typeof params.family==="string"?params.family:"";
  const results=searchCareerDemand(q,family);
  const stats=countCareerEvidence();
  const largestSample=Math.max(1,...CAREER_FAMILIES.map(x=>
    searchCareerDemand("",x.id).reduce((n,g)=>n+g.signals.length,0)));
  return <main className={styles.shell}>
    <nav className={styles.breadcrumb} aria-label="位置">
      <Link href="/assessments">综合考试</Link><span>/</span><span>职业岗位与产品</span>
    </nav>
    <section className={commerce.commercialHero} aria-label="职业资料与考试服务入口">
      <div className={commerce.heroLead}>
        <span className={commerce.overline}>职业资料与模拟考试中心</span>
        <h1>要复习资料？还是要模拟考试？</h1>
      </div>
      <div className={commerce.mobileQuickActions} aria-label="资料或模拟考试">
        <a href="#digital-materials">找复习资料 <span aria-hidden="true">→</span></a>
        <a href="#digital-services">做模拟考试 <span aria-hidden="true">→</span></a>
      </div>
      <div className={commerce.heroOffers}>
        <article className={commerce.heroOffer}>
          <span className={commerce.offerKind}>01 · 数字资料</span>
          <h2>职业教程与复习资料</h2>
          <p>{CAREER_ORIGINAL_GUIDES.length} 份完整教程 · 免费阅读与下载</p>
          <Link className={commerce.bigAction} href="#digital-materials">
            找资料 · 免费领取 <span aria-hidden="true">→</span>
          </Link>
        </article>
        <article className={commerce.heroOffer+" "+commerce.heroOfferService}>
          <span className={commerce.offerKind}>02 · 在线考试</span>
          <h2>模拟考试与自动评分</h2>
          <p>{CAREER_FORMAL_PAPERS.length} 套标准岗位笔试 · 每套24题 / 45分钟</p>
          <Link className={commerce.bigAction+" "+commerce.bigActionService}
            href="#digital-services">做模拟考试 · 立即开始 <span aria-hidden="true">→</span></Link>
        </article>
      </div>
    </section>
    <section className={styles.commerceSection} id="digital-materials" aria-labelledby="materials-title">
      <div className={styles.commerceHeading}>
        <div><span className={styles.commerceNumber}>01 / DIGITAL GOODS</span>
          <h2 id="materials-title">数字资料 · 教程与复习包</h2>
          </div>
        <span className={styles.commerceCount}>{CAREER_ORIGINAL_GUIDES.length} 份已完成原创资料</span>
      </div>
      <div className={styles.offerGrid}>
        {CAREER_ORIGINAL_GUIDES.map(g=><article key={g.id} className={styles.offerCard}>
          <div className={styles.offerTop}><span>原创教程 / 数字文件</span><strong>免费完整领取</strong></div>
          <h3>{g.title}</h3><p>{g.summary}</p>
          <div className={styles.offerSpecs}><span>{g.sections.length} 个章节</span><span>Markdown 文件</span><span>可在线阅读</span></div>
          <div className={styles.offerActions}>
            <Link href={"/career/guides/"+g.id}>阅读完整教程</Link>
            <a href={"/career/guides/"+g.id+"/download"}>下载资料</a>
          </div>
        </article>)}
      </div>
    </section>
    <section className={styles.commerceSection} id="digital-services" aria-labelledby="services-title">
      <div className={styles.commerceHeading}>
        <div><span className={styles.commerceNumber}>02 / DIGITAL EXAMS</span>
          <h2 id="services-title">标准岗位模拟笔试 · 24题 / 45分钟</h2>
          <p>入场计时、答题卡、交卷复核、自动评分及逐题解析。</p></div>
        <span className={styles.commerceCount}>{CAREER_FORMAL_PAPERS.length} 套完整模拟卷 · {CAREER_FORMAL_PAPERS.reduce((n,p)=>n+p.questions.length,0)}道原创题</span>
      </div>
      <div className={styles.quickTestRow} aria-label="通用能力与技术实操">
        <div className={styles.quickTestItem}>
          <strong>招聘通用能力</strong><span>40题 · 45分钟</span>
          <Link href="/assessment-center/career-aptitude-40">开始模拟</Link>
        </div>
        <div className={styles.quickTestItem}>
          <strong>数据工程师 · SQL实操</strong><span>8项真实SQL任务</span>
          <Link href="/skill-labs/sql-lab">进入实操</Link>
        </div>
      </div>
      <div className={styles.offerGrid}>
        {CAREER_FORMAL_PAPERS.map(paper=><article className={styles.offerCard} key={paper.id}>
          <div className={styles.offerTop}><span>标准模拟笔试 / 限时考场</span><strong>免费完整体验</strong></div>
          <h3>{paper.title}</h3>
          <p>{paper.context}</p>
          <div className={styles.offerSpecs}><span>{paper.questions.length} 道题</span>
            <span>{paper.maxPoints} 分</span><span>{paper.durationMinutes} 分钟限时</span><span>2026 Q4 · 原创v{paper.revision}</span></div>
          <div className={styles.offerActions}>
            <Link href={"/career/exams/"+paper.id}>进入考场 · 确认入场</Link>
            <Link href={"/career/guides/"+guideForFamily(paper.family)!.id}>考前复习资料</Link>
          </div>
        </article>)}
      </div>

    </section>
    <CareerRoleExplorer/>

    <section className={styles.marketStage} id="market-heat">
      <div className={styles.sectionTitle}>
        <div><span className={styles.kicker}>MARKET SIGNALS</span><h2>招聘热度：有数据才显示增速</h2></div>
        <p>以下是真实报告中<strong>具体职位面向应届生的同比招聘增长</strong>，不是整个职业领域的热度，也不是当前在招人数。其他岗位暂不乱填“热度分”。</p>
      </div>
      <div className={styles.heatGrid}>
        {CAREER_MARKET_GROWTH.map(m=><article key={m.family} className={styles.heatCard}>
          <span className={styles.heatOccupation}>{m.occupation}</span>
          <div className={styles.heatRate}>+{m.growthPercent.toFixed(1)}<span>%</span></div>
          <div className={styles.heatTrack}><span style={{width:Math.max(0,Math.min(100,m.growthPercent/60*100))+"%"}}/></div>
          <p>2026年第三季度 · 应届职位数同比</p>
          <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer">查看智联招聘研究数据来源</a>
        </article>)}
      </div>
      <p className={styles.heatFoot}>指标来自智联研究院2026年三季度报告，经2026-10-16媒体转述。图条统一按0–60%刻度展示，仅用于比较<strong>同一口径的四个具体职位</strong>；无法据此推导薪资、录取概率或其他12类岗位的冷热。</p>
      <div className={styles.stats} aria-label="首轮非随机招聘研究资料覆盖">
        <div><strong>{stats.employers}</strong><span>家有来源的样本企业</span></div>
        <div><strong>{stats.families}</strong><span>个岗位领域</span></div>
        <div><strong>{stats.detailedJobs}</strong><span>份具体职位描述</span></div>
        <div><strong>{stats.signals}</strong><span>条招聘或类别样本</span></div>
      </div>
      <p className={styles.sampleNote}>企业研究样本并非全网实时招聘量；不把股票代码数、网页分类数当成在招岗位数。资料采集汇总于 {CAREER_DEMAND_OBSERVED_AT}。</p>
    </section>

    <details className={commerce.researchDetails} id="career-evidence">
      <summary>招聘研究资料与来源验证（专业研究区 · 点击展开）</summary>
      <p className={commerce.researchDisclaimer}>这里提供已核对的企业招聘来源、样本能力要求与规划中的训练方向。它们不是正在售卖的商品，也不代表当前真实岗位数量。</p>
    <section className={styles.intro}>
      <div><span className={styles.kicker}>CAREER DIRECTORY</span><h2>按岗位找到证据与学习产品</h2></div>
      <p>先看已证实的招聘增长和本库资料覆盖，再进入对应教程或在线练习。具体企业招聘出处可以展开核对，避免大段来源抢占第一屏。</p>
    </section>
    <form className={styles.filters} method="GET" action="/career" role="search">
      <label className={styles.searchLabel}>搜索公司、岗位或能力
        <input name="q" defaultValue={q} maxLength={100} placeholder="例如：美团、采购、AI、产品" type="search"/>
      </label>
      <label className={styles.familyLabel}>岗位领域
        <select name="family" defaultValue={family}>
          <option value="">全部岗位</option>
          {CAREER_FAMILIES.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
      </label>
      <button type="submit">筛选岗位</button>
      {(q||family)&&<Link className={styles.clear} href="/career#career-evidence">清除筛选</Link>}
    </form>
    <p className={styles.resultCount}>符合条件的岗位领域：{results.length}</p>
    {results.length===0?<div className={styles.empty}>当前研究样本没有对应记录。这不代表该岗位需求为零。</div>:
    <div className={styles.grid}>
      {results.map(group=>{
        const candidates=getCareerSupplyCandidates(group.id);
        const guide=guideForFamily(group.id);
        const available=CAREER_FORMAL_PAPERS.filter(x=>x.family===group.id&&x.deliveryState==="free-live-preview");
        const metric=getCareerMarketGrowth(group.id);
        const jobCount=group.signals.filter(s=>s.evidenceLevel==="job").length;
        return <article key={group.id} className={styles.card}>
          <div className={styles.cardHeading}>
            <div><span className={styles.idTag}>{group.id.toUpperCase()}</span><h3>{group.name}</h3></div>
            <span className={styles.evidenceCount}>{group.signals.length} 条公开样本</span>
          </div>
          <p className={styles.summary}>{group.summary}</p>
          <div className={styles.familyHeat}>
            {metric?<div><span className={styles.heatCaption}>可比招聘增长 · {metric.occupation}</span>
              <strong>+{metric.growthPercent.toFixed(1)}%</strong>
              <small>2026年Q3应届职位数同比 · <a href={metric.sourceUrl} target="_blank" rel="noopener noreferrer">来源</a></small>
            </div>:<div><span className={styles.heatCaption}>市场岗位增长数据</span>
              <strong className={styles.heatUnknown}>暂无可比数据</strong>
              <small>暂不判定冷门或热门</small></div>}
            <div><span className={styles.heatCaption}>本站招聘证据覆盖（非市场热度）</span>
              <strong>{jobCount} <small>份职位级样本</small></strong>
              <div className={styles.familySampleTrack}><span style={{width:(group.signals.length/largestSample*100)+"%"}}/></div>
              <small>共{group.signals.length}条公开记录 · {group.employers.length}家样本企业</small>
            </div>
          </div>
          <div className={styles.cardProducts}>
            <strong>本岗位可用内容</strong>
            {guide&&<Link href={"/career/guides/"+guide.id}> <span>资料</span> {guide.title} · 阅读/下载</Link>}
            {available.map(x=><Link key={x.id} href={"/career/exams/"+x.id}>
              <span>考试</span> {x.title} · 正式笔试</Link>)}
            {!guide&&available.length===0&&<p>暂无完成验收的资料或考试服务；不展示虚构购买入口。</p>}
          </div>
          {group.skillCodes.length>0&&<div className={styles.skills}>
            {group.skillCodes.slice(0,7).map(skill=><span key={skill}>{SKILL_ZH[skill]??skill.replaceAll("_"," ")}</span>)}
          </div>}
          <details className={styles.evidenceDetails}>
            <summary>查看 {group.employers.length} 家企业的招聘证据及技能产品规划</summary>
            <p className={styles.employers}>样本企业：{group.employers.join("、")}</p>
            <ul className={styles.sourceList}>
              {group.signals.map(s=><li key={s.id}>
                <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer">{s.company} · {s.roleTitle}</a>
                <span>{s.evidenceLevel==="job"?"具体职位说明":"岗位类别线索"} · 采集 {s.observedAt}</span>
              </li>)}
            </ul>
            <div className={styles.proposal}>
              <div className={styles.proposalTop}><strong>能力方向与供应进度</strong><span>已开放或规划中 · 非企业官方考题</span></div>
              {candidates.length>0?<ul>{candidates.map(c=><li key={c.id}>{c.title}
                <small> · {c.evidenceCount}条具体岗位证据 · {c.readiness==="free-exam"?"已有标准模拟笔试":"尚在规划"}</small>
              </li>)}</ul>:<p className={styles.noSupply}>仅有岗位类别样本，缺少具体技能要求；暂不制造考试商品。</p>}
            </div>
          </details>
        </article>;
      })}
    </div>}

    </details>
    <section className={styles.disclosure}>
      <h2>岗位热度不等于录用概率，培训也不等于企业官方考试</h2>
      <p>市场增长指标来自第三方2026年季度招聘研究，明确限定到所报道的具体职位、应届生群体和统计期间。本站企业资料是非随机来源样本；没有足够可比指标的岗位不会补造指数。资料和考试皆为本站原创，与目标企业无合作、招聘或合格保证。</p>
      <Link href="/career/companies">查看上市企业、外企及合资企业研究库</Link>
      <Link href="/assessments">返回综合考试中心</Link>
    </section>
  </main>;
}
