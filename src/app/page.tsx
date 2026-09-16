import Link from "next/link";

export default function Home() {
  return (
    <div className="home-shell">
      <section className="hero-card">
        <div className="eyebrow">LOCAL COMPETITION TRAINING</div>
        <h1>袋鼠数学<br/><span>仿真考试实验室</span></h1>
        <p className="hero-copy">基于本地历年资料库构建的 75 分钟真实考试闭环。第一阶段聚焦 Level A（Grades 1–2），保留 3 / 4 / 5 分梯度、自动计分、错题复盘与能力分析。</p>
        <div className="hero-actions">
          <Link className="primary-button" href="/exam/level-a">开始 Level A 模拟赛</Link>
          <Link className="secondary-button" href="/admin/questions">查看本地题库</Link>
        </div>
      </section>
      <section className="stat-grid">
        <article><strong>24</strong><span>题</span><p>8 × 3分 · 8 × 4分 · 8 × 5分</p></article>
        <article><strong>75</strong><span>分钟</span><p>自动倒计时与到时交卷</p></article>
        <article><strong>120</strong><span>满分</span><p>起始 24 分，错题 -1 分</p></article>
        <article><strong>本地</strong><span>题库</span><p>答案与解析不发送到考试客户端</p></article>
      </section>
      <section className="feature-grid">
        <article><div className="feature-index">01</div><h2>仿真考试</h2><p>题号导航、标记检查、自动保存、倒计时、未答题提醒与确认交卷。</p></article>
        <article><div className="feature-index">02</div><h2>成绩诊断</h2><p>按分值与知识点拆分正确率，不只给总分。</p></article>
        <article><div className="feature-index">03</div><h2>题库审核</h2><p>直接查看来源年份、答案、解析和审核状态，为后续 PDF 自动切题做准备。</p></article>
      </section>
    </div>
  );
}
