import Link from "next/link";
import HomeLanguageBridge from "@/components/HomeLanguageBridge";
import type { ExamProfile } from "@/lib/types";
import styles from "./ClassicMathShell.module.css";

/** The 2026-10 classic math competition UI is still HomeClient.
 * Restore its original palette in a scope, not in global CSS.
 * Current exam/answer/account/payment routes are not replaced.
 */
export default function ClassicMathShell({exams}:{exams:ExamProfile[]}) {
 return <div data-classic-math="true" data-site-shell="content" className={styles.classic}>
  <nav className={styles.quick} aria-label="数学课堂快捷入口">
   <Link href="/math" aria-label="国际数学竞赛主页">国际数学竞赛</Link>
   <Link href="/competitions">模拟试卷</Link>
   <Link href="/arithmetic">口算训练</Link>
   <Link href="/review">错题复盘</Link>
   <Link href="/student">学习记录</Link>
   <Link href="/events">赛事管家</Link>
   <Link href="/exam-planner">考试日程</Link>
  </nav>
  <HomeLanguageBridge exams={exams}/>
 </div>;
}
