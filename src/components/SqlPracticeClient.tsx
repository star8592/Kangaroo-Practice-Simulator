"use client";
import {useState,useRef,useEffect} from "react";
import {SQL_TASKS,SQL_FIXTURES,SQL_SCHEMA,type SqlCheck} from "@/lib/sql-practice";
import styles from "@/app/assessment-center/measurement.module.css";
type Stage="intro"|"practice"|"report";
type WorkerAnswer={requestId:string;ok:boolean;result?:SqlCheck;error?:string};
export default function SqlPracticeClient(){
 const [stage,setStage]=useState<Stage>("intro");
 const [accepted,setAccepted]=useState(false);
 const [taskIndex,setTaskIndex]=useState(0);
 const [query,setQuery]=useState(SQL_TASKS[0].starter);
 const [busy,setBusy]=useState(false);
 const [attempts,setAttempts]=useState<Record<string,number>>({});
 const [solved,setSolved]=useState<Record<string,boolean>>({});
 const [last,setLast]=useState<SqlCheck|null>(null);
 const [error,setError]=useState("");
 const [showHint,setShowHint]=useState(false);
 const workerRef=useRef<Worker|null>(null);
 const timerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
 const task=SQL_TASKS[taskIndex];
 const solvedCount=SQL_TASKS.filter(x=>solved[x.id]).length;
 useEffect(()=>()=>{workerRef.current?.terminate();if(timerRef.current)clearTimeout(timerRef.current);},[]);
 const clearWorker=()=>{
  workerRef.current?.terminate();workerRef.current=null;
  if(timerRef.current)clearTimeout(timerRef.current);
  timerRef.current=null;
 };
 const reset=()=>{
  clearWorker();setStage("intro");setAccepted(false);setTaskIndex(0);setQuery(SQL_TASKS[0].starter);
  setBusy(false);setAttempts({});setSolved({});setLast(null);setError("");setShowHint(false);
 };
 const gotoTask=(i:number)=>{
  clearWorker();setTaskIndex(i);setQuery(SQL_TASKS[i].starter);setLast(null);setError("");setShowHint(false);setBusy(false);
 };
 const runQuery=()=>{
  if(busy)return;
  setError("");setLast(null);setBusy(true);
  setAttempts(prev=>({...prev,[task.id]:(prev[task.id]??0)+1}));
  clearWorker();
  try{
   const worker=new Worker(new URL("../workers/sql-practice.worker.ts",import.meta.url),{type:"module"});
   workerRef.current=worker;
   const requestId=task.id+"-"+Date.now();
   worker.onmessage=(event:MessageEvent<WorkerAnswer>)=>{
    if(event.data.requestId!==requestId)return;
    clearWorker();setBusy(false);
    if(!event.data.ok||!event.data.result){setError(event.data.error??"SQL 执行失败");return;}
    const result=event.data.result;setLast(result);
    if(result.correct)setSolved(prev=>({...prev,[task.id]:true}));
   };
   worker.onerror=()=>{clearWorker();setBusy(false);setError("SQL 运行环境暂时不可用，请刷新重试。");};
   timerRef.current=setTimeout(()=>{clearWorker();setBusy(false);setError("SQL 运行超过安全时间限制，已结束该次独立执行。请简化查询。");},12000);
   worker.postMessage({requestId,taskId:task.id,query});
  }catch{clearWorker();setBusy(false);setError("无法启动浏览器 SQL 沙箱，请更换浏览器重试。");}
 };
 return <div className={styles.sqlRunner}>
  <header className={styles.runnerHeader}>
   <span className={styles.eyebrowDark}>SOCTHINK · SQL SKILL LAB</span>
   <h1>真实 SQL · 数据分析岗位练习</h1>
   <p>用 SQLite 亲自写查询、运行真实订单数据、核对输出，而不是通过选择题猜 SQL。</p>
   <div className={styles.labels}><span>免费实训</span><span>SQLite WebAssembly</span><span>4项岗位任务</span><span>浏览器本地沙箱</span></div>
  </header>
  {stage==="intro"&&<section className={styles.panel}>
   <h2>这次练习需要完成什么？</h2>
   <p className={styles.lead}>假设你是电商平台的数据分析助理，需要筛选有效订单、统计支付渠道、关联客户、筛选活跃付费客户。你写的 SQL 会在两组不同的模拟数据上真正执行，然后按输出结果验证。</p>
   <dl className={styles.details}>
    <div><dt>任务构成</dt><dd>4项逐级任务：筛选、分组、连接、聚合条件。</dd></div>
    <div><dt>数据来源</dt><dd>SOCTHINK 原创的虚构客户及订单数据，无真实个人信息。</dd></div>
    <div><dt>执行方式</dt><dd>浏览器 Worker 内运行 SQLite；每次新建内存数据库，查询只读并有超时限制。</dd></div>
    <div><dt>判分</dt><dd>同一 SQL 在两组独立数据上运行，按列、值及指定排序精确比对。通过表示完成这些任务，不表示岗位资质或招聘录用能力。</dd></div>
    <div><dt>年龄与限制</dt><dd>当前面向18岁及以上成年人；只供技能学习，不是经效度验证的职业选拔测验。</dd></div>
   </dl>
   <p className={styles.privacy}>用户输入的 SQL 和执行结果不上传服务器。本练习不保存账号画像或成绩；浏览器刷新后当前记录消失。</p>
   <label className={styles.consent}><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/> 我已年满18岁，并理解这是岗位技能练习而不是资格证明。</label>
   <div className={styles.controls}><button type="button" className={styles.primaryButton} disabled={!accepted} onClick={()=>setStage("practice")}>打开 SQL 实训台</button></div>
  </section>}
  {stage==="practice"&&<div className={styles.sqlWorkspace}>
    <section className={styles.panel}>
      <div className={styles.progressRow}><strong>任务 {taskIndex+1} / {SQL_TASKS.length}</strong><span>已独立验证 {solvedCount} / {SQL_TASKS.length}</span></div>
      <div className={styles.progress} role="progressbar" aria-label="已完成 SQL 任务" aria-valuemin={0} aria-valuemax={SQL_TASKS.length} aria-valuenow={solvedCount}><span style={{width:(solvedCount/SQL_TASKS.length*100)+"%"}}/></div>
      <h2>{task.name}</h2><p className={styles.lead}>{task.requirement}</p>
      <p className={styles.smallNote}>本题重点：{task.concept}。要求输出列：{task.expectedColumns.join("、")}。</p>
      <div className={styles.sqlEditor}>
        <label htmlFor="sql-code-input">你的 SQLite 查询</label>
        <textarea id="sql-code-input" spellCheck={false} value={query} onChange={e=>setQuery(e.target.value)} rows={8} maxLength={1500}/>
      </div>
      <div className={styles.controls}>
        <button type="button" className={styles.secondaryButton} disabled={busy} onClick={()=>setShowHint(x=>!x)}>{showHint?"收起提示":"显示提示"}</button>
        <button type="button" className={styles.primaryButton} disabled={busy||!query.trim()} onClick={runQuery}>{busy?"真实 SQLite 正在计算…":"运行 SQL 并核对结果"}</button>
      </div>
      {showHint&&<p className={styles.sqlHint}>{task.hint}</p>}
      <div role="status" aria-live="polite">
        {error&&<div className={styles.sqlError}><strong>执行未完成</strong><p>{error}</p></div>}
        {last&&<div className={last.correct?styles.sqlSuccess:styles.sqlError}>
          <strong>{last.correct?"任务完成 · 两组数据通过":"需要调整 SQL"}</strong>
          <p>{last.message}（已检查 {last.fixturesChecked} 组数据）</p>
        </div>}
      </div>
      {last?.sample&&<div className={styles.sqlOutput}>
        <h3>真实 SQLite 查询结果 · 第一组数据</h3>
        <div className={styles.sqlTableWrap}><table><thead><tr>{last.sample.columns.map((c,i)=><th key={i}>{c}</th>)}</tr></thead><tbody>
          {last.sample.values.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell===null?"NULL":cell}</td>)}</tr>)}
        </tbody></table></div>
      </div>}
      <div className={styles.controls}>
        <button type="button" className={styles.secondaryButton} disabled={busy||taskIndex===0} onClick={()=>gotoTask(taskIndex-1)}>上一任务</button>
        {taskIndex<SQL_TASKS.length-1?<button type="button" className={styles.primaryButton} disabled={busy||!solved[task.id]} onClick={()=>gotoTask(taskIndex+1)}>进入下一任务</button>:
        <button type="button" className={styles.primaryButton} disabled={busy||solvedCount!==SQL_TASKS.length} onClick={()=>setStage("report")}>查看技能练习报告</button>}
      </div>
    </section>
    <section className={styles.panel}>
      <h2>模拟业务数据库</h2><p className={styles.smallNote}>示例数据仅用于学习。你的 SQL 会在另一组数据上同时验证，避免记答案。</p>
      <div className={styles.sqlSchema}><strong>customers</strong><code>{SQL_SCHEMA.customers.replace("CREATE TABLE ","")}</code><strong>orders</strong><code>{SQL_SCHEMA.orders.replace("CREATE TABLE ","")}</code></div>
      <div className={styles.sqlOutput}><h3>orders 表 · 8 行示例</h3><div className={styles.sqlTableWrap}><table><thead><tr>{["order_id","customer_id","amount","status","channel","ordered_at"].map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>
        {SQL_FIXTURES[0].orders.map(row=><tr key={row[0]}>{row.map((x,i)=><td key={i}>{x}</td>)}</tr>)}
      </tbody></table></div></div>
      <div className={styles.sqlOutput}><h3>customers 表</h3><div className={styles.sqlTableWrap}><table><thead><tr><th>customer_id</th><th>name</th><th>city</th></tr></thead><tbody>
        {SQL_FIXTURES[0].customers.map(row=><tr key={row[0]}>{row.map((x,i)=><td key={i}>{x}</td>)}</tr>)}
      </tbody></table></div></div>
    </section>
  </div>}
  {stage==="report"&&<section className={styles.panel}>
   <div className={styles.reportTitle}><div><span className={styles.eyebrowDark}>SQL PRACTICE REPORT · original-sql-v1</span><h2>岗位任务完成记录</h2></div><span className={styles.previewBadge}>非标准化训练</span></div>
   <p className={styles.lead}>已完成并通过 {solvedCount} / {SQL_TASKS.length} 项 SQL 任务。每项在两个模拟数据集上进行实际 SQL 结果比对。这不是专业资格证书或真实岗位胜任能力证明。</p>
   <ol className={styles.reviewList}>{SQL_TASKS.map(task=><li key={task.id} className={styles.reviewItem}><strong>{task.name}</strong><p>{task.concept} · 通过：{solved[task.id]?"是":"否"} · 执行次数：{attempts[task.id]??0}</p></li>)}</ol>
   <div className={styles.reportFoot}><strong>范围说明</strong><p>该记录只说明在给定模拟数据库、四个练习任务上的完成情况，不包含统计效度、岗位能力常模、真人面试评价或招聘决策结论。</p></div>
   <div className={styles.controls}><button type="button" className={styles.secondaryButton} onClick={reset}>重新练习</button><button type="button" className={styles.primaryButton} onClick={()=>window.print()}>打印记录</button></div>
  </section>}
 </div>;
}
