import Link from "next/link";
import {ASSESSMENT_EVIDENCE} from "@/lib/assessment-evidence";
import styles from "@/app/assessment-center/measurement.module.css";

type Props={variant:"center"|"advanced"|"instrument";assessmentId?:string};
/**
 * Visible, auditable disclosure. Do not imply a corporate registration,
 * third-party endorsement, licensed psychological instrument, or local norms.
 */
export default function AssessmentTrustBrief({variant,assessmentId}:Props){
 const advanced=variant==="advanced";
 const record=variant==="instrument"?ASSESSMENT_EVIDENCE.find(x=>x.id===assessmentId):undefined;
 return <section className={styles.trustBrief} aria-label="开发方、测评依据与适用边界">
  <div className={styles.trustBriefHeading}>
   <div><span className={styles.eyebrowDark}>ABOUT THE ASSESSMENT</span>
    <h2>这项测评由谁开发？依据是什么？</h2></div>
   <Link href="/assessment-center/about">了解测评中心与开发原则 →</Link>
  </div>
  <div className={styles.trustBriefGrid}>
   <div><strong>开发与责任</strong><p>SOCTHINK 自主建设、维护测评与训练内容；不是 SHL、Pearson 或招聘机构的官方考试。</p></div>
   <div><strong>题目与方法</strong><p>{record?record.source:advanced?"40 道原创题，覆盖五类推理任务；领域分类参照公开专业资料。":"每项测评分别说明题项来源、许可、版本、计分方式与适用对象。"}</p></div>
   <div><strong>结果如何解释</strong><p>{record?record.limitations:advanced?"只解释本卷正确数、错题和练习方向；不报告 IQ、常模排名或录取预测。":"将经过验证的测评与原创训练分开标识；无证据不展示人群排名。"}</p></div>
  </div>
  <Link className={styles.trustBriefEvidence} href={advanced?"/assessment-center/methodology#advanced-reasoning-40":record?"/assessment-center/methodology#"+record.id:"/assessment-center/methodology"}>
    查看公开技术档案、证据状态与适用限制 →
  </Link>
 </section>;
}
