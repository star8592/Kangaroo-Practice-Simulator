"use client";

import {useState} from "react";

export default function FlipCardScene(){
  const [step,setStep]=useState(0);
  const transform=step===0?"none":step===1?"scaleY(-1)":"rotate(180deg)";
  return <div className="flip-card-scene">
    <div className="flip-card-board">
      <div className="flip-card-object" style={{transform}}>
        <span className="flip-circle"/><span className="flip-square"/><span className="flip-triangle"/>
      </div>
    </div>
    <div className="flip-card-actions">
      <button type="button" disabled={step!==0} onClick={()=>setStep(1)}>① 沿上边翻</button>
      <button type="button" disabled={step!==1} onClick={()=>setStep(2)}>② 沿左边翻</button>
      <button type="button" className="secondary" onClick={()=>setStep(0)}>重置</button>
    </div>
    <strong>{step===0?"原来的卡片":step===1?"第一次：上下镜像":"两次合起来：旋转180° → B"}</strong>
  </div>;
}
