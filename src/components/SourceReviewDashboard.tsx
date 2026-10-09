"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import styles from "./SourceReviewDashboard.module.css";
type Source={id:string;label:string;eventId:string;region:string;url:string};
type Health={sourceId:string;checkedAt:string;lastSuccessAt?:string;error?:string};
type Entry={id:string;sourceId:string;label:string;eventId:string;region:string;url:string;observedAt:string;summary:string;status:string;previousDigest:string|null};
type Data={sources:Source[];health:Health[];pending:Entry[];reviewedCount:number;dismissedCount:number;history:(Entry & {reviewedAt?:string;reviewNote?:string;reviewedBy?:string})[]};
export default function SourceReviewDashboard(){
  const [data,setData]=useState<Data|null>(null);
  const [error,setError]=useState("");
  const [reason,setReason]=useState<Record<string,string>>({});
  const [saving,setSaving]=useState("");
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    let active=true;
    fetch("/api/admin/competition-source-watch",{cache:"no-store"})
      .then(async r=>{if(!r.ok)throw new Error("无法读取管理员审核队列");
        return await r.json() as Data;})
      .then(x=>{if(active){setData(x);setError("");}})
      .catch(e=>{if(active)setError(e instanceof Error?e.message:"读取失败");});
    return()=>{active=false;};
  },[revision]);
  const decide=async(entry:Entry,decision:"reviewed"|"dismissed")=>{
    const note=reason[entry.id]?.trim()||"";
    if(note.length<5){setError("请填写至少5个字的审核说明。");return;}
    setError("");setSaving(entry.id);
    try{
      const response=await fetch("/api/admin/competition-source-watch",{
        method:"PATCH",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({id:entry.id,decision,note}),
      });
      if(!response.ok)throw new Error("保存审核决定失败，请刷新并重试");
      setRevision(x=>x+1);
    }catch(e){setError(e instanceof Error?e.message:"保存失败");}
    finally{setSaving("");}
  };
  return <main className={styles.page}>
    <header className={styles.head}>
      <div><p className={styles.eyebrow}>OFFICIAL SOURCE MONITOR · REVIEW ONLY</p>
        <h1>赛事官方情报审核</h1>
        <p>官方网页变化先进入待审核队列，不直接更改比赛日期。标记“已阅”不代表核实事实，也不会自动发给学生。</p>
      </div>
      <div className={styles.actions}>
        <Link href="/competitions" className="secondary-button">赛事大厅</Link>
        <button className="secondary-button" type="button" onClick={()=>setRevision(x=>x+1)}>刷新审核队列</button>
      </div>
    </header>
    {error&&<p role="alert">{error}</p>}
    {!data&&!error&&<p>正在读取来源与审核记录…</p>}
    {data&&<>
      <section className={styles.metrics} aria-label="官方来源监控概况">
        <article><b>{data.sources.length}</b><span>官方监控来源</span></article>
        <article><b>{data.pending.length}</b><span>待处理变更</span></article>
        <article><b>{data.reviewedCount}</b><span>已阅读记录</span></article>
        <article><b>{data.dismissedCount}</b><span>已忽略记录</span></article>
      </section>
      <section>
        <h2>来源健康状态</h2>
        <div className={styles.sources}>{data.sources.map(x=>{
          const h=data.health.find(v=>v.sourceId===x.id);
          return <article className={styles.source} key={x.id}>
            <strong>{x.label}</strong>
            <small>{x.region} · {x.eventId}</small>
            <p>{!h?"尚无实际采集记录":h.error?"需要检查："+h.error:"最近成功核对："+(h.lastSuccessAt||"待定")}</p>
            <a href={x.url} target="_blank" rel="noreferrer">打开官方来源 ↗</a>
          </article>;
        })}</div>
      </section>
      <section>
        <h2>新发现的变化 · {data.pending.length}</h2>
        <p className={styles.note}>首次采集建立基线，之后若官方页面改变才会产生新增变更。网页改动不等同于报名日期变化；需打开官方来源核对正文、适用赛区和受众，再通过独立受审 PR 修改已核验赛事记录。</p>
        {!data.pending.length&&<p className={styles.empty}>暂无待审核的页面变更。尚未自动运行采集时，请先检查上方的来源健康状态。</p>}
        {data.pending.map(entry=><article className={styles.entry} key={entry.id}>
          <div className={styles.meta}><span>{entry.label} · {entry.region}</span>
            <span>{entry.previousDigest?"与上次不同":"首次采集基线"}</span>
            <time>{entry.observedAt.slice(0,19).replace("T"," ")}</time>
          </div>
          <p className={styles.excerpt}>{entry.summary}</p>
          <a href={entry.url} target="_blank" rel="noreferrer">打开原始官方网页核对 ↗</a>
          <label htmlFor={"review-"+entry.id}>审核说明（不能代替正式赛事资料审核）</label>
          <textarea id={"review-"+entry.id} value={reason[entry.id]||""} rows={2}
            placeholder="具体观察到的变化、是否有正式日期、是否需后续维护 PR…"
            onChange={e=>setReason(v=>({...v,[entry.id]:e.target.value}))}/>
          <div className={styles.actions}>
            <button className="secondary-button" type="button" disabled={saving===entry.id}
              onClick={()=>void decide(entry,"reviewed")}>已阅读，待独立核验</button>
            <button className="secondary-button" type="button" disabled={saving===entry.id}
              onClick={()=>void decide(entry,"dismissed")}>忽略本次页面变化</button>
          </div>
        </article>)}
      </section>
      <section aria-label="已处理的来源变化">
        <h2>审核历史 · 最近 {data.history.length} 项</h2>
        {data.history.length===0?<p className={styles.note}>还没有已处理记录。</p>:
        <div className={styles.sources}>{data.history.map(x=><article className={styles.source} key={x.id}>
          <strong>{x.label} · {x.status==="reviewed"?"已阅读":"已忽略"}</strong>
          <small>{x.reviewedAt?.slice(0,19).replace("T"," ")} · 审核账号 {x.reviewedBy}</small>
          <p>{x.reviewNote}</p>
          <a href={x.url} rel="noreferrer" target="_blank">重新查看原始来源 ↗</a>
        </article>)}</div>}
      </section>
    </>}
  </main>;
}
