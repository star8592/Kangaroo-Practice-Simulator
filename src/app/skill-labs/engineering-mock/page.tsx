import Link from "next/link";
import type {Metadata} from "next";
import EngineeringCodeExamClient from "@/components/EngineeringCodeExamClient";
import styles from "@/app/assessment-center/measurement.module.css";
import workspace from "@/components/code-lab.module.css";
export const metadata:Metadata={
 title:"软件工程师综合编程模拟笔试｜60分钟6题100分｜SOC THINK",
 description:"原创软件工程模拟考试：60分钟、6道真实JavaScript编程题、24组测试用例、前端后端测试SRE分项报告。非企业官方笔试，无监考或防作弊认证。",
 alternates:{canonical:"/skill-labs/engineering-mock"},
};
export default function EngineeringCodeMockPage(){
 return <main className={[styles.shell,workspace.pageShell].join(" ")}>
  <nav className={styles.breadcrumb} aria-label="位置">
   <Link href="/skill-labs">技能实训</Link><span> / </span>软件工程综合模拟笔试
  </nav>
  <EngineeringCodeExamClient/>
 </main>;
}
