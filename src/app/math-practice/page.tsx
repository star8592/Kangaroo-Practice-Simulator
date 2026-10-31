import type { Metadata } from "next";
import Link from "next/link";
import { GRADE_PROFILES, type ArithmeticGrade } from "@/lib/arithmetic";
import { ARITHMETIC_GRADE_GUIDE } from "@/lib/arithmetic-grade-guide";
import styles from "./math-practice.module.css";

export const metadata: Metadata = {
  title: "小学口算到高中数学计算训练｜1–12年级在线练习与诊断 | SOC THINK",
  description:
    "SOC THINK 数学计算训练覆盖小学一年级至高中三年级：20题能力诊断、口算与巧算、分数小数、正负数、代数式、函数等。按年级了解知识点并进入真实在线练习。",
  alternates: { canonical: "/math-practice" },
};

const STAGES = [
  {
    title: "小学计算：口算、巧算和分数小数",
    summary:
      "先从数感和基础事实提取入手，再学习拆分、补整、运算律，逐步过渡到分数、小数、百分数和比例。",
    grades: [1, 2, 3, 4, 5, 6] as const,
  },
  {
    title: "初中计算：从有理数进入代数",
    summary:
      "围绕正负数、代数式、方程、根式与函数代值等核心技能，重点辨别符号、括号、代入顺序及等价变形错误。",
    grades: [7, 8, 9] as const,
  },
  {
    title: "高中计算：函数、数列与综合运算",
    summary:
      "按现有训练模块练习函数代值、指数对数、三角计算、数列、概率统计等技能，重视计算过程的准确和稳定。",
    grades: [10, 11, 12] as const,
  },
] as const;

const METHODS = [
  {
    title: "先诊断，不盲目加题",
    description:
      "第一次可从20题基线诊断开始。用已经发生的答题表现判断哪些技能需要复练；样本不足时不应直接认定能力缺陷。",
  },
  {
    title: "针对薄弱点做短组练习",
    description:
      "可选择智能训练、引导训练、限时训练等现有模式。系统结合最近的正确率、作答时间和错误类型组织下一轮练习。",
  },
  {
    title: "复测并观察方法是否稳定",
    description:
      "除了计算结果，还观察是否理解运算结构、有没有反复修改，以及是否能把已经学会的方法用在相似题中。",
  },
] as const;

const breadcrumbs = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "首页", item: "https://socthink.cn/" },
    { "@type": "ListItem", position: 2, name: "数学计算训练", item: "https://socthink.cn/math-practice" },
  ],
};

function gradeName(grade: ArithmeticGrade) {
  return grade <= 6 ? `小学${["一", "二", "三", "四", "五", "六"][grade - 1]}年级` :
    grade <= 9 ? `初中${["一", "二", "三"][grade - 7]}年级（${["七", "八", "九"][grade - 7]}年级）` :
    `高中${["一", "二", "三"][grade - 10]}年级`;
}

export default function MathPracticeLanding() {
  return (
    <div data-site-shell="content" className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs).replace(/</g, "\\u003c") }}
      />

      <nav aria-label="面包屑" className={styles.crumbs}>
        <Link href="/">首页</Link><span aria-hidden="true">/</span>
        <span aria-current="page">数学计算训练</span>
      </nav>

      <header className={styles.hero}>
        <div className={styles.eyebrow}>SOC THINK / MATH PRACTICE · GRADES 1–12</div>
        <h1>从小学口算到高中计算，按年级找到该练的数学能力</h1>
        <p>
          不只是随机生成题目。SOC THINK 将 1–12 年级的计算知识点、
          巧算方法与练习诊断放在同一训练系统中。先查看本年级核心技能，
          再进入现有的在线训练，不必额外参加一次完整考试才能开始。
        </p>
        <div className={styles.actions}>
          <Link className={styles.primary} href="/arithmetic">立即开始数学计算训练</Link>
          <a className={styles.secondary} href="#grades">先查看各年级训练内容</a>
        </div>
        <p className={styles.accessNote}>
          首次进入训练系统会自动创建游客体验会话。基础练习可直接开始；
          长期记录和跨设备同步可能需要登录。训练入口与成绩权限仍由原有系统管理。
        </p>
      </header>

      <section aria-labelledby="method-heading" className={styles.section}>
        <div className={styles.sectionHead}>
          <span className={styles.sectionEyebrow}>HOW IT WORKS</span>
          <h2 id="method-heading">一次训练应该怎样开始？</h2>
          <p>
            有效的计算训练不仅看做对多少，还要辨别“不会做”“算得慢”
            和“没有识别简便计算结构”之间的区别。
          </p>
        </div>
        <div className={styles.methodGrid}>
          {METHODS.map((method, index) => (
            <article className={styles.methodCard} key={method.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{method.title}</h3>
              <p>{method.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="grades-heading" className={styles.section} id="grades">
        <div className={styles.sectionHead}>
          <span className={styles.sectionEyebrow}>GRADE-BY-GRADE GUIDE</span>
          <h2 id="grades-heading">小学、初中、高中：12 个年级的实际训练内容</h2>
          <p>
            以下教学主题直接来自当前训练系统的年级能力配置，
            并非尚未开放的课程预告。不同年级的题量、模块和训练模式以实际打开的页面为准。
          </p>
        </div>

        {STAGES.map((stage) => (
          <section key={stage.title} className={styles.stage} aria-label={stage.title}>
            <div className={styles.stageIntro}>
              <h3>{stage.title}</h3>
              <p>{stage.summary}</p>
            </div>
            <div className={styles.gradeGrid}>
              {stage.grades.map((grade) => {
                const key = grade as ArithmeticGrade;
                const profile = GRADE_PROFILES[key];
                const guide = ARITHMETIC_GRADE_GUIDE[key];
                return (
                  <article className={styles.gradeCard} key={grade}>
                    <div className={styles.gradeTop}>
                      <span>G{grade}</span>
                      <strong>{gradeName(key)}</strong>
                    </div>
                    <h4>{guide.headline}</h4>
                    <p>{guide.goal}</p>
                    <div className={styles.skillBlock}>
                      <span>当前训练技能</span>
                      <ul>
                        {profile.skills.map((skill) => <li key={skill.id}>{skill.labelZh}</li>)}
                      </ul>
                    </div>
                    <p className={styles.watch}><strong>易错观察：</strong>{guide.watch}</p>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </section>

      <section className={styles.steps} aria-labelledby="use-heading">
        <h2 id="use-heading">如何在 SOC THINK 上开始练习？</h2>
        <ol>
          <li>点击「立即开始数学计算训练」，进入原有训练系统。</li>
          <li>选择小学、初中或高中学段，再选择 G1–G12 对应年级。</li>
          <li>首次可选择 20 题诊断，也可直接进入当前年级的训练模式。</li>
          <li>完成练习后查看实际成绩与分析，再选择复测或专项训练。</li>
        </ol>
        <div className={styles.actions}>
          <Link className={styles.primary} href="/arithmetic">打开在线计算训练</Link>
          <Link className={styles.outline} href="/resources">查看数学竞赛训练卷</Link>
        </div>
        <p className={styles.note}>
          这里是 SOC THINK 自有训练工具的使用说明，不是教育主管部门的考试规则，
          也不表示与任何数学竞赛主办方存在合作或授权关系。
        </p>
      </section>
    </div>
  );
}
