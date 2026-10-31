import type {Metadata} from "next";
import Link from "next/link";
import ReasoningPracticeClient from "@/components/ReasoningPracticeClient";
import styles from "../measurement.module.css";
export const metadata:Metadata={
  title:"认知推理任务练习（20题）｜智量测评中心",
  description:"原创非标准化数量、逻辑、空间、阅读任务。提供逐题解析和真实正确率，不生成 IQ、智商等级或人群百分位。",
  alternates:{canonical:"/assessment-center/reasoning-practice-20"}
};
export default function ReasoningPage(){
  return <div className={styles.shell}><nav className={styles.breadcrumb} aria-label="位置">
    <Link href="/assessments">全部考试</Link><span> / </span><Link href="/assessment-center">智量测评中心</Link>
    <span> / </span>认知推理任务</nav><ReasoningPracticeClient/></div>;
}
