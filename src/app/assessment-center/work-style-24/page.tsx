import Link from "next/link";
import CareerDiscoveryRunner from "@/components/CareerDiscoveryRunner";
import styles from "../measurement.module.css";
export const metadata={
 title:"工作方式探索 · 24题｜SOCTHINK",description:"原创四维工作习惯自评24题，免费查看计划、探索、协作与推进的自我描述，不提供就业预测或中国常模。",
 alternates:{canonical:"/assessment-center/work-style-24"}
};
export default function Page(){
 return <div className={styles.shell}><nav className={styles.breadcrumb} aria-label="位置">
 <Link href="/assessment-center">科学测评</Link><span> / </span>工作方式
 </nav><CareerDiscoveryRunner instrumentId="work-style-24"/></div>;
}
