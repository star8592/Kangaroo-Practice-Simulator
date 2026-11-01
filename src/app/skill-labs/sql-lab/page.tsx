import Link from "next/link";
import SqlPracticeClient from "@/components/SqlPracticeClient";
import styles from "@/app/assessment-center/measurement.module.css";
export const metadata={
 title:"SQL 数据分析岗位实训｜SOC THINK 技能实训",
 description:"独立技能实训中心：真实 SQLite 执行、数据分析 SQL 练习与任务复盘。不是人格测评、智力测验或标准化岗位测评。",
 alternates:{canonical:"/skill-labs/sql-lab"}
};
export default function SqlSkillsPage(){
 return <div className={styles.shell}>
  <nav className={styles.breadcrumb} aria-label="位置">
    <Link href="/skill-labs">技能实训</Link><span> / </span>SQL 数据分析实训
  </nav>
  <SqlPracticeClient/>
 </div>;
}
