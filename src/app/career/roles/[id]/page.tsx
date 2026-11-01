import Link from "next/link";
import {notFound} from "next/navigation";
import {CAREER_ROLES,getCareerRole} from "@/lib/career-role-taxonomy";
import {getCareerGuide} from "@/lib/career-original-guides";
import {getCareerPractice} from "@/lib/career-practice";
import styles from "../../career-commerce.module.css";

type Context={params:Promise<{id:string}>};
const EXACT_PRODUCTS:Readonly<Record<string,{guideId:string;practiceId:string;formalPaperId:string}>>={
  "采购与寻源":{guideId:"supplier-decision-handbook",practiceId:"supplier-selection-001",formalPaperId:"procurement-paper-2026q4-v1"},
  "电商与零售运营":{guideId:"retail-campaign-roi-handbook",practiceId:"campaign-performance-001",formalPaperId:"operations-paper-2026q4-v1"},
  "工业质量与可靠性":{guideId:"manufacturing-fmea-handbook",practiceId:"manufacturing-quality-001",formalPaperId:"quality-paper-2026q4-v1"},
};
export async function generateMetadata({params}:Context){
  const {id}=await params;const role=getCareerRole(id);
  return {title:role?role.title+" · 岗位资料与训练｜SOCTHINK":"岗位未找到｜SOCTHINK",
    description:role?"查看"+role.title+"在职业目录中的归类和已经开放的原创职业教程及考试训练。未证实职位不会标成在招。":undefined,
    robots:role&&EXACT_PRODUCTS[role.segment]?{index:true,follow:true}:{index:false,follow:true},
    alternates:{canonical:"/career/roles/"+id}};
}
export default async function CareerRolePage({params}:Context){
  const {id}=await params;const role=getCareerRole(id);
  if(!role)notFound();
  const pairing=EXACT_PRODUCTS[role.segment];
  const guide=pairing?getCareerGuide(pairing.guideId):undefined;
  const practice=pairing?getCareerPractice(pairing.practiceId):undefined;
  const similar=CAREER_ROLES.filter(x=>x.id!==role.id&&x.segment===role.segment).slice(0,9);
  return <main className={styles.roleDetail}>
    <nav className={styles.roleBreadcrumb} aria-label="当前位置">
      <Link href="/career">职业资料与考试中心</Link><span>/</span>
      <Link href="/career#career-directory">{role.groupTitle}</Link><span>/</span>{role.title}
    </nav>
    <div className={styles.roleDetailHero}>
      <p>岗位分类 / {role.groupTitle} / {role.segment}</p>
      <h1>{role.title}</h1>
      <p>先了解这类岗位的训练方向，再选择本站实际已经开放的课程资料或在线考试。岗位名称出现在目录，不等于招聘企业目前有空缺。</p>
      <div className={styles.roleDetailActions}>
        <Link href="/career#digital-materials">找复习教程</Link>
        <Link href="/career#digital-services">查看在线模拟考试</Link>
      </div>
    </div>
    <section className={styles.roleDetailProducts}>
      <h2>与这个岗位有关的学习产品</h2>
      {guide&&practice&&practice.deliveryState==="free-live-preview"?<div className={styles.roleDetailGrid}>
        <article>
          <span>数字商品 · 完整原创教程</span>
          <h3>{guide.title}</h3>
          <p>{guide.summary}</p>
          <Link href={"/career/guides/"+guide.id}>免费阅读并下载</Link>
        </article>
        <article>
          <span>数字服务 · 在线考试</span>
          <h3>{practice.title}</h3>
          <p>标准岗位模拟笔试：24道原创客观题、45分钟计时、入场确认、答题卡、交卷检查和逐题成绩。另有6题热身练习。</p>
          <Link href={"/career/exams/"+pairing.formalPaperId}>进入45分钟标准笔试</Link>
          <Link href={"/career/practice/"+practice.id}>免费进入模拟考试 · 6题热身</Link>
        </article>
      </div>:<div className={styles.roleNoProduct}>
        <h3>这个具体岗位的专项资料尚未上线</h3>
        <p>当前只有岗位分类信息，尚无完成内容与质量验收的专属教程或考试。不会因为名字在目录里就凭空添加价格、真题、岗位热度或购买链接。</p>
        <Link href="/career#digital-materials">查看已完成的全部教程</Link>
        <Link href="/career#digital-services">查看已开放的全部考试</Link>
      </div>}
    </section>
    <section className={styles.relatedRoles}>
      <h2>同一细分领域的其他岗位</h2>
      <div>{similar.map(x=><Link key={x.id} href={"/career/roles/"+x.id}>{x.title}</Link>)}</div>
    </section>
  </main>;
}
