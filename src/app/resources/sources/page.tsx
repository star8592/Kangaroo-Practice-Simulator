import Link from "next/link";
import sourceBatch from "../../../../data/discovery/official-source-index-20261031.json";
import styles from "./sources.module.css";

export const metadata = {
  title: "近三年官方资料来源索引 | SOC THINK",
  description: "按考试与年份查找 AMC、CEMC、袋鼠数学、雅思、托福、SAT 和职业资格考试的真实原始资料来源；清晰区分官方来源与付费原创内容。",
};

export default function OfficialSourcesPage() {
  const rows = sourceBatch.records;
  const groups = Array.from(new Set(rows.map(row => row.subject)));
  return <main className={styles.page}>
    <div className={styles.eyebrow}>SOC THINK / VERIFIED SOURCE INDEX</div>
    <h1>近三年考试资料来源</h1>
    <p className={styles.intro}>先找可靠来源，再制作真正有价值的学习资料。以下 {rows.length} 条索引来自已核对的官方机构页面或明确声明获得展示许可的第三方页面，覆盖 2024–2026 年的重点资料及当前考试规则。</p>
    <p className={styles.notice}>这是免费的外部来源导航，不是原题付费下载商城。外部网页允许浏览，不代表本站取得了商业复制、改编或转售许可。</p>
    <div className={styles.nav}><Link href="/resources">返回在线练习卷</Link><Link href="/membership">查看购买与权益</Link></div>
    {groups.map(group => <section key={group} className={styles.section}>
      <h2>{group}</h2>
      <div className={styles.grid}>{rows.filter(row => row.subject === group).map(row => <article key={row.id} className={styles.card}>
        <div className={styles.tags}><span>{row.year ?? "现行资料"}</span><span>{row.level}</span></div>
        <h3>{row.titleZh}</h3>
        <p className={styles.owner}>来源：{row.sourceOwner}</p>
        <p className={styles.note}>{row.note}</p>
        <a href={row.sourceUrl} target="_blank" rel="noopener noreferrer">前往原始资料来源 <span aria-hidden="true">↗</span></a>
      </article>)}</div>
    </section>)}
    <footer className={styles.footer}>资料来源检索不等于本站提供原卷商业转载。原创训练、原创解析及经授权的资料商品将分别核验实际文件、价格、付款和交付后才开放购买。</footer>
  </main>;
}
