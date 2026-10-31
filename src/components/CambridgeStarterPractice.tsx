"use client";
import {useState} from "react";
import {CAMBRIDGE_STARTER_QUESTIONS} from "@/lib/cambridge-starter-questions";
import type {CambridgeLevel} from "@/lib/cambridge-ket-pet";
import styles from "@/app/english/ket-pet/cambridge.module.css";

export default function CambridgeStarterPractice(){
  const [level,setLevel]=useState<CambridgeLevel>("ket");
  const [answers,setAnswers]=useState<Record<string,number>>({});
  const [submitted,setSubmitted]=useState(false);
  const questions=CAMBRIDGE_STARTER_QUESTIONS.filter(q=>q.exam===level);
  const answered=questions.filter(q=>answers[q.id]!==undefined).length;
  const correct=questions.filter(q=>answers[q.id]===q.answerIndex).length;
  const choose=(id:string,index:number)=>{
    if(submitted)return;
    setAnswers(prev=>({...prev,[id]:index}));
  };
  const switchLevel=(next:CambridgeLevel)=>{
    if(next===level)return;
    setLevel(next);setAnswers({});setSubmitted(false);
  };
  return (
    <section className={styles.practice} aria-label="KET PET 原创阅读练习">
      <div className={styles.practiceIntro}>
        <div>
          <p className={styles.kicker}>FREE · ORIGINAL PRACTICE</p>
          <h2>先体验阅读题型，再进入系统备考</h2>
          <p>目前开放8道原创阅读短练习，按KET/PET分组。仅用于测试交互与基础阅读能力；不是剑桥官方试卷、全真模拟或正式成绩。</p>
        </div>
        <div className={styles.switcher} role="group" aria-label="选择英语等级">
          <button type="button" aria-pressed={level==="ket"} className={level==="ket"?styles.activeTab:styles.tab} onClick={()=>switchLevel("ket")}>KET · A2</button>
          <button type="button" aria-pressed={level==="pet"} className={level==="pet"?styles.activeTab:styles.tab} onClick={()=>switchLevel("pet")}>PET · B1</button>
        </div>
      </div>
      <div className={styles.progressRow}>
        <span>已完成 {answered}/{questions.length} 道</span>
        <span>{submitted?"本轮已提交":"可更改答案，完成后统一提交"}</span>
      </div>
      <div className={styles.progressTrack}><div style={{width:Math.round(answered/questions.length*100)+"%"}}/></div>
      <div className={styles.questions}>
        {questions.map((q,i)=>(
          <section className={styles.question} key={q.id} aria-labelledby={"question-"+q.id}>
            <div className={styles.qHeader}><span className={styles.qIndex}>Q{i+1}</span><span className={styles.partLabel}>Reading · Part {q.paperPart}</span></div>
            {q.notice&&<blockquote className={styles.notice}>{q.notice}</blockquote>}
            <h3 id={"question-"+q.id}>{q.prompt}</h3>
            <div className={styles.options} role="group" aria-label={"第"+(i+1)+"题选项"}>
              {q.options.map((option,index)=>{
                const selected=answers[q.id]===index;
                const reveal=submitted&&index===q.answerIndex;
                const wrong=submitted&&selected&&index!==q.answerIndex;
                return <button key={index} type="button" disabled={submitted}
                  className={[styles.option, selected?styles.selected:"", reveal?styles.correct:"",wrong?styles.wrong:""].join(" ")}
                  aria-pressed={selected} onClick={()=>choose(q.id,index)}>
                    <span>{String.fromCharCode(65+index)}.</span> {option}
                  </button>;
              })}
            </div>
            {submitted&&<p className={styles.explanation}>解析：{q.explanationZh}</p>}
          </section>
        ))}
      </div>
      <div className={styles.practiceFooter}>
        <p>答题结果只在当前页面显示，不计入正式考试成绩。</p>
        <div className={styles.footerActions}>
          {submitted&&<strong role="status">正确 {correct}/{questions.length}</strong>}
          <button type="button" className={styles.reset} onClick={()=>{setAnswers({});setSubmitted(false);}}>重新练习</button>
          <button type="button" className={styles.submit} disabled={submitted||answered!==questions.length} onClick={()=>setSubmitted(true)}>
            {submitted?"已完成":"交卷并查看解析"}
          </button>
        </div>
      </div>
    </section>
  );
}
