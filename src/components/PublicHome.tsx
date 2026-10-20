"use client";

import Link from "next/link";
import { useSiteLanguage } from "@/lib/site-language";

const UI={
 zh:{
  eye:"SOC THINK · K12 数学成长系统",
  title1:"少做无效题，",title2:"让每一道计算题都有用",
  copy:"小学到高中 G1–G12：边练边发现卡点，只补最值得补的。答题、批改和下一步建议由系统完成，把时间还给孩子。",
  primary:"开始计算训练",competition:"国际数学竞赛 →",login:"已有账号登录",register:"家长免费注册",
  loop:"为什么练得少，也要练得准？",
  s1:"现在在哪里",s1d:"从年级、正确率、速度和题型表现建立当前能力基线。",
  s2:"为什么会错",s2d:"区分知识缺口、计算失误、策略不足和速度问题，而不是只记录对错。",
  s3:"下一步练什么",s3d:"根据薄弱点进入针对性计算训练、错题复盘或竞赛题型训练。",
  s4:"有没有进步",s4d:"持续记录正确率、速度、错因和考试表现，让家长和学生看到变化。",
  modes:"计算训练是第一步",
  calc:"为孩子匹配最值得练的计算",calcDesc:"覆盖小学到高中，先看当前表现，再聚焦正确率、速度和巧算方法；证据够了就结束本轮，不凑题量。",calcCta:"进入计算训练",
  comp:"国际数学竞赛 · 进阶挑战",compDesc:"袋鼠数学、澳洲 AMC、美国 AMC 和 CEMC 等赛事训练，在基础计算更稳后按需挑战。",compCta:"进入竞赛中心",
  profile:"学习结果不是一次分数",profileDesc:"训练记录、速度、正确率、错因与考试表现汇入长期档案。登录后可继续上次进度并查看个人学习报告。",profileCta:"查看我的学习报告",
 },
 en:{
  eye:"SOC THINK · K12 MATH GROWTH",
  title1:"Fewer wasted questions.",title2:"Every calculation should count.",
  copy:"Grades 1–12: practice while locating the real sticking points. Target what matters, grade automatically, and give children more time back.",
  primary:"Start calculation practice",competition:"Math competitions →",login:"Sign in",register:"Parent registration",
  loop:"Why fewer, better-targeted questions?",
  s1:"Where am I now?",s1d:"Build a baseline from grade, accuracy, speed and performance by skill.",
  s2:"Why did I miss it?",s2d:"Separate knowledge gaps, calculation errors, weak strategy and fluency issues.",
  s3:"What should I do next?",s3d:"Move into targeted fluency, error review or competition practice based on evidence.",
  s4:"Am I improving?",s4d:"Track accuracy, speed, error patterns and exam performance over time.",
  modes:"Start with calculation confidence",
  calc:"Only the calculations that matter next",calcDesc:"From primary arithmetic through high-school algebra: focus on accuracy, fluency and strategy, and stop the round when enough evidence is collected.",calcCta:"Open calculation training",
  comp:"Math competitions · next challenge",compDesc:"Math Kangaroo, Australian AMC, MAA AMC and CEMC, ready when learners want a challenge beyond foundational fluency.",compCta:"Open competition center",
  profile:"More than a one-time score",profileDesc:"Accuracy, speed, errors, practice history and mock-exam performance build one long-term learner record.",profileCta:"View my learning report",
 },
} as const;

export default function PublicHome(){
 const lang=useSiteLanguage(),ui=UI[lang];
 const steps=[[ui.s1,ui.s1d],[ui.s2,ui.s2d],[ui.s3,ui.s3d],[ui.s4,ui.s4d]];
 return <div className="home-shell public-home">
  <section className="hero-card home-hero">
   <div className="eyebrow">{ui.eye}</div>
   <h1>{ui.title1}<br/><span>{ui.title2}</span></h1>
   <p className="hero-copy">{ui.copy}</p>
   <div className="hero-actions">
    <Link className="primary-button" href="/arithmetic">{ui.primary}</Link>

   </div>
   <div className="home-auth-links" style={{gap:12,flexWrap:"wrap"}}>
    <Link href="/login">{ui.login}</Link><span>·</span><Link href="/parent/register">{ui.register}</Link><span>·</span><Link href="/competitions">{ui.competition}</Link>
   </div>
   <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:16,fontSize:13,color:"var(--muted, #64748b)"}}><span>✓ {lang==="zh"?"少刷无效题":"Less busywork"}</span><span>✓ {lang==="zh"?"针对真正卡点":"Find real gaps"}</span><span>✓ {lang==="zh"?"自动批改与跟进":"Automatic feedback"}</span></div>
  </section>

  <details className="home-loop" aria-label={ui.loop}>
   <summary style={{cursor:"pointer",fontWeight:700,fontSize:18}}>{ui.loop}</summary>
   <div className="home-step-grid">{steps.map(([title,desc],i)=><article key={title}><div className="feature-index">0{i+1}</div><h2>{title}</h2><p>{desc}</p></article>)}</div>
  </details>

  <section className="home-modes">
   <div className="section-heading"><div><span className="eyebrow">PRACTICE</span><h1>{ui.modes}</h1></div></div>
   <div className="home-mode-grid" style={{gridTemplateColumns:"minmax(0,1fr)"}}>
    <article><div className="feature-index">CORE · G1–G12</div><h2>{ui.calc}</h2><p>{ui.calcDesc}</p><Link className="primary-button" href="/arithmetic">{ui.calcCta}</Link></article>

   </div>
  </section>

  <section className="home-profile"><div style={{width:"100%"}}><span className="eyebrow">COMPETITION</span><h2>{ui.comp}</h2><p>{ui.compDesc}</p><Link href="/competitions">{ui.compCta} →</Link></div></section>

  <section className="home-profile">
   <div><span className="eyebrow">LEARNER PROFILE</span><h2>{ui.profile}</h2><p>{ui.profileDesc}</p></div>
   <Link className="secondary-button" href="/student">{ui.profileCta}</Link>
  </section>
 </div>;
}
