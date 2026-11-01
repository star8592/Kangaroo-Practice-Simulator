"use client";

import Link from "next/link";
import {useEffect,useRef,useState,useSyncExternalStore} from "react";
import type {CareerPracticeAnswers,CareerPracticeCase,CareerPracticeQuestion} from "@/lib/career-practice";
import type {CareerPracticeGrade} from "@/lib/career-practice-grade";
import CareerPracticeHistory from "@/components/CareerPracticeHistory";
import styles from "@/app/career/practice/career-practice.module.css";

type Answers=Record<string,string|string[]>;
function answered(q:CareerPracticeQuestion,answer:Answers){
  const value=answer[q.id];
  return q.kind==="multiple"?
    Array.isArray(value)&&value.length>0:
    typeof value==="string"&&value.trim().length>0;
}

const noBrowserNotifications=()=>()=>{};
const browserReady=()=>true;
const serverNotReady=()=>false;

/** Read persisted local answers only on the client. SSR always renders blank
 * inputs, then hydration reveals the saved values without an effect-setState.
 */
function readBrowserDraft(storageKey:string,questions:readonly CareerPracticeQuestion[]):Answers{
  if(typeof window==="undefined")return {};
  try{
    const saved=window.localStorage.getItem(storageKey);
    if(!saved)return {};
    const parsed:unknown=JSON.parse(saved);
    if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))return {};
    const candidate=parsed as Record<string,unknown>;
    const restored:Answers={};
    for(const q of questions){
      const v=candidate[q.id];
      if(q.kind==="multiple"){
        if(Array.isArray(v)&&v.length<=q.options!.length&&
          v.every(x=>typeof x==="string"&&q.options?.some(o=>o.id===x))){
          restored[q.id]=[...new Set(v)];
        }
      }else if(typeof v==="string"&&v.length<=40&&
        (q.kind!=="single"||v===""||q.options?.some(o=>o.id===v))){
        restored[q.id]=v;
      }
    }
    return restored;
  }catch{return {};}
}

