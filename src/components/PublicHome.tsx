"use client";

import Link from "next/link";
import { useSiteLanguage } from "@/lib/site-language";

const UI={
 zh:{
  eye:"K12 数学能力训练",title1:"先看见价值，",title2:"再开始训练",copy:"面向 G1–G12 的计算能力训练与数学竞赛实战平台。首页公开浏览；只有在真正开始训练、考试或查看个人学习数据时才需要登录。",
  calc:"计算训练",calcDesc:"从基础运算到代数、函数、概率与统计，覆盖 G1–G12。支持诊断、自适应训练、限时训练、巧算策略与学习画像。",calcCta:"进入计算训练",
  comp:"竞赛实战",compDesc:"袋鼠数学、澳洲 AMC、美国 AMC、CEMC 等赛制与试卷集中浏览。可以先了解竞赛，再在开始答题时登录。",compCta:"浏览竞赛中心",
  profile:"长期学习画像",profileDesc:"训练记录、速度、正确率、错因与考试表现进入同一份长期档案，帮助学生和家长看到真实进步。",profileCta:"查看我的学习报告",
  path:"学习路径",p1:"1. 选择年级与训练目标",p2:"2. 诊断计算基础与薄弱点",p3:"3. 自适应训练与错题回炉",p4:"4. 用竞赛实战检验迁移能力",
  login:"已有账号，直接登录",register:"家长注册",
 },
 en:{
  eye:"K12 MATH SKILLS",title1:"See the value first,",title2:"then start training",copy:"A G1–G12 calculation and math competition practice platform. Public pages are open to browse; sign-in is required only when starting training, an exam, or viewing personal learning data.",
  calc:"Calculation training",calcDesc:"From arithmetic to algebra, functions, probability and statistics across G1–G12, with diagnostics, adaptive practice, timed work, strategy training and learner profiles.",calcCta:"Open calculation training",
  comp:"Competition practice",compDesc:"Browse Math Kangaroo, Australian AMC, MAA AMC, CEMC and more before signing in to actually start a paper.",compCta:"Browse competitions",
  profile:"Long-term learner profile",profileDesc:"Accuracy, speed, errors, practice history and mock-exam performance feed one long-term learner record.",profileCta:"View my report",
  path:"Learning path",p1:"1. Choose grade and goal",p2:"2. Diagnose fluency and weak skills",p3:"3. Adaptive practice and error review",p4:"4. Validate transfer with competition problems",
  login:"Sign in",register:"Parent registration",
 },
} as const;

export default function PublicHome(){
 const lang=useSiteLanguage(),ui=UI[lang];
 return <div className="home-shell">
  <section className="hero-card">
   <div className="eyebrow">{ui.eye}</div>
   <h1>{ui.title1}<br/><span>{ui.title2}</span></h1>
   <p className="hero-copy">{ui.copy}</p>
   <div className="hero-actions">
    <Link className="primary-button" href="/arithmetic">{ui.calcCta}</Link>
    <Link className="secondary-button" href="/competitions">{ui.compCta}</Link>
   </div>
  </section>

  <section className="feature-grid" aria-label={ui.path}>
   <article><div className="feature-index">01 · G1–G12</div><h2>{ui.calc}</h2><p>{ui.calcDesc}</p><Link className="primary-button" href="/arithmetic">{ui.calcCta}</Link></article>
   <article><div className="feature-index">02 · PRACTICE</div><h2>{ui.comp}</h2><p>{ui.compDesc}</p><Link className="secondary-button" href="/competitions">{ui.compCta}</Link></article>
   <article><div className="feature-index">03 · PROFILE</div><h2>{ui.profile}</h2><p>{ui.profileDesc}</p><Link className="secondary-button" href="/student">{ui.profileCta}</Link></article>
  </section>

  <section className="section-heading" style={{marginTop:72}}><div><span className="eyebrow">{ui.path}</span><h1>{ui.path}</h1><p>{ui.p1} · {ui.p2} · {ui.p3} · {ui.p4}</p></div></section>
  <div className="hero-actions">
   <Link className="secondary-button" href="/login">{ui.login}</Link>
   <Link className="secondary-button" href="/parent/register">{ui.register}</Link>
  </div>
 </div>;
}
