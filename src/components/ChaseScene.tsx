"use client";
import {useState} from "react";

export default function ChaseScene(){
  const [round,setRound]=useState(0);
  const cat=-4+round*2;
  const mouse=round;
  const caught=cat>=mouse;
  const min=-4,max=6;
  const pos=(v:number)=>((v-min)/(max-min))*100;
  return <div className="chase-scene">
    <div className="chase-track">
      {Array.from({length:max-min+1},(_,i)=>min+i).map(v=><span key={v} className="chase-cell" style={{left:pos(v)+"%"}}>{v>0&&v<=5?v:""}</span>)}
      <span className="chase-token cat" style={{left:pos(cat)+"%"}}>🐱</span>
      <span className="chase-token mouse" style={{left:pos(mouse)+"%"}}>🐭</span>
    </div>
    <div className="chase-actions">
      <button type="button" disabled={caught} onClick={()=>setRound(r=>Math.min(6,r+1))}>{caught?"抓到了！":"跳一下 →"}</button>
      <button type="button" className="secondary" onClick={()=>setRound(0)}>重来</button>
    </div>
    <strong>{caught?"第 "+mouse+" 格相遇；一共跳了 "+round+" 轮。":"第 "+round+" 轮：猫每次跳2格，鼠每次跳1格。"}</strong>
  </div>;
}
