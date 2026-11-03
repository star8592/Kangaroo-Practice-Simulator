import Link from "next/link";
import styles from "@/app/assessment-center/measurement.module.css";

/** Interim classroom entry. This is a separate *directory*, not yet a
 * separately deployed domain or database. Keep legacy student paths working.
 */
export const metadata={
 title:"数学课堂｜现有教学与数学竞赛｜SOC THINK",
 description:"数学课堂教学入口，保留现有口算、竞赛训练、错题复盘和学生记录。",
 robots:{index:false,follow:false},
};
const LINKS=[
 {name:"数学竞赛模拟",description:"袋鼠数学、AMC 及当前已有的赛制与试卷",href:"/competitions"},
 {name:"口算与计算训练",description:"计算训练与按年级练习",href:"/arithmetic"},
 {name:"错题复盘",description:"查看本人授权的历史错题与复练",href:"/review"},
 {name:"学习记录",description:"学生登录后查看自己的成绩和记录",href:"/student"},
] as const;
export default function ClassroomMath(){
 return <div className={styles.shell}>
  <header className={styles.hero}>
   <span className={styles.eyebrow}>CLASSROOM / MATHEMATICS</span>
   <h1>数学课堂</h1>
   <p>供现有教学使用。数学试卷、竞赛与学习记录继续按原有授权方式使用；此处是独立教学目录的过渡入口。</p>
  </header>
  <div className={styles.grid}>{LINKS.map(item=><article className={styles.tile} key={item.href}>
   <h2>{item.name}</h2><p>{item.description}</p>
   <Link className={styles.tileLink} href={item.href}>进入 <span aria-hidden="true">→</span></Link>
  </article>)}</div>
  <p>数学课堂未来将搬到独立服务。迁移前后必须核验题库、赛制、教师访问和现有学生成绩，不会仅靠更改地址替代完整验收。</p>
 </div>;
}
