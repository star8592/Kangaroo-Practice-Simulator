import type {Metadata} from "next";
import Link from "next/link";
import ReadingPracticeClient from "@/components/ReadingPracticeClient";
import styles from "../measurement.module.css";
export const metadata:Metadata={
 title:"阅读理解与证据判断练习 · 16题｜智量测评中心",
 description:"4篇SOCTHINK原创材料，16题阅读任务，真实评分与逐题原文证据解析。仅供学习练习，不提供年级能力常模或诊断。",
 alternates:{canonical:"/assessment-center/reading-practice-16"}
};
export default function ReadingPracticePage(){
 return <div className={styles.shell}><nav className={styles.breadcrumb} aria-label="位置">
  <Link href="/assessments">全部考试</Link><span> / </span><Link href="/assessment-center">智量测评中心</Link>
  <span> / </span>阅读与证据判断</nav><ReadingPracticeClient/></div>;
}
