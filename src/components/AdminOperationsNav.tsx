import Link from "next/link";
import styles from "./AdminOperations.module.css";

export default function AdminOperationsNav() {
  return <nav className={styles.nav} aria-label="运营后台导航">
    <Link href="/admin">运营总览</Link>
    <Link href="/admin/families">微信用户与家庭</Link>
    <Link href="/admin/students">学生与学习画像</Link>
    <Link href="/admin/questions">题库检查</Link>
    <Link href="/admin/feedback">客户反馈</Link>
  </nav>;
}
