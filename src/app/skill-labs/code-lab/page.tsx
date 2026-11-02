import Link from "next/link";
import type {Metadata} from "next";
import CodeLabClient from "@/components/CodeLabClient";
import styles from "@/app/assessment-center/measurement.module.css";
import workStyles from "@/components/code-lab.module.css";
export const metadata:Metadata={
 title:"软件工程师实操｜JavaScript真实代码运行与工程任务｜SOC THINK",
 description:"免费软件工程师JavaScript实操：数据处理、支付统计、重试退避、测试稳定性、故障日志和库存事件。QuickJS WebAssembly隔离执行，24组结果核验。原创训练，非企业资格认证。",
 alternates:{canonical:"/skill-labs/code-lab"},
};
export default function CodeLabPage(){return <div className={[styles.shell,workStyles.pageShell].join(" ")}>
 <nav className={styles.breadcrumb} aria-label="位置">
 <Link href="/skill-labs">技能实训</Link><span> / </span>软件工程师实操
 </nav>
 <CodeLabClient/>
 </div>}
