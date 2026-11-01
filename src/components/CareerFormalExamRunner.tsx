"use client";

import Link from "next/link";
import {useCallback,useEffect,useRef,useState,useSyncExternalStore} from "react";
import type {CareerPracticeCase,CareerPracticeQuestion} from "@/lib/career-practice";
import type {CareerPracticeGrade} from "@/lib/career-practice-grade";
import CareerExamHistory from "@/components/CareerExamHistory";
import styles from "@/app/career/exams/career-formal-exam.module.css";

type Answers=Record<string,string|string[]>;
type Admission={token:string;startedAt:number;deadlineAt:number;
  durationMinutes:number;paperId:string;attemptId:string};
const noNotifications=()=>()=>{};
const clientReady=()=>true;
const serverNotReady=()=>false;
function readStored<T>(key:string):T|null{
  if(typeof window==="undefined")return null;
  try{
    const raw=window.sessionStorage.getItem(key);
    if(!raw)return null;
    return JSON.parse(raw) as T;
  }catch{return null;}
}
function isValidAdmission(raw:Admission|null,paperId:string){
  return !!raw&&raw.paperId===paperId&&typeof raw.token==="string"&&
    typeof raw.deadlineAt==="number"&&raw.deadlineAt>Date.now()-20000&&
    typeof raw.attemptId==="string"&&/^[0-9a-f-]{36}$/.test(raw.attemptId);
}
function answerIsPresent(q:CareerPracticeQuestion,v:unknown){
  return q.kind==="multiple"?Array.isArray(v)&&v.length>0:
    typeof v==="string"&&v.trim().length>0;
}
function minutesLeft(seconds:number){
  return String(Math.floor(seconds/60)).padStart(2,"0")+":"+
    String(seconds%60).padStart(2,"0");
}
export default function CareerFormalExamRunner({paper}:{paper:CareerPracticeCase}){
  const key="socthink:formal-exam:"+paper.id+":v"+paper.revision;
  const hydrated=useSyncExternalStore(noNotifications,clientReady,serverNotReady);
  const [admission,setAdmission]=useState<Admission|null>(()=>{
    const s=readStored<Admission>(key+":admission");
    return isValidAdmission(s,paper.id)?s:null;
  });
  const [answers,setAnswers]=useState<Answers>(()=>readStored<Answers>(key+":answers")??{});
  const [marked,setMarked]=useState<string[]>(()=>readStored<string[]>(key+":marked")??[]);
  const [index,setIndex]=useState(0);
  const [now,setNow]=useState(()=>Date.now());
  const [agreed,setAgreed]=useState(false);
  const [review,setReview]=useState(false);
  const [answerCardExpanded,setAnswerCardExpanded]=useState(false);
  const [grade,setGrade]=useState<CareerPracticeGrade|null>(null);
  const [loading,setLoading]=useState(false);
  const [starting,setStarting]=useState(false);
  const [error,setError]=useState("");
  const [warning,setWarning]=useState("");
  const [historyRefresh,setHistoryRefresh]=useState(0);
  const submitInFlight=useRef(false);
  const autoSubmitted=useRef(false);
  const visibleAdmission=hydrated?admission:null;
  const questions=paper.questions;
  const question=questions[index]??questions[0];
  const answered=questions.filter(q=>answerIsPresent(q,answers[q.id])).length;
  const remaining=visibleAdmission?
    Math.max(0,Math.ceil((visibleAdmission.deadlineAt-now)/1000)):0;
  const finished=!!grade;

  useEffect(()=>{
    if(!hydrated||!visibleAdmission||finished)return;
    const interval=setInterval(()=>setNow(Date.now()),1000);
    return ()=>clearInterval(interval);
  },[hydrated,visibleAdmission,finished]);
  useEffect(()=>{
    if(!hydrated||!visibleAdmission||finished)return;
    try{window.sessionStorage.setItem(key+":answers",JSON.stringify(answers));
      window.sessionStorage.setItem(key+":marked",JSON.stringify(marked));
    }catch{/* Can continue without browser storage. */}
  },[answers,marked,key,hydrated,visibleAdmission,finished]);

  async function begin(){
    if(!agreed||starting)return;
    setStarting(true);setError("");
    try{
      const response=await fetch(
        "/api/career/exam/"+encodeURIComponent(paper.id)+"/session",
        {method:"POST",cache:"no-store"});
      const result=await response.json() as Partial<Admission>&{error?:string};
      if(!response.ok||!result.token||typeof result.deadlineAt!=="number")
        throw Error(result.error||"入场失败，请重试");
      const started:Admission={
        token:result.token,startedAt:result.startedAt!,deadlineAt:result.deadlineAt,
        durationMinutes:paper.durationMinutes,paperId:paper.id,
        attemptId:window.crypto.randomUUID(),
      };
      setAdmission(started);setAnswers({});setMarked([]);setIndex(0);setReview(false);
      setNow(Date.now());autoSubmitted.current=false;
      try{
        window.sessionStorage.setItem(key+":admission",JSON.stringify(started));
        window.sessionStorage.removeItem(key+":answers");
        window.sessionStorage.removeItem(key+":marked");
      }catch{/* Free exam does not require local storage. */}
    }catch(e){setError(e instanceof Error?e.message:"入场请求失败");}
    finally{setStarting(false);}
  }

  const submit=useCallback(async()=>{
    if(submitInFlight.current||!admission||grade)return;
    submitInFlight.current=true;setLoading(true);setError("");setWarning("");
    try{
      const res=await fetch("/api/career/exam/"+encodeURIComponent(paper.id)+"/grade",{
        method:"POST",headers:{"Content-Type":"application/json"},cache:"no-store",
        body:JSON.stringify({answers,sessionToken:admission.token,attemptId:admission.attemptId}),
      });
      const data=await res.json() as {grade?:CareerPracticeGrade;error?:string;
        saveStatus?:"saved"|"browser-only"|"failed";warning?:string};
      if(!res.ok||!data.grade)throw Error(data.error||"交卷失败，请稍后重试");
      setGrade(data.grade);setReview(false);
      if(data.saveStatus==="saved")setHistoryRefresh(n=>n+1);
      if(data.saveStatus==="failed")setWarning(data.warning||"账号历史暂时保存失败");
      try{
        window.sessionStorage.removeItem(key+":admission");
        window.sessionStorage.removeItem(key+":answers");
        window.sessionStorage.removeItem(key+":marked");
      }catch{/* Nothing to clean. */}
    }catch(e){setError(e instanceof Error?e.message:"交卷请求失败，请重试");}
    finally{setLoading(false);submitInFlight.current=false;}
  },[admission,answers,grade,key,paper.id]);

  useEffect(()=>{
    if(!hydrated||!visibleAdmission||finished||now<visibleAdmission.deadlineAt||
      autoSubmitted.current)return;
    autoSubmitted.current=true;
    void submit();
  },[hydrated,visibleAdmission,finished,now,submit]);

  function update(id:string,value:string|string[]){
    setAnswers(prev=>({...prev,[id]:value}));
    setError("");
  }
  function toggleMultiple(qid:string,value:string,checked:boolean){
    const old=Array.isArray(answers[qid])?answers[qid] as string[]:[];
    update(qid,checked?[...new Set([...old,value])]:old.filter(x=>x!==value));
  }
  function reset(){
    setGrade(null);setAdmission(null);setReview(false);setAgreed(false);setIndex(0);
    setAnswers({});setMarked([]);setNow(Date.now());setError("");setWarning("");
    autoSubmitted.current=false;submitInFlight.current=false;
    try{window.sessionStorage.removeItem(key+":admission");
      window.sessionStorage.removeItem(key+":answers");
      window.sessionStorage.removeItem(key+":marked");
    }catch{/* Ignore. */}
  }
  function goToQuestion(n:number){
    setIndex(Math.max(0,Math.min(questions.length-1,n)));setReview(false);
  }

  if(!hydrated)return <div className={styles.boot}>正在读取模拟笔试会话…</div>;

  if(!visibleAdmission&&!grade)return <>
    <div className={styles.admission}>
    <div className={styles.admissionTop}>
      <div className={styles.admissionKicker}>SOCTHINK · 正式模拟笔试入场</div>
      <h1>{paper.title}</h1>
      <p>{paper.context}</p>
    </div>
    <div className={styles.ticketGrid}>
      <div><strong>{questions.length}</strong><span>道题</span></div>
      <div><strong>{paper.durationMinutes}</strong><span>分钟</span></div>
      <div><strong>{paper.maxPoints}</strong><span>总分</span></div>
      <div><strong>2026 Q4</strong><span>模拟卷版本</span></div>
    </div>
    <section className={styles.admissionRules}>
      <h2>入场须知</h2>
      <ol>
        <li>这是本站原创岗位模拟笔试，不是企业官方真题或招聘流程。</li>
        <li>点击“确认入场”后开始45分钟倒计时；到时自动交卷，服务端同时校验截止时间。</li>
        <li>可以跳题、标记待检查、查看答题卡；交卷前可进入检查页确认未答题。</li>
        <li>题目在2026-11-01编写，逐题保留原始版本和参考考点的收集日期。</li>
        <li>交卷后立即得到客观题成绩与逐题解析；登录微信可保存到自己的账号历史。</li>
      </ol>
      <label className={styles.checkRule}>
        <input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)}/>
        我已阅读入场规则，确认这是原创模拟笔试并同意开始计时
      </label>
      <button type="button" className={styles.enterButton} onClick={()=>void begin()}
        disabled={!agreed||starting}>{starting?"正在办理入场…":"确认入场 · 开始模拟笔试"}</button>
      {error&&<p className={styles.error} role="alert">{error}</p>}
      <div className={styles.entryLinks}>
        <Link href="/career#digital-services">返回模拟笔试列表</Link>
        <Link href="/career#digital-materials">先看对应复习资料</Link>
      </div>
    </section>
    <details className={styles.sourceDisclosure}>
      <summary>本卷的真实性、日期与取材说明</summary>
      <p>题目为本站独立编写的模拟题，依据岗位技能和公开面经里的考点确定范围；未复制第三方的受限原题。当前版本为2026-11-01初版，不假称企业官方或真实考生原题。</p>
    </details>
  </div>
    <div className={styles.historyDock}>
      <CareerExamHistory caseId={paper.id} revision={paper.revision}
        refreshKey={historyRefresh} onOpen={setGrade}/>
    </div>
  </>;

  if(grade)return <div className={styles.finish}>
    <div className={styles.finishHeading}><span>考试完成 / ORIGINAL MOCK EXAM</span>
      <h1>{paper.title}</h1><p>本场正式模拟笔试已交卷，以下是服务器按固定规则核对的成绩。</p></div>
    <div className={styles.resultScore}><strong>{grade.score}<small> / {grade.maxPoints}</small></strong>
      <div>已作答 {grade.completed}/{grade.totalQuestions} 题
        <p>题库版本 v{paper.revision} · 客观题逐题判分</p></div></div>
    {warning&&<div className={styles.error} role="alert">{warning}</div>}
    <div className={styles.resultActions}>
      <button type="button" onClick={reset}>重新入场考一次</button>
      <Link href="/career#digital-services">选择其他岗位笔试</Link>
    </div>
    <CareerExamHistory caseId={paper.id} revision={paper.revision}
      refreshKey={historyRefresh} onOpen={setGrade}/>
    <h2 className={styles.reviewTitle}>逐题解析</h2>
    <div className={styles.resultList}>
      {grade.items.map((q,i)=><article key={q.questionId}>
        <div><b>{i+1}. {q.skill}</b>
          <span className={q.correct?styles.right:styles.wrong}>{q.correct?"正确":"需复练"}
            · {q.earned}/{q.maxPoints}分</span></div>
        <p><strong>正确答案：</strong>{q.expected}</p><p>{q.explanation}</p>
      </article>)}
    </div>
    <p className={styles.disclaimer}>本站原创建模测验不代表任何企业官方笔试成绩、资质认证或真实招聘录取预测。</p>
  </div>;

  if(!question||!visibleAdmission)return null;
  return <div className={styles.examRoom} aria-label="岗位正式模拟笔试考场">
    <header className={styles.roomHeader}>
      <div className={styles.roomIdentity}>
        <span>SOCTHINK · 正式模拟笔试</span>
        <h1>{paper.title}</h1>
        <p>模拟卷 v{paper.revision} · 原创题库 · {paper.durationMinutes}分钟</p>
      </div>
      <div className={remaining<=300?styles.timeWarning:styles.clock}
        aria-live={remaining<=60?"assertive":"off"}>
        <span>剩余时间</span><strong>{minutesLeft(remaining)}</strong></div>
    </header>
    <div className={styles.roomProgress}>
      <span>已答 <strong>{answered}</strong> / {questions.length} 题</span>
      <span>已标记 <strong>{marked.length}</strong> 题</span>
      <div className={styles.progressTrack}><span style={{width:(answered/questions.length*100)+"%"}}/></div>
    </div>
    {review?<section className={styles.reviewSheet}>
      <h2>交卷前确认</h2>
      <p>已答 {answered} 题，未答 {questions.length-answered} 题，标记检查 {marked.length} 题。未答题计0分；确认交卷后不能修改本场答卷。</p>
      <div className={styles.numberGrid}>
        {questions.map((q,i)=><button type="button" key={q.id}
          className={marked.includes(q.id)?styles.flagNumber:
            answerIsPresent(q,answers[q.id])?styles.doneNumber:styles.number}
          onClick={()=>goToQuestion(i)} aria-label={"检查第"+(i+1)+"题"}>{i+1}</button>)}
      </div>
      <div className={styles.reviewActions}>
        <button className={styles.outlineButton} type="button" onClick={()=>setReview(false)}>继续检查答卷</button>
        <button className={styles.finishButton} type="button" disabled={loading}
          onClick={()=>void submit()}>{loading?"交卷中…":"确认交卷 · 查看成绩"}</button>
      </div>
      {error&&<p className={styles.error} role="alert">{error}</p>}
    </section>:<div className={styles.roomGrid}>
      <section className={styles.mainQuestion}>
        <div className={styles.questionIdentity}>
          <span>第 {index+1} / {questions.length} 题</span>
          <span>{question.kind==="multiple"?"多项选择":question.kind==="integer"?"计算填空":"单项选择"}</span>
          <span>{question.weight}分</span>
        </div>
        <span className={styles.questionSkill}>{question.skill}</span>
        <h2>{question.prompt}</h2>
        {question.kind==="integer"?<label className={styles.numericAnswer}>
          <span>请输入整数答案</span>
          <input type="text" inputMode="numeric" maxLength={40}
            placeholder={question.placeholder||"按题目要求输入整数"}
            aria-label={question.prompt}
            value={typeof answers[question.id]==="string"?answers[question.id] as string:""}
            onChange={e=>update(question.id,e.target.value)}/>
        </label>:<fieldset className={styles.answerChoices}>
          <legend>{question.kind==="multiple"?"可选择多项":"请在以下选项中选择一项"}</legend>
          {question.options?.map(opt=>{
            const selected=question.kind==="multiple"?
              Array.isArray(answers[question.id])&&(answers[question.id] as string[]).includes(opt.id):
              answers[question.id]===opt.id;
            return <label className={selected?styles.chosen:styles.choice} key={opt.id}>
              <input type={question.kind==="multiple"?"checkbox":"radio"}
                name={question.id} checked={selected}
                onChange={e=>question.kind==="multiple"?
                  toggleMultiple(question.id,opt.id,e.target.checked):
                  update(question.id,opt.id)}/>
              <strong>{opt.id}</strong><span>{opt.label}</span>
            </label>;
          })}
        </fieldset>}
        <div className={styles.questionProvenance}>
          <span>题目来源：本站原创</span>
          <span>编写 {question.provenance?.authoredAt??"2026-11-01"}</span>
          <span>参考资料核对 {question.provenance?.sourceObservedAt??"2026-11-01"}</span>
        </div>
        <details className={styles.questionSource}><summary>考点参考线索（非原题出处）</summary>
          <p>题干、数值及评分规则均由SOCTHINK原创。取材线索：{question.provenance?.topicSourceTitle||"公开岗位能力要求"}。
          不代表该机构提供或授权此题。</p>
          {question.provenance?.topicSourceUrl&&<a href={question.provenance.topicSourceUrl}
            target="_blank" rel="noopener noreferrer">查看原始参考页面</a>}
        </details>
        <div className={styles.questionActions}>
          <button className={styles.outlineButton} type="button"
            disabled={index===0} onClick={()=>goToQuestion(index-1)}>上一题</button>
          <button className={styles.markButton} type="button"
            aria-pressed={marked.includes(question.id)}
            onClick={()=>setMarked(old=>old.includes(question.id)?old.filter(x=>x!==question.id):[...old,question.id])}>
            {marked.includes(question.id)?"取消标记":"标记待检查"}</button>
          <button className={styles.nextButton} type="button"
            onClick={()=>index===questions.length-1?setReview(true):goToQuestion(index+1)}>
            {index===questions.length-1?"检查并交卷":"下一题"}</button>
        </div>
      </section>
      <aside className={styles.answerCard+(answerCardExpanded?" "+styles.answerCardExpanded:"")}>
        <button type="button" className={styles.answerCardToggle} aria-expanded={answerCardExpanded}
          onClick={()=>setAnswerCardExpanded(open=>!open)}>
          题号导航 · 已答 {answered}/{questions.length} · 待复查 {marked.length}
        </button>
        <h2>本场答题卡</h2>
        <p>选题可跳转；浅色未答，深色已答，边框标记待检查。</p>
        <div className={styles.numberGrid}>
          {questions.map((q,i)=><button key={q.id} type="button"
            className={index===i?styles.currentNumber:marked.includes(q.id)?
              styles.flagNumber:answerIsPresent(q,answers[q.id])?styles.doneNumber:styles.number}
            onClick={()=>goToQuestion(i)} aria-label={"跳转第"+(i+1)+"题"}
            aria-current={index===i?"step":undefined}>{i+1}</button>)}
        </div>
        <div className={styles.cardKey}><span>未答</span><span>已答</span><span>标记</span></div>
        <button type="button" className={styles.reviewButton}
          onClick={()=>setReview(true)}>检查答卷 / 提前交卷</button>
      </aside>
    </div>}
    {error&&<p className={styles.error} role="alert">{error}</p>}
    <p className={styles.disclaimer}>当前为本站原创限时模拟笔试，不涉及摄像监考或企业录用资格。刷新页面会保留本标签页倒计时与已填答案（需浏览器允许会话存储）。</p>
  </div>;
}
