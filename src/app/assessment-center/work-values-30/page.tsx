import Link from "next/link";
import CareerDiscoveryRunner from "@/components/CareerDiscoveryRunner";
import styles from "../measurement.module.css";
export const metadata={
 title:"职业价值观探索 · 30题｜SOCTHINK",description:"原创六维职业价值观自我探索，免费完成30题并查看各维度均值及行动建议，不提供常模或官方认证。",
 alternates:{canonical:"/assessment-center/work-values-30"}
};
export default function Page(){
 return <div className={styles.shell}><nav className={styles.breadcrumb} aria-label="位置">
 <Link href="/assessment-center">科学测评</Link><span> / </span>职业价值观
 </nav><CareerDiscoveryRunner instrumentId="work-values-30"/></div>;
}
