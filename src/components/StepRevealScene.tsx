"use client";

import {useState} from "react";

export default function StepRevealScene({items}:{items:string[]}){
  const safe=items.filter(Boolean).slice(0,12);
  const [index,setIndex]=useState(0);
  if(!safe.length)return null;
  return <div className="step-reveal-scene">
    <div className="step-reveal-stack">
      {safe.slice(0,index+1).map((item,i)=><div key={i} className={"step-reveal-card "+(i===index?"active":"done")}>
        <span>{i+1}</span><strong>{item}</strong>
      </div>)}
    </div>
    <div className="step-reveal-actions">
      <button type="button" disabled={index===0} onClick={()=>setIndex(v=>Math.max(0,v-1))}>← 上一步</button>
      <button type="button" disabled={index>=safe.length-1} onClick={()=>setIndex(v=>Math.min(safe.length-1,v+1))}>下一步 →</button>
      <button type="button" className="secondary" onClick={()=>setIndex(0)}>重来</button>
    </div>
    <small>第 {index+1}/{safe.length} 步 · 一次只想一件事</small>
  </div>;
}
