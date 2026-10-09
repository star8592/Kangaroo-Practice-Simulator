"use client";

import Link from "next/link";
import { WORLD_COMPETITIONS, worldRegionName } from "@/lib/world-competitions";
import { useSiteLanguage } from "@/lib/site-language";

const UI={
 zh:{
  eye:"SOC THINK · K12 数学成长系统",
  title1:"先知道孩子卡在哪里，",title2:"再决定下一步练什么",
  copy:"面向 G1–G12 的数学能力诊断、计算训练与全球数学赛事服务平台。用训练数据发现薄弱点，把下一步练习从“凭感觉刷题”变成有依据的学习路径。",
  primary:"开始能力诊断",competition:"探索全球数学赛事",login:"学生登录",register:"家长登录 / 注册 · 微信扫码",
  loop:"一次训练，应该回答四个问题",
  s1:"现在在哪里",s1d:"从年级、正确率、速度和题型表现建立当前能力基线。",
  s2:"为什么会错",s2d:"区分知识缺口、计算失误、策略不足和速度问题，而不是只记录对错。",
  s3:"下一步练什么",s3d:"根据薄弱点进入针对性计算训练、错题复盘或竞赛题型训练。",
  s4:"有没有进步",s4d:"持续记录正确率、速度、错因和考试表现，让家长和学生看到变化。",
  modes:"两种训练场景，一份长期学习画像",
  calc:"计算与基础能力",calcDesc:"覆盖 G1–G12，从基础运算延伸到代数、函数、概率与统计。支持诊断、自适应训练、限时训练和巧算策略。",calcCta:"进入计算训练",
  comp:"全球数学赛事管家",compDesc:"中国、美国、澳洲、加拿大、英国和全球性数学赛事使用同一套赛事管理体系；赛制训练按真实题库分别呈现。",compCta:"查看全球赛事",
  profile:"学习结果不是一次分数",profileDesc:"训练记录、速度、正确率、错因与考试表现汇入长期档案。登录后可继续上次进度并查看个人学习报告。",profileCta:"查看我的学习报告",
 },
 en:{
  eye:"SOC THINK · K12 MATH GROWTH",
  title1:"Find where learning gets stuck.",title2:"Then know exactly what to practice next.",
  copy:"A G1–G12 math diagnostic, fluency and competition practice platform. Turn practice data into clear weak-skill signals and an evidence-based next step.",
  primary:"Start a diagnostic",competition:"Explore competitions",login:"Student login",register:"Parent login / register · WeChat",
  loop:"Every practice session should answer four questions",
  s1:"Where am I now?",s1d:"Build a baseline from grade, accuracy, speed and performance by skill.",
  s2:"Why did I miss it?",s2d:"Separate knowledge gaps, calculation errors, weak strategy and fluency issues.",
  s3:"What should I do next?",s3d:"Move into targeted fluency, error review or competition practice based on evidence.",
  s4:"Am I improving?",s4d:"Track accuracy, speed, error patterns and exam performance over time.",
  modes:"Two practice modes. One long-term learner profile.",
  calc:"Fluency & core skills",calcDesc:"G1–G12 practice from arithmetic through algebra, functions, probability and statistics, with diagnostics and adaptive practice.",calcCta:"Open calculation training",
  comp:"World Math Competition Companion",compDesc:"Mathematics events from China and worldwide share one event directory, preparation journey and progress management system.",compCta:"Open competition center",
  profile:"More than a one-time score",profileDesc:"Accuracy, speed, errors, practice history and mock-exam performance build one long-term learner record.",profileCta:"View my learning report",
 },
} as const;

export default function PublicHome(){
 const lang=useSiteLanguage(),ui=UI[lang];
 const steps=[[ui.s1,ui.s1d],[ui.s2,ui.s2d],[ui.s3,ui.s3d],[ui.s4,ui.s4d]];
 const competitions=WORLD_COMPETITIONS;

 return <div className="home-shell public-home">
  <section className="hero-card home-hero">
   <div className="eyebrow">{ui.eye}</div>
   <h1>{ui.title1}<br/><span>{ui.title2}</span></h1>
   <p className="hero-copy">{ui.copy}</p>
   <div className="hero-actions">
    <Link className="primary-button" href="/arithmetic">{ui.primary}</Link>
    <Link className="secondary-button" href="/competitions">{ui.competition}</Link>
   </div>
   <div className="home-auth-links">
    <Link className="home-parent-entry" href="/parent/login">{ui.register}</Link>
    <Link className="home-student-entry" href="/login">{ui.login}</Link>
   </div>
  </section>

  <section className="home-loop" aria-label={ui.loop}>
   <div className="section-heading"><div><span className="eyebrow">DIAGNOSE → PRACTICE → REVIEW → GROW</span><h1>{ui.loop}</h1></div></div>
   <div className="home-step-grid">{steps.map(([title,desc],i)=><article key={title}><div className="feature-index">0{i+1}</div><h2>{title}</h2><p>{desc}</p></article>)}</div>
  </section>

  <section className="home-competition-showcase">
   <div className="section-heading"><div><span className="eyebrow">COMPETITION HUB</span><h1>{lang==="zh"?"全球数学赛事，一站式管理":"One worldwide companion for math competitions"}</h1><p>{lang==="zh"?"中国与世界其他地区的数学赛事平等呈现；从赛事介绍到备赛、参赛和成绩归档，统一管理。":"Each competition is organized from discovery and past papers through mocks and exam-day preparation."}</p></div></div>
   <div className="home-competition-grid">{competitions.map(c=> <Link key={c.id} className="home-competition-card" href={"/competitions?event="+encodeURIComponent(c.id)}><div className="competition-brand"><div className="competition-brand-wordmark"><b>{worldRegionName(c.region,lang)}</b><span>WORLD MATH</span></div></div><strong>{lang==="zh"?c.nameZh:c.nameEn}</strong><span>{lang==="zh"?c.summaryZh:c.summaryEn}</span><em>{lang==="zh"?"查看赛事管家 →":"Open companion →"}</em></Link>)}</div>
  </section>

  <section className="home-modes">
   <div className="section-heading"><div><span className="eyebrow">PRACTICE</span><h1>{ui.modes}</h1></div></div>
   <div className="home-mode-grid">
    <article><div className="feature-index">CORE · G1–G12</div><h2>{ui.calc}</h2><p>{ui.calcDesc}</p><Link className="primary-button" href="/arithmetic">{ui.calcCta}</Link></article>
    <article><div className="feature-index">COMPETITION</div><h2>{ui.comp}</h2><p>{ui.compDesc}</p><Link className="secondary-button" href="/competitions">{ui.compCta}</Link></article>
   </div>
  </section>

  <section className="home-profile">
   <div><span className="eyebrow">LEARNER PROFILE</span><h2>{ui.profile}</h2><p>{ui.profileDesc}</p></div>
   <Link className="secondary-button" href="/student">{ui.profileCta}</Link>
  </section>
 </div>;
}
