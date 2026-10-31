import Link from "next/link";
import SqlPracticeClient from "@/components/SqlPracticeClient";
import styles from "../measurement.module.css";
export const metadata={
  title:"真实 SQL 岗位技能实训｜智量测评中心",
  description:"浏览器隔离的 SQLite 实操：订单筛选、GROUP BY、JOIN、HAVING，使用两组真实执行结果验证 SQL，不是猜答案。",
  alternates:{canonical:"/assessment-center/sql-lab"}
};
export default function SqlLabPage(){
 return <div className={styles.shell}><nav className={styles.breadcrumb} aria-label="位置">
  <Link href="/assessments">全部考试</Link><span> / </span><Link href="/assessment-center">智量测评中心</Link><span> / </span>真实 SQL 实训</nav>
  <SqlPracticeClient/></div>;
}
