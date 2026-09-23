"use client";
import {useState} from "react";

export default function FlipCardScene(){
  const [step,setStep]=useState(0);
  const symbols=step===0?["●","■","▲"]:step===1?["●","■","▼"]:["▼","■","●"];
  return <div className="flip-card-scene">
    <div className={"flip-card-demo step-"+step} key={step}>
      {symbols.map((s,i)=><span key={i} className={s==="▲"||s==="▼"?"triangle":""}>{s}</span>)}
    </div>
    <div className="flip-card-actions">
      <button type="button" disabled={step!==0} onClick={()=>setStep(1)}>① 翻上边</button>
      <button type="button" disabled={step!==1} onClick={()=>setStep(2)}>② 翻左边</button>
      <button type="button" className="secondary" onClick={()=>setStep(0)}>重来</button>
    </div>
    <strong>{step===0?"原样：圆 · 方 · 上三角":step===1?"第一次：上下翻，三角形朝下": "第二次：左右再翻，顺序反过来"}</strong>
  </div>;
}
