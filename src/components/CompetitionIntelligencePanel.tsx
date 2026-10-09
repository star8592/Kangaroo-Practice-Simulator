"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import styles from "./CompetitionIntelligencePanel.module.css";

type Notice={
  id:string;eventId:string;titleZh:string;detailZh:string;
  date:string;daysUntil:number;sourceUrl:string;verifiedAt:string;priority:string;
};
type Info={region:string|null;followedCount:number;notices:Notice[];
  next:Notice[];hiddenCount:number;reviewedEditionCount:number;};
const REGIONS=[
  {value:"",label:"请先选择拟参赛地区"},
  {value:"CN",label:"中国赛区"},
  {value:"US",label:"美国赛区"},
  {value:"AU",label:"澳大利亚赛区"},
  {value:"CA",label:"加拿大赛区"},
  {value:"GB",label:"英国赛区"},
];
export default function CompetitionIntelligencePanel(){
  const [info,setInfo]=useState<Info|null>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    let live=true;
    fetch("/api/competition-intelligence",{cache:"no-store"}).then(async r=>{
      if(!r.ok)throw new Error("load");
      const data=await r.json() as Info;
      if(live){setInfo(data);setError("");}
    }).catch(()=>{if(live)setError("情报暂时无法加载，请重试。")});
    return()=>{live=false};
  },[revision]);
  async function saveRegion(value:string){
    setBusy(true);setError("");
    try{
      const res=await fetch("/api/competition-intelligence",{
        method:"PATCH",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({region:value||null}),
      });
      if(!res.ok)throw new Error("save");
      setInfo(await res.json() as Info);
    }catch{setError("无法保存赛区，请重试。");}
    finally{setBusy(false);}
  }
  return <section className={styles.panel} aria-label="赛事情报与提醒">
    <div className={styles.head}><div><span className={styles.eyebrow}>COMPETITION INTELLIGENCE</span>
      <h2>我的赛事情报</h2><p>只显示已关注赛事、指定参赛地区且来源仍有效的正式日期提醒。</p></div>
      <button type="button" className="secondary-button" onClick={()=>{setError("");setRevision(x=>x+1);}}>刷新情报</button>
    </div>
    <div className={styles.settings}>
      <label htmlFor="intelligence-region">计划参赛地区</label>
      <select id="intelligence-region" disabled={busy||!info}
        value={info?.region||""} onChange={e=>void saveRegion(e.target.value)}>
        {REGIONS.map(x=><option value={x.value} key={x.value}>{x.label}</option>)}
      </select>
      <span>这只是提醒匹配条件，不会更改您的个人身份或报名信息。</span>
    </div>
    {error&&<p role="alert">{error}</p>}
    {!info&&!error&&<p>正在加载已核验的赛事情报…</p>}
    {info&&(info.next.length?
      <div className={styles.list}>{info.next.map(n=><article className={styles.notice} key={n.id}>
        <strong>{n.date} · {n.daysUntil===0?"今天":n.daysUntil+"天后"}</strong>
        <h3>{n.titleZh}</h3><p>{n.detailZh}</p>
        <p className={styles.source}>资料核验日期：{n.verifiedAt}</p>
        <div className={styles.links}>
          <a href={n.sourceUrl} target="_blank" rel="noreferrer">查看本赛区资料来源 ↗</a>
          <Link href={"/competitions?event="+encodeURIComponent(n.eventId)}>赛事管家 →</Link>
        </div>
      </article>)}
      {info.hiddenCount>0&&<p>另有 {info.hiddenCount} 项已核验事项，可在赛历中查看。</p>}
      </div>
      :<p className={styles.empty}>{!info.region
        ?"请选择计划参赛地区，才能筛选对应赛区的公告。"
        :info.followedCount===0
          ?"还没有关注赛事。请先到全球赛事大厅关注感兴趣的比赛。"
          :"当前关注赛事没有符合地区、时间及有效来源条件的临近正式节点。继续按备赛清单准备，不会使用未经核实的截止日期。"}
      </p>)}
    <p className={styles.note}>本页目前提供登录后的站内情报查询，不代表已经开通微信订阅消息、短信或邮件主动推送。来源审核与参赛资格仍需按具体当届公告确认。</p>
  </section>;
}
