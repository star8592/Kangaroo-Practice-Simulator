import Link from "next/link";
import type {Metadata} from "next";
import CareerAptitudeRunner from "@/components/CareerAptitudeRunner";
import styles from "../measurement.module.css";
export const metadata:Metadata={
 title:"招聘通用能力模拟卷40题｜言语、数量、逻辑、资料分析与空间推理｜智量测评",
 description:"SOCTHINK原创40题招聘通用能力训练，45分钟，五类能力，答题卡、复查、真实成绩与逐题解析。非企业真题或标准化心理测验。",
 alternates:{canonical:"/assessment-center/career-aptitude-40"},
};
export default function CareerAptitudePage(){return <div className={styles.shell}>
 <nav className={styles.breadcrumb} aria-label="位置">
 <Link href="/assessments">全部考试</Link><span> / </span>
 <Link href="/assessment-center">科学测评</Link><span> / </span>
 <span>招聘通用能力</span>
 </nav>
 <CareerAptitudeRunner/>
</div>}
