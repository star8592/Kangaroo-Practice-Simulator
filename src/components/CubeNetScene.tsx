"use client";

import { useState } from "react";
import ThreeSolidScene from "@/components/ThreeSolidScene";

type Pattern="cube-cross"|"cube-t"|"cube-zigzag";

const layouts:Record<Pattern,Array<[number,number,string]>>={
  "cube-cross":[[1,0,"上"],[0,1,"左"],[1,1,"中"],[2,1,"右"],[1,2,"下"],[1,3,"底"]],
  "cube-t":[[0,0,"1"],[1,0,"2"],[2,0,"3"],[1,1,"4"],[1,2,"5"],[1,3,"6"]],
  "cube-zigzag":[[0,0,"1"],[1,0,"2"],[1,1,"3"],[2,1,"4"],[2,2,"5"],[3,2,"6"]],
};

export default function CubeNetScene({
  pattern="cube-cross",
  initialFolded=false,
}:{
  pattern?:string;
  initialFolded?:boolean;
}) {
  const safePattern=(pattern in layouts?pattern:"cube-cross") as Pattern;
  const [folded,setFolded]=useState(initialFolded);
  return <div className="cube-net-scene">
    <div className="cube-net-stage">
      {folded?<ThreeSolidScene/>:
        <svg viewBox="0 0 480 420" className="cube-net-svg" aria-label="立方体展开图">
          {layouts[safePattern].map(([x,y,label],i)=>
            <g key={label} className="cube-net-face" style={{animationDelay:String(i*90)+"ms"}}>
              <rect x={42+x*92} y={26+y*92} width="86" height="86" rx="8"/>
              <text x={85+x*92} y={76+y*92}>{label}</text>
            </g>
          )}
        </svg>
      }
    </div>
    <button type="button" className="cube-net-toggle" onClick={()=>setFolded(v=>!v)}>
      {folded?"展开看看":"折起来"}
    </button>
    <small>{folded?"拖动立方体检查相邻面关系":"先在平面上预测哪些面会相遇"}</small>
  </div>;
}
