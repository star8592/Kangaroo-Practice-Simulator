import Link from "next/link";
import type { Metadata } from "next";
import {
  listXiaoshengchuSchools, listXiaoshengchuSourceYears,
  queryXiaoshengchuDirectory, queryXiaoshengchuSchoolEvidence,
  XIAOSHENGCHU_SOURCE_DIRECTORY, XIAOSHENGCHU_SCHOOL_EVIDENCE,
  type XiaoshengchuKind,
} from "@/lib/xiaoshengchu-directory";
import styles from "./xiaoshengchu.module.css";

export const metadata: Metadata = {
  title: "武汉小升初资料与学校试卷来源 | SOCTHINK",
  description: "按学校、年份与学科查询武汉小升初游园试题、回忆题和资料出处。明确标记来源核验状态，不提供未经授权的扫描卷下载。",
};

const kinds: XiaoshengchuKind[] = ["考试及资料目录", "回忆题", "预测模拟", "活动与资讯"];
type SearchParam = string | string[] | undefined;
type SearchParams = Record<string,SearchParam>;
function first(value: SearchParam): string {
  return (Array.isArray(value) ? value[0] : value ?? "").trim().slice(0,100);
}
function readPage(value: SearchParam): number {
  const number = Number(first(value));
  return Number.isSafeInteger(number) && number > 0 ? number : 1;
}
function pathFor(values: Record<string,string>, page: number): string {
  const params = new URLSearchParams();
  for (const [key,value] of Object.entries(values)) if(value) params.set(key,value);
  if (page > 1) params.set("page",String(page));
  const tail=params.toString();
  return "/assessments/school/xiaoshengchu" + (tail ? "?" + tail : "");
}
const statusText: Record<string,string> = {
  requires_points_or_login:"网站可能要求积分或登录",
  login_or_paid:"网站可能要求付费或登录",
  public_page:"公开资料页",
  public_direct:"公开链接；转载权利待核",
};

