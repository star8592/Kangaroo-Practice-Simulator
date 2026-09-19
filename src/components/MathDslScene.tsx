"use client";

import ThreeSolidScene from "@/components/ThreeSolidScene";

type Obj =
  | {kind:"counters";id:string;count:number}
  | {kind:"tenframe";id:string;filled:number}
  | {kind:"numberline";id:string;start:number;end:number;step:number}
  | {kind:"bar";id:string;value:number;label:string}
  | {kind:"point";id:string;x:number;y:number;label:string}
  | {kind:"segment";id:string;a:string;b:string}
  | {kind:"text";id:string;text:string}
  | {kind:"equation";id:string;text:string}
  | {kind:"dicepair";id:string;a:number;b:number;label:string};

function parse(script:string[]) {
  const objects:Obj[]=[]; const hidden=new Set<string>(); const highlighted=new Set<string>();
  let hasCube=false;
  for(const raw of script||[]) {
    const s=raw.trim(); if(!s) continue;
    let m:RegExpMatchArray|null;
    if(s==="SOURCE") continue;
    if((m=s.match(/^COUNTERS\s+(\S+)\s+(\d+)$/i))) objects.push({kind:"counters",id:m[1],count:Number(m[2])});
    else if((m=s.match(/^TENFRAME\s+(\S+)\s+(\d+)$/i))) objects.push({kind:"tenframe",id:m[1],filled:Number(m[2])});
    else if((m=s.match(/^NUMBERLINE\s+(\S+)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)$/i))) objects.push({kind:"numberline",id:m[1],start:Number(m[2]),end:Number(m[3]),step:Number(m[4])});
    else if((m=s.match(/^BAR\s+(\S+)\s+(-?\d+(?:\.\d+)?)\s*(.*)$/i))) objects.push({kind:"bar",id:m[1],value:Number(m[2]),label:m[3]});
    else if((m=s.match(/^POINT\s+(\S+)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*(.*)$/i))) objects.push({kind:"point",id:m[1],x:Number(m[2]),y:Number(m[3]),label:m[4]||m[1]});
    else if((m=s.match(/^SEGMENT\s+(\S+)\s+(\S+)\s+(\S+)$/i))) objects.push({kind:"segment",id:m[1],a:m[2],b:m[3]});
    else if((m=s.match(/^TEXT\s+(\S+)\s+[-\d.]+\s+[-\d.]+\s+(.+)$/i))) objects.push({kind:"text",id:m[1],text:m[2]});
    else if((m=s.match(/^EQUATION\s+(\S+)\s+(.+)$/i))) objects.push({kind:"equation",id:m[1],text:m[2]});
    else if((m=s.match(/^DICEPAIR\s+(\S+)\s+([1-6])\s+([1-6])\s*(.*)$/i))) objects.push({kind:"dicepair",id:m[1],a:Number(m[2]),b:Number(m[3]),label:m[4]});
    else if(/^CUBE\s+/i.test(s)) hasCube=true;
    else if((m=s.match(/^HIDE\s+(\S+)$/i))) hidden.add(m[1]);
    else if((m=s.match(/^SHOW\s+(\S+)$/i))) hidden.delete(m[1]);
    else if((m=s.match(/^HIGHLIGHT\s+(\S+)$/i))) highlighted.add(m[1]);
  }
  return {objects:objects.filter(o=>!hidden.has(o.id)),highlighted,hasCube};
}

function NumberLine({o,hot}:{o:Extract<Obj,{kind:"numberline"}>;hot:boolean}) {
  const vals:number[]=[]; for(let v=o.start;v<=o.end+1e-9&&vals.length<25;v+=o.step) vals.push(Number(v.toFixed(6)));
  return <div className={"dsl-numberline "+(hot?"hot":"")}><div className="dsl-number-track"/><div className="dsl-number-ticks">{vals.map(v=><span key={v}><i/>{v}</span>)}</div></div>;
}

function Geometry({objects,highlighted}:{objects:Obj[];highlighted:Set<string>}) {
  const pts=new Map(objects.filter((o):o is Extract<Obj,{kind:"point"}>=>o.kind==="point").map(p=>[p.id,p]));
  const segs=objects.filter((o):o is Extract<Obj,{kind:"segment"}>=>o.kind==="segment");
  if(!pts.size&&!segs.length)return null;
  const sx=(x:number)=>300+x*38, sy=(y:number)=>180-y*38;
  return <svg className="dsl-geometry" viewBox="0 0 600 360">
    {segs.map(s=>{const a=pts.get(s.a),b=pts.get(s.b);return a&&b?<line key={s.id} x1={sx(a.x)} y1={sy(a.y)} x2={sx(b.x)} y2={sy(b.y)} className={highlighted.has(s.id)?"hot":""}/>:null})}
    {[...pts.values()].map(p=><g key={p.id} className={highlighted.has(p.id)?"hot":""}><circle cx={sx(p.x)} cy={sy(p.y)} r="7"/><text x={sx(p.x)+11} y={sy(p.y)-11}>{p.label}</text></g>)}
  </svg>;
}

export default function MathDslScene({script}:{script:string[]}) {
  const {objects,highlighted,hasCube}=parse(script);
  if(hasCube) return <ThreeSolidScene/>;
  const counters=objects.filter((o):o is Extract<Obj,{kind:"counters"}>=>o.kind==="counters");
  const frames=objects.filter((o):o is Extract<Obj,{kind:"tenframe"}>=>o.kind==="tenframe");
  const lines=objects.filter((o):o is Extract<Obj,{kind:"numberline"}>=>o.kind==="numberline");
  const bars=objects.filter((o):o is Extract<Obj,{kind:"bar"}>=>o.kind==="bar");
  const texts=objects.filter(o=>o.kind==="text"||o.kind==="equation") as Extract<Obj,{kind:"text"|"equation"}>[];
  const dice=objects.filter((o):o is Extract<Obj,{kind:"dicepair"}>=>o.kind==="dicepair");
  const maxBar=Math.max(1,...bars.map(b=>Math.abs(b.value)));
  return <div className="dsl-stage">
    {counters.map(o=><div key={o.id} className={"dsl-counters "+(highlighted.has(o.id)?"hot":"")}>{Array.from({length:Math.min(o.count,60)},(_,i)=><i key={i}/>)}</div>)}
    {frames.map(o=><div key={o.id} className={"dsl-tenframe "+(highlighted.has(o.id)?"hot":"")}>{Array.from({length:10},(_,i)=><i key={i} className={i<o.filled?"filled":""}/>)}</div>)}
    {lines.map(o=><NumberLine key={o.id} o={o} hot={highlighted.has(o.id)}/>)}
    {bars.map(o=><div key={o.id} className={"dsl-bar-row "+(highlighted.has(o.id)?"hot":"")}><span>{o.label||o.id}</span><i style={{width:`${Math.max(8,Math.abs(o.value)/maxBar*100)}%`}}/><b>{o.value}</b></div>)}
    <Geometry objects={objects} highlighted={highlighted}/>
    {dice.map(o=><div key={o.id} className={"dsl-dicepair "+(highlighted.has(o.id)?"hot":"")}><div><i>{o.a}</i><span>+</span><i>{o.b}</i></div><b>{o.label||String(o.a+o.b)}</b></div>)}
    {texts.map(o=><div key={o.id} className={o.kind==="equation"?"dsl-equation":"dsl-text"}>{o.text}</div>)}
    {!objects.length&&<div className="solution-empty-visual"><span>🧩</span><strong>这一步由本地动画工人执行</strong><small>剧本已经锁定，渲染器不会修改数学关系。</small></div>}
  </div>;
}
