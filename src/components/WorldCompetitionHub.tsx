"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import CompetitionCompanion from "./CompetitionCompanion";
import { getWorldCompanion, type CompanionLang } from "@/lib/competition-companion";
import { WORLD_COMPETITIONS, WORLD_REGION_OPTIONS, WORLD_STAGE_OPTIONS, matchesWorldReferenceStage, worldRegionName, type ReferenceStage, type WorldRegion } from "@/lib/world-competitions";
import type { ExamProfile } from "@/lib/types";
import styles from "./WorldCompetitionHub.module.css";

type RegionFilter = "all" | WorldRegion;
type StageFilter = "all" | ReferenceStage;
export default function WorldCompetitionHub({lang, today, exams, initialSelected, onSelectTraining}: {
  lang: CompanionLang; today: string; exams: ExamProfile[]; initialSelected?: string;
  onSelectTraining: (competitionId: "kangaroo" | "australian-amc" | "maa-amc" | "cemc") => void;
}) {
  const [region, setRegion] = useState<RegionFilter>("all");
  const [stage, setStage] = useState<StageFilter>("all");
  const [follows, setFollows] = useState<string[]>([]);
  const [followMode, setFollowMode] = useState<"loading"|"guest"|"ready"|"error">("loading");
  const [savingFollow, setSavingFollow] = useState(false);
  const [followError, setFollowError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(()=>{
    let alive=true;
    fetch("/api/competition-follow",{cache:"no-store"}).then(async r=>{
      if(!alive)return;
      if(r.status===401){setFollowMode("guest");return;}
      if(!r.ok)throw new Error("load failed");
      const json=await r.json();
      if(alive){setFollows(json.followedEventIds||[]);setFollowMode("ready");}
    }).catch(()=>{if(alive)setFollowMode("error")});
    return()=>{alive=false};
  },[reload]);
  async function toggleFollow(eventId:string){
    if(followMode!=="ready"||savingFollow)return;
    setSavingFollow(true);setFollowError("");
    try{
      const r=await fetch("/api/competition-follow",{
        method:"PATCH",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({eventId,following:!follows.includes(eventId)})
      });
      if(!r.ok)throw new Error("save failed");
      const data=await r.json();
      setFollows(data.followedEventIds);
    }catch{setFollowError(lang==="zh"?"保存关注失败，请重试。":"Could not save follow. Please retry.");}
    finally{setSavingFollow(false);}
  }
  const [selected, setSelected] = useState(WORLD_COMPETITIONS.some(x=>x.id===initialSelected) ? initialSelected! : WORLD_COMPETITIONS[0].id);
  const zh = lang === "zh";
  const visible = WORLD_COMPETITIONS.filter(item => (region === "all" || item.region === region) && matchesWorldReferenceStage(item,stage));
  const event = WORLD_COMPETITIONS.find(item => item.id === selected) || WORLD_COMPETITIONS[0];
  const companion = getWorldCompanion(event.id, today);
  const trainingCount = (id?: string) => id
    ? exams.filter(item => item.competitionId === id && item.paperType !== "smart").length
    : 0;
  return <section id="world-competition-hub" className={styles.hub} aria-label={zh?"全球数学赛事管家":"World math competition companion"}>
    <div className="section-heading">
      <div>
        <span className="eyebrow">WORLD MATH COMPETITION COMPANION</span>
        <h2>{zh?"全球数学赛事管家":"World Math Competition Companion"}</h2>
        <p>{zh?"中国、美国、澳洲、加拿大、英国及全球性数学赛事，同一套管理流程。按地区筛选，不按国别分高低。":"One unified journey for math competitions in China and worldwide. Region is a filter, never a hierarchy."}</p>
      </div>
    </div>
    <div className={styles.filters} role="group" aria-label={zh?"按地区筛选赛事":"Filter events by region"}>
      {WORLD_REGION_OPTIONS.map(option => <button
        key={option.value} type="button" aria-pressed={region === option.value}
        className={region === option.value ? styles.filterSelected : styles.filter}
        onClick={() => {
          setRegion(option.value);
          const first = WORLD_COMPETITIONS.find(x => option.value === "all" || x.region === option.value);
          if (first) setSelected(first.id);
        }}>
        {option[lang]}
      </button>)}
    </div>
    <div className={styles.filters} role="group" aria-label={zh?"按学段筛选赛事":"Filter events by school stage"}>
      {WORLD_STAGE_OPTIONS.map(option => <button
        key={option.value} type="button" aria-pressed={stage === option.value}
        className={stage === option.value ? styles.filterSelected : styles.filter}
        onClick={()=>{
          setStage(option.value);
          const first = WORLD_COMPETITIONS.find(x => (region==="all"||x.region===region)&&matchesWorldReferenceStage(x,option.value));
          if(first)setSelected(first.id);
        }}>{option[lang]}</button>)}
    </div>
    <p className={styles.disclaimer}>{zh?"学段为往届或赛事系列参考范围，不代表当届具体组别的报名资格。":"Stage filters describe historical or series coverage, not confirmed eligibility for a local edition."}</p>
    <div className={styles.followSummary}>
      <span>{zh?("我关注的赛事："+follows.length+"项"):("Following "+follows.length+" competitions")}</span>
      <Link href="/student/calendar">{zh?"打开我的赛历 →":"My calendar →"}</Link>
    </div>
    <div className="feature-grid" aria-label={zh?"世界赛事目录":"World competition directory"}>
      {visible.map(item => {
        const available = trainingCount(item.trainingId);
        return <article className={selected===item.id?styles.selected:styles.card} key={item.id}>
          <div className="paper-brand"><b>{worldRegionName(item.region, lang)}</b><span>{zh?"赛事档案":"Competition profile"}</span></div>
          <h3>{zh?item.nameZh:item.nameEn}</h3>
          <p>{zh?item.summaryZh:item.summaryEn}</p>
          {follows.includes(item.id)&&<span className={styles.followMark}>{zh?"已关注":"Following"}</span>}
          <p className={styles.state}>{available > 0
            ? (zh ? available + " 套已入库训练资料" : available + " indexed practice papers")
            : (zh ? "赛事资讯与备赛清单" : "Event information and preparation")}
          </p>
          <button className={selected===item.id?"primary-button":"secondary-button"}
            type="button" aria-pressed={selected===item.id}
            onClick={() => {
              setSelected(item.id);
              document.getElementById("world-competition-detail")?.scrollIntoView({behavior:"smooth",block:"start"});
            }}>
            {selected===item.id?(zh?"当前赛事 ✓":"Selected ✓"):(zh?"查看赛事管家":"Open companion")}
          </button>
        </article>;
      })}
    </div>
    <div id="world-competition-detail" className={styles.detail} aria-live="polite">
      <div className={styles.detailHead}>
        <div>
          <span className="eyebrow">{worldRegionName(event.region, lang)}</span>
          <h3>{zh?event.nameZh:event.nameEn}</h3>
          <p>{zh?event.summaryZh:event.summaryEn}</p>
          <p className={styles.disclaimer}>{zh
            ?"报名资格、时间及考点按学生所在赛区逐届核实；历史试题不意味着当届开放报名。"
            :"Verify the student's local eligibility, dates and venue per season. Past papers do not imply registration is open."}</p>
        </div>
        <div className={styles.actions}>
          {event.trainingId && trainingCount(event.trainingId)>0 && <button type="button" className="primary-button"
            onClick={() => onSelectTraining(event.trainingId!)}>
            {zh?"进入本站模拟训练 ↓":"Go to practice ↓"}
          </button>}
          {followMode==="ready"
            ? <button type="button" className="secondary-button" disabled={savingFollow}
              onClick={()=>void toggleFollow(event.id)}>
                {savingFollow?(zh?"保存中…":"Saving…"):follows.includes(event.id)?(zh?"✓ 已关注 · 取消关注":"✓ Following · Unfollow"):(zh?"＋ 关注赛事":"＋ Follow competition")}
              </button>
            :followMode==="guest"
              ? <Link className="secondary-button" href={"/login?next="+encodeURIComponent("/competitions?event="+event.id)}>
                  {zh?"登录后关注赛事":"Sign in to follow"}
                </Link>
              :followMode==="error"
                ? <button type="button" className="secondary-button" onClick={()=>{setFollowMode("loading");setReload(x=>x+1)}}>
                    {zh?"重试加载关注状态":"Retry follows"}
                  </button>
                :<span>{zh?"正在读取关注状态…":"Loading follows…"}</span>}
          <a className="secondary-button" href={event.sourceUrl} target="_blank" rel="noreferrer">
            {zh?"查看赛事来源 ↗":"View source ↗"}
          </a>
        </div>
      </div>
      {followError&&<p role="alert">{followError}</p>}
      {companion && <CompetitionCompanion key={companion.id} companion={companion} lang={lang} today={today}/>}
    </div>
  </section>;
}
