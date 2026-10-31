import type {Metadata} from "next";
import Link from "next/link";
import {ASSESSMENT_DOMAINS} from "@/lib/assessment-platform";
import {EXAM_GUIDES,OFFICIAL_STUDY_SOURCES} from "@/lib/exam-guide-catalog";
import styles from "./ExamGuides.module.css";

export const metadata:Metadata={
  title:"考试规则与官方资料指南 | SOC THINK",
  description:"按官方公告梳理托福、雅思、考研、法考、公务员考试的适用年度、题型、时长、评分和资料来源；清楚区分规则指南与可做真题。",
};

export default function ExamGuides(){
  return <div data-site-shell="content" className={styles.page}>
    <section className={styles.hero}>
      <span className={styles.eyebrow}>OFFICIAL EXAM GUIDES / CURRENT RULES</span>
      <h1>考试规则与官方来源</h1>
      <p>先弄清楚考试的真实赛制，再做符合规则的模拟试卷。这里收录已逐项核对官方资料的考试规则，明确适用年度、考试结构和来源。</p>
      <p>截至 2026 年 10 月 31 日整理。本站资料窗口优先为 2024–2026 年；下一考试年度的规则按官方最新公告单独更新。</p>
      <Link href="/assessments">返回全部考试 →</Link>
    </section>
    <p className={styles.summary}>目前已核实 {EXAM_GUIDES.length} 项考试规则。此页不包含待售试卷或仿真考试；只有来源、题目、答案、评分和授权均完成核验的项目才会另行开放训练与购买。</p>
    <div className={styles.list}>
      {EXAM_GUIDES.map(guide=>{
        const domain=ASSESSMENT_DOMAINS.find(d=>d.id===guide.domainId)!;
        return <article className={styles.card} key={guide.id} id={guide.id}>
          <div className={styles.meta}>
            <span>{domain.name.zh}</span>
            <span>{guide.cycle}</span>
          </div>
          <h2>{guide.title}</h2>
          <p>{guide.summary}</p>
          <h3>考试结构</h3>
          <ul>{guide.structure.map(item=><li key={item}>{item}</li>)}</ul>
          <h3>时间、分值与注意事项</h3>
          <ul>{guide.timeAndScoring.map(item=><li key={item}>{item}</li>)}</ul>
          <p>{guide.scopeNote}</p>
          {OFFICIAL_STUDY_SOURCES.some(source=>source.topicId===guide.topicId)&&<>
            <h3>已找到的官方样题与考试系统</h3>
            <ul>{OFFICIAL_STUDY_SOURCES.filter(source=>source.topicId===guide.topicId).map(source=>
              <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a>
                <span>（{source.cycle}；仅跳转官方原站）</span>
              </li>
            )}</ul>
          </>}
          <div className={styles.footer}>
            <span>来源：{guide.issuer} · 核对日期 {guide.checkedAt} · 仅规则指南</span>
            <a href={guide.sourceUrl} target="_blank" rel="noopener noreferrer">查阅主办方或政府原始公告 ↗</a>
          </div>
        </article>;
      })}
    </div>
    <p className={styles.notice}>考试大纲、机考方式、报考资格和考试日程可能变化。使用前请打开原始公告核对具体适用年度；有些比赛的规则因地区、学段或职位而不同。公开查看公告不等于拥有真题复制、数字销售或再次分发权。</p>
  </div>;
}
