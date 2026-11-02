import Link from "next/link";
import CareerDiscoveryRunner from "@/components/CareerDiscoveryRunner";
import styles from "../measurement.module.css";
export const metadata={
 title:"职场情境判断 · 24个原创案例｜SOCTHINK",description:"沟通、冲突、风险与交付四类原创SJT风格练习，24个真实情境模拟与逐题参考策略解释；非经专家标定的正式招聘测验。",
 alternates:{canonical:"/assessment-center/workplace-sjt-24"}
};
export default function Page(){
 return <div className={styles.shell}><nav className={styles.breadcrumb} aria-label="位置">
 <Link href="/assessment-center">科学测评</Link><span> / </span>职场情境训练
 </nav><CareerDiscoveryRunner instrumentId="workplace-sjt-24"/></div>;
}
