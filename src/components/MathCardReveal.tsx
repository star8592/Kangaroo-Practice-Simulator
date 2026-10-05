"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "./MathCardReveal.module.css";

type Rarity = "普通" | "稀有" | "超稀有" | "传说" | "神话";
type CardData = { id:string; title:string; subtitle:string; rarity:Rarity; score:string; date?:string; note:string };

const meta: Record<Rarity,{cls:string;icon:string}> = {
  普通:{cls:"",icon:"★"},稀有:{cls:styles.rare,icon:"◆"},"超稀有":{cls:styles.epic,icon:"✦"},传说:{cls:styles.legendary,icon:"♛"},神话:{cls:styles.mythic,icon:"✧"}
};
function rarity(p:number):Rarity { if(p>=96)return"神话"; if(p>=90)return"传说"; if(p>=80)return"超稀有"; if(p>=70)return"稀有"; return"普通"; }

function Trophy(){ return <svg viewBox="0 0 64 64" aria-hidden="true" className={styles.svg}><path d="M18 11h28v16c0 10-6 17-14 17S18 37 18 27V11Z" fill="none" stroke="currentColor" strokeWidth="2.8"/><path d="M18 16H9c0 10 3 15 11 16M46 16h9c0 10-3 15-11 16M25 44v8m-8 4h22M39 44v8" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"/></svg>; }
function Star(){ return <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.starSvg}><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" fill="currentColor"/></svg>; }

export default function MathCardReveal({title,competition,score,maxScore,completedAt,examId}:{title:string;competition?:string;score:number;maxScore:number;completedAt?:number;examId:string}){
  const pct=maxScore>0?Math.round(score/maxScore*100):0;
  const competitionName=competition==="kangaroo"?"袋鼠数学":competition==="maa-amc"?"美国 MAA 数学竞赛":competition==="cemc"?"加拿大 CEMC 数学竞赛":competition||undefined;
  const card=useMemo<CardData>(()=>({id:"result-"+examId+"-"+score+"-"+maxScore,title:"数学挑战者",subtitle:competitionName||title||"数学挑战",rarity:rarity(pct),score:score+" / "+maxScore,date:completedAt?new Date(completedAt).toLocaleDateString("zh-CN"):undefined,note:"这是一张根据本次真实完成成绩生成的学习战绩卡，不代表赛事官方奖项。"}),[competitionName,completedAt,examId,maxScore,pct,score,title]);
  const [flipped,setFlipped]=useState(false),[revealed,setRevealed]=useState(false);
  useEffect(()=>{const t=window.setTimeout(()=>setRevealed(true),220);return()=>window.clearTimeout(t)},[]);
  const share=async()=>{const text="我刚完成了「"+card.subtitle+"」，成绩 "+card.score+"，解锁了一张 "+card.rarity+" 数学战绩卡！";try{if(navigator.share)await navigator.share({title:"我的数学战绩卡",text});else if(navigator.clipboard)await navigator.clipboard.writeText(text)}catch{}};
  const m=meta[card.rarity];
  return <section className={styles.reward} aria-label="数学卡牌奖励">
    <div className={styles.head}><div><span className="eyebrow">NEW CARD</span><h2>哇！你拿到新卡啦</h2><p>这次战绩已经自动收进卡册，再挑战下一张。</p></div><span className={styles.sparkle} aria-hidden="true">✦</span></div>
    <div className={styles.stage}>
      <div className={styles.cardWrap+" "+(revealed?styles.revealed:"")}>
        <div className={styles.card+" "+m.cls+(flipped?" "+styles.flipped:"")} role="button" tabIndex={0} aria-label={flipped?"卡牌背面":"卡牌正面"} onClick={()=>setFlipped(v=>!v)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setFlipped(v=>!v)}}}>
          <div className={styles.inner}>
            <div className={styles.face+" "+styles.front}><div className={styles.shine}/><div className={styles.topline}><span>{m.icon} {card.rarity}</span><span>NEW</span></div><div className={styles.symbol}><Trophy/></div><div className={styles.title}>{card.title}</div><div className={styles.subtitle}>{card.subtitle}</div><div className={styles.score}><strong>{card.score}</strong><span>本次战绩</span></div><div className={styles.bottom}><span>点我翻面</span><span>›</span></div></div>
            <div className={styles.face+" "+styles.back}><div className={styles.backIcon}><Star/></div><strong>这张卡属于你</strong><p>{card.note}</p><div className={styles.fact}><span>成绩</span><b>{card.score}</b></div>{card.date&&<div className={styles.fact}><span>完成</span><b>{card.date}</b></div>}<div className={styles.bottom}><span>‹</span><span>再点一次返回</span></div></div>
          </div>
        </div>
      </div>
    </div>
    <div className={styles.actions}><Link className="primary-button" href="/student/cards">✓ 已自动收进卡册 · 去看看</Link><button className="secondary-button" type="button" onClick={share}>↗ 晒一晒</button></div>
    <p className={styles.footnote}>当前是卡牌体验版：稀有度用于测试视觉与反馈，不代表全站真实稀有比例；正式荣誉仍以真实竞赛/学习证据为准。</p>
  </section>;
}
