import Link from "next/link";
import { listExamProfiles } from "@/lib/question-bank";

export const dynamic = "force-dynamic";

export default function Home() {
  const exams = listExamProfiles();
  return (
    <div className="home-shell">
      <section className="hero-card">
        <div className="eyebrow">LOCAL COMPETITION TRAINING</div>
        <h1>袋鼠数学<br/><span>仿真考试实验室</span></h1>
        <p className="hero-copy">直接使用本地历年真题与题图，考试规则由每套试卷独立配置。当前已经同时支持 24 题 Level A 仿真卷与葡萄牙官方 Mini‑Escolar I 原卷。</p>
        <div className="hero-actions"><Link className="secondary-button" href="/admin/questions">查看本地题库</Link></div>
      </section>

      <section className="section-heading"><div><span className="eyebrow">AVAILABLE EXAMS</span><h1>选择考试</h1><p>每套试卷使用自己的题数、起始分、扣分和满分规则。</p></div></section>
      <section className="feature-grid">
        {exams.map((exam)=><article key={exam.id}>
          <div className="feature-index">{exam.country ?? "LOCAL"}</div>
          <h2>{exam.name}</h2>
          <p>{exam.grades} · {exam.questionCount} 题 · {Math.round(exam.durationSeconds/60)} 分钟 · 满分 {exam.maxScore}</p>
          {exam.sourceLabel&&<p>{exam.sourceLabel}</p>}
          <Link className="primary-button" href={`/exam/${exam.id}`}>开始考试</Link>
        </article>)}
      </section>

      <section className="stat-grid">
        <article><strong>{exams.length}</strong><span>套考试</span><p>配置驱动，可持续增加国家与年份</p></article>
        <article><strong>原图</strong><span>保真</span><p>几何、拼图、空间题直接使用 PDF 高清裁图</p></article>
        <article><strong>75</strong><span>分钟</span><p>倒计时、自动交卷与答题事件记录</p></article>
        <article><strong>本地</strong><span>优先</span><p>题库、答案和解析留在本机</p></article>
      </section>
    </div>
  );
}
