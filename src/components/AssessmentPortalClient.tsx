"use client";

import Link from "next/link";
import ExamDirectory from "@/components/ExamDirectory";
import {useSiteLanguage} from "@/lib/site-language";
import styles from "@/app/assessments/assessments.module.css";

const COPY={
  zh:{
    eyebrow:"SOCTHINK / 全考试平台",
    title:"全部考试与训练",
    description:"",
    resources:"检索现有试卷",math:"立即开始数学训练",competitions:"国际数学竞赛",measurement:"人格与职业兴趣测评",skills:"岗位技能实训",career:"企业岗位需求",
    loop:"一套完整的学习与考试路径",
    steps:["寻找考试或资料","免费体验与在线作答","真实评分与试卷解析","针对性复测及成长记录"],
    note:"一个微信账号即可使用本站已有服务。练习完整性不等于内容可销售；版权、商户授权和交易权益须经过真实验证，未验收的商品不会开放付款。",
  },
  en:{
    eyebrow:"SOCTHINK / ALL EXAMS",
    title:"Exams, papers, resources and practice",
    description:"Browse school, university, language, career and professional exams in one structured directory. Live exams open immediately; other topics clearly show that content is being prepared.",
    resources:"Search available papers",math:"Start math practice",competitions:"Math competitions",measurement:"Personality & interests",skills:"Hands-on skill labs",career:"Employer demand",
    loop:"One consistent assessment journey",
    steps:["Find an exam or resource","Try practice and sit an exam","Review verified scoring evidence","Retest and track progress"],
    note:"One WeChat account is the target login experience. A training-ready paper is not automatically licensed for resale, and unfinished services are never presented as payable products.",
  }
} as const;

export default function AssessmentPortalClient({initialQuery=""}:{initialQuery?:string}){
  const lang=useSiteLanguage(),ui=COPY[lang];
  return <div>
    <div data-site-shell="content" className={styles.shell}>
      <section className={styles.hero}>
        <h1>{ui.title}</h1>

        <div className={styles.heroActions}>
          <Link className={styles.primary} href="/resources">{ui.resources}</Link>
          <Link className={styles.secondary} href="/arithmetic">{ui.math}</Link>
          <Link className={styles.secondary} href="/competitions">{ui.competitions}</Link>
          <Link className={styles.secondary} href="/assessment-center">{ui.measurement}</Link>
          <Link className={styles.secondary} href="/skill-labs">{ui.skills}</Link>
          <Link className={styles.secondary} href="/career">{ui.career}</Link>
        </div>
      </section>
    </div>
    <ExamDirectory initialQuery={initialQuery}/>
  </div>;
}
