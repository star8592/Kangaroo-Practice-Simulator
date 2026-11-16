import type {Metadata} from "next";
import CambridgeStarterPractice from "@/components/CambridgeStarterPractice";
import {CAMBRIDGE_EXAMS} from "@/lib/cambridge-ket-pet";
import styles from "./cambridge.module.css";

export const metadata:Metadata={
  title:"剑桥KET/PET题型与阅读体验 | SOCTHINK",
  description:"按剑桥A2 Key for Schools与B1 Preliminary for Schools考试规格展示科目、题型和时长；含SOCTHINK原创阅读短练习。全真模考仍在建设中。",
};

export default function CambridgeKetPetPage(){
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.hero}>
          <p className={styles.kicker}>SOCTHINK · CAMBRIDGE EXAM PREPARATION</p>
          <h1>剑桥 KET / PET 备考中心</h1>
          <p className={styles.lead}>先摸清考试规则，再高效训练真实薄弱点。针对在校学生的A2 Key for Schools与B1 Preliminary for Schools设计。</p>
          <div className={styles.infoLine}>
            <span>已完成：考试题型规格和原创阅读体验</span>
            <span>建设中：完整试卷、听力与口语模拟</span>
          </div>
        </header>
        <div className={styles.levelGrid}>
          {([CAMBRIDGE_EXAMS.ket,CAMBRIDGE_EXAMS.pet]).map(exam=>
          <article className={styles.levelCard} key={exam.id}>
            <div className={styles.levelHeader}>
              <div><p className={styles.kicker}>{exam.cefr} ENGLISH</p><h2>{exam.title}</h2></div>
              <span className={styles.levelBadge}>{exam.cefr}</span>
            </div>
            <p className={styles.levelDescription}>{exam.id==="ket"?"适合训练基础生活英语，覆盖读、写、听、说。":"适合从基础向独立英语沟通过渡，强调阅读理解、写作与口语互动。"}</p>
            <div className={styles.stats}>
              <div><strong>{exam.papers.length}</strong><span>个考试模块</span></div>
              <div><strong>{exam.id==="ket"?"约2小时":"约2小时20分"}</strong><span>官方总时长</span></div>
            </div>
            <div className={styles.paperList}>
              {exam.papers.map(p=>
              <div className={styles.paper} key={p.id}>
                <div className={styles.paperHead}>
                  <strong>{p.zh}</strong>
                  <span>{p.minutes!==null?p.minutes+"分钟":"约"+p.approximatePairMinutes?.join("–")+"分钟/组"} · 占{p.weightingPercent}%</span>
                </div>
                <div className={styles.paperParts}>{p.parts.map(part=>(
                  <span key={part.number}>P{part.number} {part.title}{part.questions!==null?" "+part.questions+"题":""}</span>
                ))}</div>
              </div>)}
            </div>
            <p className={styles.officialLinks}>
              <a href={exam.sourceFormatUrl} target="_blank" rel="noopener noreferrer">剑桥官方考试规则</a>
              <a href={exam.sourcePreparationUrl} target="_blank" rel="noopener noreferrer">官方样题与听力资源</a>
            </p>
          </article>)}
        </div>
        <CambridgeStarterPractice/>
        <section className={styles.roadmap}>
          <h2>全真模拟正在按照官方规格建设</h2>
          <p>完整模拟必须先具备每个Part的足量经审核题目、两次播放的听力音频、可复核的写作/口语评分标准，以及真实考试的计时与答案提交规则。当前页面不会将4题阅读短练习标成一套完整KET或PET。</p>
          <p>官方考试需要考生与考官面对面进行口语测试；未来AI口语模拟是练习工具，不会冒充正式考官评分。Cambridge English Qualifications是剑桥英语的考试名称；本练习平台并非剑桥官方考试或报名中心。</p>
        </section>
      </div>
    </main>
  );
}
