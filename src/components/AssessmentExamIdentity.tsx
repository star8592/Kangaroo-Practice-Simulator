import Link from "next/link";
import styles from "@/app/assessment-center/measurement.module.css";

/** Compact proof of context: identity and method remain available while taking a test. */
export default function AssessmentExamIdentity({assessmentId,mode}:{assessmentId:string;mode:"task"|"research"}){
 return <div className={styles.examIdentity} aria-label="考试与测评信息">
  <strong>SOCTHINK · {mode==="task"?"能力训练考场":"自我探索测评"}</strong>
  <div className={styles.examIdentityMeta}>
   <span>{mode==="task"?"原创训练，不代表机构官方考试":"研究性自评，暂无本土常模"}</span>
   <Link href={"/assessment-center/methodology#"+assessmentId}>本测评依据与计分</Link>
  </div>
 </div>;
}
