"use client";

import {useState} from "react";

export type OverlaySpot={id:string;x:number;y:number;label:string;hot?:boolean};
export type OverlayTrace={id:string;points:Array<[number,number]>;hot?:boolean};
export type OverlayPick={id:string;x:number;y:number;label:string;correct:boolean};

export default function ImageOverlayScene({
  url,spots,traces,picks,
}:{
  url:string;
  spots:OverlaySpot[];
  traces:OverlayTrace[];
  picks:OverlayPick[];
}) {
  const [picked,setPicked]=useState<string|null>(null);
  const selected=picks.find(p=>p.id===picked);
  return <div className="image-overlay-scene">
    <div className="image-overlay-wrap">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="原题图交互标注" />
      <svg className="image-overlay-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {traces.map(t=><polyline key={t.id} className={"image-overlay-trace "+(t.hot?"hot":"")} points={t.points.map(([x,y])=>x+","+y).join(" ")}/>)}
        {spots.map(s=><g key={s.id} className={"image-overlay-spot "+(s.hot?"hot":"")}>
          <ellipse cx={s.x} cy={s.y} rx="2.2" ry="3.0"/>
          {s.label&&<text x={s.x+2.8} y={s.y-2.1}>{s.label}</text>}
        </g>)}
      </svg>
      {picks.map(p=><button key={p.id} type="button"
        className={"image-overlay-pick "+(picked===p.id?(p.correct?"correct":"wrong"):"")}
        style={{left:p.x+"%",top:p.y+"%"}} onClick={()=>setPicked(p.id)}
        aria-label={"选择 "+p.label}>
        {p.label}
      </button>)}
    </div>
    {picks.length>0&&<div className={"image-overlay-feedback "+(selected?(selected.correct?"correct":"wrong"):"")}>
      {!selected?"点一个候选位置试试看。":selected.correct?"✓ 这个选择符合条件。":"再想想：这个位置还有一个条件没满足。"}
    </div>}
  </div>;
}