export default function CareerPracticeRunner({practice}:{practice:CareerPracticeCase}){
  const storageKey="socthink:career:free:"+practice.id+":v"+practice.revision;
  const hydrated=useSyncExternalStore(noBrowserNotifications,browserReady,serverNotReady);
  const [answers,setAnswers]=useState<Answers>(()=>
    readBrowserDraft(storageKey,practice.questions));
  const [current,setCurrent]=useState(0);
  const [grade,setGrade]=useState<CareerPracticeGrade|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [saveWarning,setSaveWarning]=useState("");
  const [historyRefresh,setHistoryRefresh]=useState(0);
  const attemptIdRef=useRef<string|null>(null);
  useEffect(()=>{
    if(!hydrated)return;
    try{window.localStorage.setItem(storageKey,JSON.stringify(answers));}
    catch{/* Storage can be disabled; grading still works. */}
  },[answers,hydrated,storageKey]);
  const visibleAnswers=hydrated?answers:{};

  const question=practice.questions[current];
  const progress=practice.questions.filter(q=>answered(q,visibleAnswers)).length;
  const setSingle=(id:string,value:string)=>{attemptIdRef.current=null;setError("");setAnswers(prev=>({...prev,[id]:value}));};
  const toggleMultiple=(id:string,value:string,checked:boolean)=>{
    attemptIdRef.current=null;setError("");
    setAnswers(prev=>{
      const old=Array.isArray(prev[id])?prev[id] as string[]:[];
      return {...prev,[id]:checked?[...new Set([...old,value])]:old.filter(x=>x!==value)};
    });
  };
  async function submit(){
    if(loading)return;
    setLoading(true);setError("");setSaveWarning("");
    if(!attemptIdRef.current)attemptIdRef.current=window.crypto?.randomUUID?.()??null;
    try{
      const response=await fetch("/api/career/practice/"+encodeURIComponent(practice.id)+"/grade",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({answers:answers as CareerPracticeAnswers,
          ...(attemptIdRef.current?{attemptId:attemptIdRef.current}:{})}),
        cache:"no-store",
      });
      const payload=await response.json() as {grade?:CareerPracticeGrade;error?:string;
        warning?:string;saveStatus?:"browser-only"|"saved"|"failed"};
      if(!response.ok||!payload.grade){
        if(response.status===409)attemptIdRef.current=null;
        throw Error(payload.error||"评分失败，请稍后重试。");
      }
      setGrade(payload.grade);
      setSaveWarning(payload.saveStatus==="failed"?(payload.warning||"账号成绩保存失败"):"");
      if(payload.saveStatus==="saved")setHistoryRefresh(n=>n+1);
    }catch(e){setError(e instanceof Error?e.message:"网络异常，请重试提交。");}
    finally{setLoading(false);}
  }
  function reset(){
    attemptIdRef.current=null;
    setGrade(null);setAnswers({});setCurrent(0);setError("");setSaveWarning("");
    try{window.localStorage.removeItem(storageKey);}catch{/* Ignore denied storage. */}
  }

  return <div className={styles.runner}>
    <CareerPracticeHistory caseId={practice.id} revision={practice.revision}
      refreshKey={historyRefresh} onOpen={record=>{setSaveWarning("");setGrade(record);}}/>
    {!grade?<>
      <section className={styles.workspace}>
        <div className={styles.sectionHead}>
          <div><span className={styles.overline}>岗位训练工作台 / CAREER PRACTICE</span>
            <h2>业务场景与案例数据</h2></div>
          <span className={styles.counter}>原创免费试练 · {practice.durationMinutes}分钟参考</span>
        </div>
        <p className={styles.context}>{practice.context}</p>
        <div className={styles.tableScroll}>
          {practice.dataTable?
            <table className={styles.supplierTable}>
              <thead><tr>{practice.dataTable.headers.map(h=><th key={h} scope="col">{h}</th>)}</tr></thead>
              <tbody>{practice.dataTable.rows.map((row,i)=><tr key={i}>
                {row.map((value,j)=>j===0?
                  <th key={j} scope="row">{value}</th>:<td key={j}>{value}</td>)}
              </tr>)}</tbody>
            </table>:
            <table className={styles.supplierTable}>
              <thead><tr><th>供应商</th><th>货价/件</th><th>运费/件</th><th>不良率</th><th>交期</th><th>最多订货</th></tr></thead>
              <tbody>{practice.suppliers.map(s=><tr key={s.id}>
                <th scope="row">{s.name} {s.id}</th><td>{s.unitPrice}元</td>
                <td>{s.freightPerUnit}元</td><td>{s.defectPercent}%</td><td>{s.leadDays}天</td>
                <td>{s.maxUnits}件</td>
              </tr>)}</tbody>
            </table>}
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
              value={typeof visibleAnswers[question.id]==="string"?(visibleAnswers[question.id] as string):""}
              onChange={e=>setSingle(question.id,e.target.value)}/>
          </label>:
          <fieldset className={styles.choiceField}>
            <legend className={styles.choiceLegend}>{question.kind==="multiple"?"可多选":"请选择一项"}</legend>
            <div className={styles.choices}>{question.options?.map(option=>{
              const selected=question.kind==="multiple"?
                (Array.isArray(visibleAnswers[question.id])&&(visibleAnswers[question.id] as string[]).includes(option.id)):
                visibleAnswers[question.id]===option.id;
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
          <p>允许留空提交，未答题计 0 分。微信账号自动保存成绩；未登录也能免费评分，但成绩不上传。</p>
          <button type="button" className={styles.primary} onClick={submit} disabled={loading||!hydrated}>
            {loading?"评分中…":"提交答卷并查看报告"}
          </button>
        </div>
        {error&&<p role="alert" className={styles.error}>{error}</p>}
      </section>
    </>:
    <section className={styles.report} aria-label="职业案例成绩报告">
      <div className={styles.overline}>SOCTHINK / ORIGINAL CAREER ASSESSMENT</div>
      <h2>你的岗位实操训练报告</h2>
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
      <p className={styles.note}>本报告衡量的是这一套原创职业案例中的表现，不等于企业真实笔试成绩、职业资质或录用预测。数据按题目给出的简化假设计算。</p>
      {grade.attemptPersistence==="account"?
        <p className={styles.saveOk}>本次成绩已保存到微信账号，可在上方“我的微信账号练习记录”跨设备查看和打开报告。</p>:
        saveWarning?<div className={styles.saveError} role="alert">
          <p>{saveWarning}</p><button className={styles.secondary} type="button" disabled={loading} onClick={()=>void submit()}>重试保存本次成绩</button>
        </div>:
        <p className={styles.note}>本次为免费未登录练习：报告暂未保存到账号。使用微信登录后，再次交卷即可自动存档。</p>}
      <div className={styles.reportActions}>
        <button type="button" className={styles.primary} onClick={reset}>重新挑战本案例</button>
        <Link href="/career">返回职业岗位目录</Link>
      </div>
    </section>}
  </div>;
}
