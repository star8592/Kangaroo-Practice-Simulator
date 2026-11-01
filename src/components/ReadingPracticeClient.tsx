"use client";
import {useState} from "react";
import {READING_PASSAGES,READING_QUESTIONS,READING_SKILLS,scoreReading} from "@/lib/reading-practice";
import styles from "@/app/assessment-center/measurement.module.css";

type Stage="intro"|"questions"|"report";
export default function ReadingPracticeClient(){
 const [stage,setStage]=useState<Stage>("intro");
 const [consent,setConsent]=useState(false);
 const [answers,setAnswers]=useState<Record<string,number>>({});
 const [index,setIndex]=useState(0);
 const item=READING_QUESTIONS[index];
 const passage=READING_PASSAGES.find(p=>p.id===item.passageId)!;
 const count=READING_QUESTIONS.filter(q=>answers[q.id]!==undefined).length;
 const report=stage==="report"?scoreReading(answers):null;
 const reset=()=>{setStage("intro");setConsent(false);setAnswers({});setIndex(0);};
 return <div className={styles.runner}>
  <header className={styles.runnerHeader}>
   <span className={styles.eyebrowDark}>SOCTHINK · READING & LEARNING LAB</span>
   <h1>阅读理解与证据判断 · 16题</h1>
   <p>读四篇原创短文，完成信息定位、合理推断、数量理解与证据判断。交卷后根据真实错题获得针对性练习建议。</p>
   <div className={styles.labels}><span>免费学习练习</span><span>4篇原创材料</span><span>16道题</span><span>非标准化能力测验</span></div>
  </header>
  {stage==="intro"&&<section className={styles.panel}>
   <h2>先了解本次练习</h2>
   <p className={styles.lead}>本练习是由 SOCTHINK 编写的阅读任务，不是心理量表，也不是与全国学生比较的标准化阅读水平检测。报告仅反映你对这16道题的实际完成情况。</p>
   <div className={styles.exploration}><h3>四个阅读动作</h3><ul>{READING_SKILLS.map(s=><li key={s.id}><strong>{s.name}</strong>：{s.interpretation}</li>)}</ul></div>
   <dl className={styles.details}>
    <div><dt>适用对象</dt><dd>建议小学五、六年级及以上的阅读练习者、成人；不是年级对标试卷。</dd></div>
    <div><dt>文章来源</dt><dd>SOCTHINK原创模拟材料，不采集真实学校成绩、个人档案或未授权教材内容。</dd></div>
    <div><dt>评分范围</dt><dd>四篇短文、每篇四题；每类阅读动作各四题。逐题正确数，附对应原文证据和解释；不提供 IQ、年级等级、常模百分位。</dd></div>
    <div><dt>隐私</dt><dd>你的选择只暂存在当前页面内存，未提交服务器，不进行后台画像；刷新或关闭后消失。</dd></div>
   </dl>
   <p className={styles.privacy}>未满14岁的孩子应由监护人同意使用。若没有监护人同意，请不要继续，也不需要填写姓名、年龄、成绩或其他个人资料。</p>
   <label className={styles.consent}><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>
    我已阅读说明；我是成年练习者，或我是同意未成年人进行本地练习的监护人。</label>
   <div className={styles.controls}><button type="button" className={styles.primaryButton} disabled={!consent} onClick={()=>setStage("questions")}>开始阅读与作答</button></div>
  </section>}
  {stage==="questions"&&<section className={styles.panel}>
   <div className={styles.progressRow}><strong>第 {index+1} / {READING_QUESTIONS.length} 题</strong><span>已完成 {count} / 16</span></div>
   <div className={styles.progress} role="progressbar" aria-label="已答题数" aria-valuemin={0} aria-valuemax={16} aria-valuenow={count}>
    <span style={{width:(count/16*100)+"%"}}/></div>
   <article className={styles.readingPassage}><h2>{passage.title}</h2><p>{passage.text}</p><div className={styles.readingSource}>{passage.source} · 此篇共4题</div></article>
   <p className={styles.prompt}>当前练习重点：{READING_SKILLS.find(s=>s.id===item.skill)?.name}</p>
   <fieldset className={styles.question}><legend>{item.stem}</legend>
    <div className={styles.choices}>{item.options.map((label,i)=><label key={i} className={answers[item.id]===i?styles.choiceActive:styles.choice}>
      <input type="radio" name={"reading-"+item.id} value={i} checked={answers[item.id]===i} onChange={()=>setAnswers(prev=>({...prev,[item.id]:i}))}/>
      <span className={styles.choiceNum}>{String.fromCharCode(65+i)}</span><span>{label}</span>
    </label>)}</div>
   </fieldset>
   <div className={styles.controls}>
     <button type="button" className={styles.secondaryButton} disabled={index===0} onClick={()=>setIndex(x=>x-1)}>上一题</button>
     {index<15?<button type="button" className={styles.primaryButton} disabled={answers[item.id]===undefined} onClick={()=>setIndex(x=>x+1)}>下一题</button>:
      <button type="button" className={styles.primaryButton} disabled={count!==16} onClick={()=>setStage("report")}>交卷并查看证据解析</button>}
   </div>
   <p className={styles.smallNote}>交卷之前可以返回修改答案。原文与题目在页面中对应展示，不强迫你记忆整篇文章。</p>
  </section>}
  {stage==="report"&&report&&<section className={styles.panel}>
   <div className={styles.reportTitle}><div><span className={styles.eyebrowDark}>ORIGINAL READING TASKS · {report.version}</span><h2>阅读任务复盘报告</h2></div><span className={styles.previewBadge}>原始答题结果</span></div>
   <p className={styles.lead}>本次16题答对 <strong>{report.correct} / {report.total}</strong>。分数只表示这套练习的实际答题情况，不代表年级能力等级或全国排名。</p>
   <div className={styles.scoreList}>{report.skills.map(s=><div key={s.id} className={styles.score}>
     <div className={styles.scoreTop}><strong>{s.name}</strong><span>{s.correct} <small>/ {s.total}</small></span></div>
     <div className={styles.scoreTrack}><span style={{width:(s.correct/s.total*100)+"%"}}/></div>
     <p>训练方法：{s.practice}</p>
   </div>)}</div>
   <div className={styles.exploration}><h3>建议优先练习的动作</h3>
     {report.nextPractice.length===0?<p>本套16题全部正确。你可以换一套未经见过的文章练习，避免把熟悉题目误认为稳定能力。</p>:
      <ol>{report.nextPractice.map((x,i)=><li key={i}>{x}</li>)}</ol>}
     <p>建议来自本套题的具体失分，不是人格画像、智商评估或学习障碍诊断。</p>
   </div>
   <div className={styles.readingReview}><h3>逐题证据与解析</h3>
    <ol className={styles.reviewList}>{report.items.map((r,i)=>{
      const q=READING_QUESTIONS.find(x=>x.id===r.id)!;
      return <li key={q.id} className={styles.reviewItem}>
       <strong>{r.correct?"正确":"需要复盘"} · 第 {i+1} 题 · {READING_SKILLS.find(s=>s.id===r.skill)?.name}</strong>
       <p>{q.stem}</p><p>你的选择：{q.options[r.chosen]}；正确答案：{q.options[r.answer]}</p>
       <blockquote className={styles.readingEvidence}>原文依据：“{r.evidence}”</blockquote>
       <p>{r.explanation}</p>
      </li>;
    })}</ol>
   </div>
   <div className={styles.reportFoot}><strong>结果边界</strong><p>来源：SOCTHINK原创短文及题目；版本：{report.version}。四个方向各只有4题，尚无年龄常模、项目统计、信效度或公平性研究。仅作为教育练习反馈，不应用于升学、招聘或心理/学习障碍诊断。</p></div>
   <div className={styles.controls}><button type="button" className={styles.secondaryButton} onClick={reset}>重新练习</button><button type="button" className={styles.primaryButton} onClick={()=>window.print()}>打印报告</button></div>
  </section>}
 </div>;
}
