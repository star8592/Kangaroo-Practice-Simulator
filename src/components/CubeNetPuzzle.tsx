"use client";

import {useMemo,useState} from "react";
import ThreeSolidScene from "@/components/ThreeSolidScene";
import {analyzeCubeNet,validCubeNetRemovals,type CubeNetCell} from "@/lib/cube-net";

export default function CubeNetPuzzle({cells,initialRemoved,initialFolded=false}:{cells:CubeNetCell[];initialRemoved?:string;initialFolded?:boolean}) {
  const [removed,setRemoved]=useState<string|undefined>(initialRemoved);
  const [folded,setFolded]=useState(initialFolded);
  const remaining=useMemo(()=>removed?cells.filter(c=>c.label!==removed):cells,[cells,removed]);
  const analysis=useMemo(()=>removed?analyzeCubeNet(remaining):null,[removed,remaining]);
  const valid=analysis?.valid??false;
  const validRemovals=useMemo(()=>validCubeNetRemovals(cells),[cells]);

  const minX=Math.min(...cells.map(c=>c.x)), maxX=Math.max(...cells.map(c=>c.x));
  const minY=Math.min(...cells.map(c=>c.y)), maxY=Math.max(...cells.map(c=>c.y));
  const pad=22, size=74;
  const width=(maxX-minX+1)*size+pad*2, height=(maxY-minY+1)*size+pad*2;

  return <div className="cube-net-puzzle">
    <div className="cube-net-puzzle-stage">
      {folded&&valid?<ThreeSolidScene faceLabels={analysis?.faceByNormal}/>:
        <svg viewBox={`0 0 ${width} ${height}`} className="cube-net-puzzle-svg" aria-label="可点击删除方格的立方体展开图">
          {cells.map(cell=>{
            const x=pad+(cell.x-minX)*size, y=pad+(cell.y-minY)*size;
            const off=removed===cell.label;
            return <g key={cell.label} className={"cube-net-puzzle-cell "+(off?"removed ":"")+(removed===cell.label?"selected":"")}
              onClick={()=>{setFolded(false);setRemoved(cell.label);}} role="button" tabIndex={0}>
              <rect x={x+2} y={y+2} width={size-4} height={size-4} rx="8"/>
              <text x={x+size/2} y={y+size/2+7}>{cell.label}</text>
            </g>;
          })}
        </svg>
      }
    </div>
    <div className="cube-net-puzzle-actions">
      <span>{!removed?"点掉一个方格，看看剩下 6 格能不能折成立方体。":
        valid?"这 6 格可以折成立方体。":
        analysis?.reason==="disconnected"?"删掉后图形断开了，不能当展开图。":
        analysis?.reason==="face-overlap"?"虽然还连着，但折起后 "+analysis.overlaps.flat().join(" 和 ")+" 会抢同一个面。":
        "折起后面朝向发生冲突，不能组成一个立方体。"}</span>
      {removed&&valid&&<button type="button" onClick={()=>setFolded(v=>!v)}>{folded?"展开检查":"折起来验证"}</button>}
      {removed&&<button type="button" className="secondary" onClick={()=>{setRemoved(undefined);setFolded(false);}}>重试</button>}
    </div>
    {removed&&<small>当前删除：{removed}；本地几何判定：{valid?"VALID":"INVALID"}</small>}
    <span className="cube-net-puzzle-teacher" aria-hidden="true">有效删除：{validRemovals.join("、")}</span>
  </div>;
}
