"use client";

import {useState} from "react";

export default function ChaseScene(){
  const [step,setStep]=useState(0);
  const cat=Math.min(12,step*2);
  const mouse=Math.min(12,6+step);
  const met=cat===mouse;
  return <div className="chase-scene">
    <div className="chase-strip">
      {Array.from({length:15},(_,i)=><div key={i} className={"chase-tile "+(met&&i===12?"meet":"")}>
        <span>{cat===i?"🐱":""}{mouse===i?"🐭":""}</span>
        {i>=9&&i<=13?<b>{i-8}</b>:<b>&nbsp;</b>}
      </div>)}
    </div>
    <div className="chase-info">
      <span>第 {step} 轮</span><span>猫：+2</span><span>老鼠：+1</span>
      {met&&<strong>追上了！在 4 号格</strong>}
    </div>
    <div className="chase-actions">
      <button type="button" disabled={step>=6} onClick={()=>setStep(v=>Math.min(6,v+1))}>下一跳 →</button>
      <button type="button" className="secondary" onClick={()=>setStep(0)}>重来</button>
    </div>
  </div>;
}
