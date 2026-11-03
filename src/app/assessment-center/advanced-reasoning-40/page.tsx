import Link from "next/link";
import type {Metadata} from "next";
import AdvancedReasoningRunner from "@/components/AdvancedReasoningRunner";
import styles from "../measurement.module.css";
export const metadata:Metadata={
 title:"高级逻辑与批判性推理 · 40题｜SOCTHINK",
 description:"原创40题、45分钟正式推理模拟：演绎、条件、归纳、假设与证据评价。可跳题、计时、交卷复盘。非官方考试、非标准化智力测评。",
 alternates:{canonical:"/assessment-center/advanced-reasoning-40"}
};
export default function AdvancedReasoningPage(){
 return <div className={styles.shell}>
  <nav className={styles.breadcrumb} aria-label="位置"><Link href="/assessment-center">测评中心</Link><span> / </span>高级逻辑推理</nav>
  <AdvancedReasoningRunner/>
 </div>;
}
