"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import type {CareerPracticeAnswers,CareerPracticeCase,CareerPracticeQuestion} from "@/lib/career-practice";
import type {CareerPracticeGrade} from "@/lib/career-practice-grade";
import styles from "@/app/career/practice/career-practice.module.css";

type Answers=Record<string,string|string[]>;
function answered(q:CareerPracticeQuestion,answer:Answers){
  const value=answer[q.id];
  return q.kind==="multiple"?
    Array.isArray(value)&&value.length>0:
    typeof value==="string"&&value.trim().length>0;
}

export default function CareerPracticeRunner({practice}:{practice:CareerPracticeCase}){
  const [answers,setAnswers]=useState<Answers>({});
  const [current,setCurrent]=useState(0);
  const [grade,setGrade]=useState<CareerPracticeGrade|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [hydrated,setHydrated]=useState(false);
  const storageKey="socthink:career:free:"+practice.id+":v"+practice.revision;

  useEffect(()=>{
    try {
      const saved=window.localStorage.getItem(storageKey);
      if(saved){
        const parsed:unknown=JSON.parse(saved);
        if(parsed&&typeof parsed==="object"&&!Array.isArray(parsed)){
          const candidate=parsed as Record<string,unknown>;
          const restored:Answers={};
          for(const q of practice.questions){
            const v=candidate[q.id];
            if(q.kind==="multiple"){
              if(Array.isArray(v)&&v.every(x=>typeof x==="string"&&q.options?.some(o=>o.id===x)))
                restored[q.id]=v;
            }else if(typeof v==="string"&&v.length<=40){
              restored[q.id]=v;
            }
          }
          setAnswers(restored);
        }
      }
    }catch{/* User may disable storage: practice still works. */}
    setHydrated(true);
  },[practice.questions,storageKey]);
  useEffect(()=>{
    if(!hydrated)return;
    try{window.localStorage.setItem(storageKey,JSON.stringify(answers));}
    catch{/* In private mode we retain only the current browser session. */}
  },[answers,hydrated,storageKey]);

  const question=practice.questions[current];
  const progress=practice.questions.filter(q=>answered(q,answers)).length;
  const setSingle=(id:string,value:string)=>{setError("");setAnswers(prev=>({...prev,[id]:value}));};
  const toggleMultiple=(id:string,value:string,checked:boolean)=>{
    setError("");
    setAnswers(prev=>{
      const old=Array.isArray(prev[id])?prev[id] as string[]:[];
      return {...prev,[id]:checked?[...new Set([...old,value])]:old.filter(x=>x!==value)};
    });
  };
  async function submit(){
    if(loading)return;
    setLoading(true);setError("");
    try{
      const response=await fetch("/api/career/practice/"+encodeURIComponent(practice.id)+"/grade",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({answers:answers as CareerPracticeAnswers}),
        cache:"no-store",
      });
      const payload=await response.json() as {grade?:CareerPracticeGrade;error?:string};
      if(!response.ok||!payload.grade)throw Error(payload.error||"评分失败，请稍后重试。");
      setGrade(payload.grade);
    }catch(e){setError(e instanceof Error?e.message:"网络异常，请重试提交。");}
    finally{setLoading(false);}
  }
  function reset(){
    setGrade(null);setAnswers({});setCurrent(0);setError("");
    try{window.localStorage.removeItem(storageKey);}catch{/* Ignore denied storage. */}
  }

  return <div className={styles.runner}>
    {!grade?<>
      <section className={styles.workspace}>
        <div className={styles.sectionHead}>
          <div><span className={styles.overline}>采购决策工作台 / PROCUREMENT CASE</span>
            <h2>业务背景与供应商报价</h2></div>
          <span className={styles.counter}>原创免费试练 · {practice.durationMinutes}分钟参考</span>
        </div>
        <p className={styles.context}>{practice.context}</p>
        <div className={styles.tableScroll}>
          <table className={styles.supplierTable}>
            <thead><tr><th>供应商</th><th>货价/件</th><th>运费/件</th><th>不良率</th><th>交期</th><th>最多订货</th></tr></thead>
            <tbody>{practice.suppliers.map(s=><tr key={s.id}>
              <th scope="row">{s.name} {s.id}</th><td>{s.unitPrice}元</td>
              <td>{s.freightPerUnit}元</td><td>{s.defectPercent}%</td><td>{s.leadDays}天</td>
              <td>{s.maxUnits}件</td>
            </tr>)}</tbody>
          </table>
        </div>
        <details className={styles.assumptions}>
          <summary>查看计算口径与案例约束</summary>
          <ul>{practice.assumptions.map(x=><li key={x}>{x}</li>)}</ul>
        </details>
      </section>

      <section className={styles.questionCard} aria-label="在线职业实操">
        <div className={styles.progressInfo}><span>第 {current+1} / {practice.questions.length} 题</span>
          <span>已作答 {progress} / {practice.questions.length} 题</span></div>
        <div className={styles.progressBar}><span style={{width:(progress/practice.questions.length*100)+"%"}}/></div>
        <div className={styles.questionHead}>
          <span className={styles.skill}>{question.skill}</span>
          <span className={styles.weight}>{question.weight} 分</span>
        </div>
        <h2>{question.prompt}</h2>
        {question.kind==="integer"?
          <label className={styles.numericLabel}>你的答案
            <input type="text" inputMode="numeric" maxLength={40}
              placeholder={question.placeholder??"请输入数字"}
              aria-label={question.prompt}
              value={typeof answers[question.id]==="string"?(answers[question.id] as string):""}
              onChange={e=>setSingle(question.id,e.target.value)}/>
          </label>:
          <fieldset className={styles.choiceField}>
            <legend className={styles.choiceLegend}>{question.kind==="multiple"?"可多选":"请选择一项"}</legend>
            <div className={styles.choices}>{question.options?.map(option=>{
              const selected=question.kind==="multiple"?
                (Array.isArray(answers[question.id])&&(answers[question.id] as string[]).includes(option.id)):
                answers[question.id]===option.id;
              return <label className={selected?styles.choiceSelected:styles.choice} key={option.id}>
                <input type={question.kind==="multiple"?"checkbox":"radio"}
                  name={question.id} checked={selected}
                  onChange={e=>question.kind==="multiple"?
                    toggleMultiple(question.id,option.id,e.target.checked):
                    setSingle(question.id,option.id)}/>
                <span>{option.label}</span>
              </label>;
            })}</div>
          </fieldset>}
        {question.hint&&<p className={styles.hint}>提示：{question.hint}</p>}
        <div className={styles.stepNav}>
          <button type="button" className={styles.secondary}
            onClick={()=>setCurrent(n=>Math.max(0,n-1))} disabled={current===0}>上一题</button>
          <button type="button" className={styles.secondary}
            onClick={()=>setCurrent(n=>Math.min(practice.questions.length-1,n+1))}
            disabled={current===practice.questions.length-1}>下一题</button>
        </div>
        <div className={styles.submitRow}>
          <p>允许留空提交，未答题计 0 分。答卷仅保留在本浏览器，不同步到微信账号。</p>
          <button type="button" className={styles.primary} onClick={submit} disabled={loading||!hydrated}>
            {loading?"评分中…":"提交答卷并查看报告"}
          </button>
        </div>
        {error&&<p role="alert" className={styles.error}>{error}</p>}
      </section>
    </>:
    <section className={styles.report} aria-label="采购案例成绩报告">
      <div className={styles.overline}>SOCTHINK / ORIGINAL CAREER ASSESSMENT</div>
      <h2>你的采购决策训练报告</h2>
      <div className={styles.scoreRow}><strong>{grade.score}<small> / {grade.maxPoints} 分</small></strong>
        <div><span>本次已回答 {grade.completed}/{grade.totalQuestions} 题</span>
          <p>确定性计算与决策判分 · 规则版本 {grade.revision}</p></div>
      </div>
      <div className={styles.feedback}>
        {grade.items.map((item,i)=><article className={styles.feedbackItem} key={item.questionId}>
          <div className={styles.feedbackTitle}>
            <strong>{i+1}. {item.skill}</strong>
            <span className={item.correct?styles.pass:styles.fail}>
              {item.correct?"答对":"需复练"} · {item.earned}/{item.maxPoints} 分
            </span>
          </div>
          <p><strong>参考答案：</strong>{item.expected}</p>
          <p>{item.explanation}</p>
        </article>)}
      </div>
      <div className={styles.advice}><h3>下一步怎么练</h3>
        <ul>{grade.advice.map((text,i)=><li key={i}>{text}</li>)}</ul>
      </div>
      <p className={styles.note}>本报告衡量的是这一套原创采购案例中的表现，不等于企业真实笔试成绩、职业资质或录用预测。数据按题目给出的简化假设计算。</p>
      <div className={styles.reportActions}>
        <button type="button" className={styles.primary} onClick={reset}>重新挑战本案例</button>
        <Link href="/career">返回职业岗位目录</Link>
      </div>
    </section>}
  </div>;
}