export default async function XiaoshengchuSourcePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const query = await searchParams;
  const schoolOptions=listXiaoshengchuSchools();
  const yearOptions=listXiaoshengchuSourceYears();
  const q=first(query.q);
  const year=first(query.year) || "2026";
  const school=first(query.school);
  const subject=first(query.subject);
  const kind=first(query.kind);
  const current={q,year,school,subject,kind};
  const result=queryXiaoshengchuDirectory({...current,page:readPage(query.page)});
  const evidence = year === "2026" && !kind && !subject
    ? queryXiaoshengchuSchoolEvidence(q,school) : [];

  return <main className={styles.shell}>
    <nav className={styles.breadcrumb} aria-label="当前位置">
      <Link href="/assessments">综合考试与测评</Link><span aria-hidden> / </span>
      <span>K12 学业与能力</span><span aria-hidden> / </span><strong>小升初</strong>
    </nav>

    <section className={styles.hero}>
      <span className={styles.eyebrow}>SOCTHINK · K12 SCHOOL ADMISSIONS</span>
      <h1>小升初资料与学校试卷</h1>
      <p>武汉首批，逐步扩展全国。按学校、年份、语数英寻找来源，先辨别真实卷面、回忆题和模拟题，再决定下一步怎么练。</p>
      <div className={styles.summary}>
        <div><strong>{XIAOSHENGCHU_SOURCE_DIRECTORY.length}</strong><span>外部资料线索</span></div>
        <div><strong>{XIAOSHENGCHU_SCHOOL_EVIDENCE.length}</strong><span>学校与来源证据</span></div>
        <div><strong>0</strong><span>已授权可直接公开的原卷</span></div>
      </div>
      <div className={styles.heroActions}>
        <a className={styles.yearLink} href={pathFor({q:"",year:"2026",school:"",subject:"",kind:""},1)}>查看 2026 届资料</a>
        <Link className={styles.practiceLink} href="/arithmetic">去做免费数学训练</Link>
      </div>
    </section>

    <section aria-labelledby="source-title" className={styles.content}>
      <div className={styles.sectionHead}>
        <div>
          <span className={styles.eyebrow}>SOURCE DIRECTORY</span>
          <h2 id="source-title">学校与考试资料检索</h2>
        </div>
        <p>标题或发布时间不代表学校认证。这里只显示来源目录；不能把它当作完整试卷下载或收费服务。</p>
      </div>
      <form action="/assessments/school/xiaoshengchu" method="get" className={styles.filters} role="search">
        <label className={styles.searchField}><span>搜索</span>
          <input name="q" type="search" maxLength={100} defaultValue={q} placeholder="学校、试卷、媒体来源或关键词"/>
        </label>
        <label><span>考试年份 / 届别</span>
          <select name="year" defaultValue={year}>
            <option value="">全部年份</option>
            {yearOptions.map(value=><option key={value} value={value}>{value === "2026" ? "2026年 / 2026届" : value+"年"}</option>)}
          </select>
        </label>
        <label><span>学校</span>
          <select name="school" defaultValue={school}>
            <option value="">全部学校</option>
            {schoolOptions.map(value=><option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label><span>学科</span>
          <select name="subject" defaultValue={subject}>
            <option value="">全部学科</option>
            {["数学","语文","英语","语数英综合","未判定"].map(value=><option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label><span>类型</span>
          <select name="kind" defaultValue={kind}>
            <option value="">全部类型</option>
            {kinds.map(value=><option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <button className={styles.submit} type="submit">查询资料</button>
        <Link className={styles.clear} href="/assessments/school/xiaoshengchu?year=2026">重置</Link>
      </form>

      <div className={styles.resultLine}>
        <strong>{result.total} 条符合条件的来源</strong>
        <span>第 {result.page} / {result.totalPages} 页，每页最多 {result.pageSize} 条</span>
      </div>
      {result.rows.length ? <div className={styles.list}>
        {result.rows.map(item=><article key={item.id} className={styles.card}>
          <div className={styles.cardHeader}><span className={styles.kind}>{item.kind}</span><span className={styles.unverified}>第三方来源 · 未认证</span></div>
          <h3>{item.title}</h3>
          <div className={styles.meta}>
            <span>{item.school}</span><span>{item.year}</span>
            <span>{item.subject}</span><span>{item.provider}</span>
            {item.publishedAt && <span>网页发布日期：{item.publishedAt}</span>}
          </div>
          <div className={styles.cardBottom}>
            <p>{statusText[item.access] ?? "访问条件待核"}；仅提供原站线索，尚未核实完整试卷和再分发权。</p>
            <a href={item.url} target="_blank" rel="noopener noreferrer">查看原始来源 <span aria-hidden>↗</span></a>
          </div>
        </article>)}
      </div>:<div className={styles.empty}>
        <h3>没有找到符合条件的来源</h3>
        <p>可以清除学校或学科条件，重新检索。目前的资料覆盖还不完整。</p>
        <Link href="/assessments/school/xiaoshengchu?year=2026">查看全部 2026 届来源</Link>
      </div>}
      {result.totalPages>1&&<nav className={styles.pager} aria-label="分页">
        {result.page>1?<Link href={pathFor(current,result.page-1)}>上一页</Link>:<span aria-disabled>上一页</span>}
        <span>第 {result.page} / {result.totalPages} 页</span>
        {result.page<result.totalPages?<Link href={pathFor(current,result.page+1)}>下一页</Link>:<span aria-disabled>下一页</span>}
      </nav>}
    </section>

    {evidence.length>0&&<section className={styles.content} aria-labelledby="evidence-title">
      <div className={styles.sectionHead}>
        <div><span className={styles.eyebrow}>SCHOOL EVIDENCE</span><h2 id="evidence-title">2026 届学校信息线索</h2></div>
        <p>活动日期、考试届别与网页发布日期不同。来源相互矛盾时，以学校原始通知和试卷页眉为准。</p>
      </div>
      <div className={styles.evidenceGrid}>
        {evidence.map((entry,i)=><article key={entry.sourceUrl+entry.school+i} className={styles.evidenceCard}>
          <div className={styles.evidenceTitle}><strong>{entry.school}</strong><span>{entry.cohort}</span></div>
          <p>{entry.description}</p>
          <p className={styles.evidenceMeta}>{entry.kind} · 日期线索：{entry.date || "待核实"}</p>
          <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer">核对来源</a>
        </article>)}
      </div>
    </section>}

    <section className={styles.disclosure}>
      <h2>为什么这里不直接出售所谓的“2026 真题”？</h2>
      <p>资料库已收录公开网页线索，但外部链接并不等于我们获得了试卷的发布授权。扫描图、OCR 候选及答案都需要核对学校、年份、题目完整性和权利状态。未经核实的材料不会进入学生正式考试或付费下载。</p>
      <p>真正可供学习的产品会复用 SOCTHINK 的数学训练、考试评分、解析、错题复测和学习报告，而不是只把资料换成 PDF。</p>
    </section>
  </main>;
}
