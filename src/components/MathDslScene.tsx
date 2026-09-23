"use client";

import ThreeSolidScene from "@/components/ThreeSolidScene";

type Obj =
  | {kind:"counters";id:string;count:number}
  | {kind:"tenframe";id:string;filled:number}
  | {kind:"numberline";id:string;start:number;end:number;step:number}
  | {kind:"bar";id:string;value:number;label:string}
  | {kind:"point";id:string;x:number;y:number;label:string}
  | {kind:"segment";id:string;a:string;b:string}
  | {kind:"circle";id:string;center:string;radius:number}
  | {kind:"polygon";id:string;points:string[]}
  | {kind:"angle";id:string;vertex:string;a:string;b:string;label:string}
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
    else if((m=s.match(/^CIRCLE\s+(\S+)\s+(\S+)\s+(\d+(?:\.\d+)?)$/i))) objects.push({kind:"circle",id:m[1],center:m[2],radius:Number(m[3])});
    else if((m=s.match(/^POLYGON\s+(\S+)\s+([A-Za-z0-9_.:-]+(?:,[A-Za-z0-9_.:-]+){2,})$/i))) objects.push({kind:"polygon",id:m[1],points:m[2].split(",")});
    else if((m=s.match(/^ANGLE\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s*(.*)$/i))) objects.push({kind:"angle",id:m[1],vertex:m[2],a:m[3],b:m[4],label:m[5]});
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
  const circles=objects.filter((o):o is Extract<Obj,{kind:"circle"}>=>o.kind==="circle");
  const polys=objects.filter((o):o is Extract<Obj,{kind:"polygon"}>=>o.kind==="polygon");
  const angles=objects.filter((o):o is Extract<Obj,{kind:"angle"}>=>o.kind==="angle");
  if(!pts.size&&!segs.length&&!circles.length&&!polys.length&&!angles.length)return null;
  const sx=(x:number)=>300+x*82, sy=(y:number)=>225-y*82;
  const polygonPoints=(ids:string[])=>ids.map(id=>pts.get(id)).filter(Boolean).map(p=>String(sx(p!.x))+","+String(sy(p!.y))).join(" ");
  const angleArc=(o:Extract<Obj,{kind:"angle"}>)=>{
    const v=pts.get(o.vertex),a=pts.get(o.a),b=pts.get(o.b); if(!v||!a||!b)return null;
    const av=Math.atan2(-(a.y-v.y),a.x-v.x),bv=Math.atan2(-(b.y-v.y),b.x-v.x);
    let diff=bv-av; while(diff<=-Math.PI)diff+=Math.PI*2; while(diff>Math.PI)diff-=Math.PI*2;
    const r=36,startX=sx(v.x)+r*Math.cos(av),startY=sy(v.y)+r*Math.sin(av);
    const endX=sx(v.x)+r*Math.cos(av+diff),endY=sy(v.y)+r*Math.sin(av+diff);
    const d="M "+startX+" "+startY+" A "+r+" "+r+" 0 0 "+(diff>0?1:0)+" "+endX+" "+endY;
    return {d,lx:sx(v.x)+55*Math.cos(av+diff/2),ly:sy(v.y)+55*Math.sin(av+diff/2)};
  };
  let reveal=0;
  const revealStyle=()=>({animationDelay:String(Math.min(900,reveal++*95))+"ms"});
  return <svg className="dsl-geometry" viewBox="0 0 600 450">
    {circles.map(c=>{const center=pts.get(c.center);return center?<circle key={c.id} style={revealStyle()} className={"dsl-geo-shape dsl-reveal "+(highlighted.has(c.id)?"hot":"")} cx={sx(center.x)} cy={sy(center.y)} r={c.radius*82}/>:null})}
    {polys.map(poly=>{const points=polygonPoints(poly.points);return points?<polygon key={poly.id} style={revealStyle()} className={"dsl-geo-shape dsl-reveal "+(highlighted.has(poly.id)?"hot":"")} points={points}/>:null})}
    {segs.map(seg=>{const a=pts.get(seg.a),b=pts.get(seg.b);return a&&b?<line key={seg.id} style={revealStyle()} x1={sx(a.x)} y1={sy(a.y)} x2={sx(b.x)} y2={sy(b.y)} className={"dsl-reveal "+(highlighted.has(seg.id)?"hot":"")}/>:null})}
    {angles.map(angle=>{const arc=angleArc(angle);return arc?<g key={angle.id} style={revealStyle()} className={"dsl-angle dsl-reveal "+(highlighted.has(angle.id)?"hot":"")}><path d={arc.d}/>{angle.label&&<text x={arc.lx} y={arc.ly}>{angle.label}</text>}</g>:null})}
    {[...pts.values()].map(point=><g key={point.id} style={revealStyle()} className={"dsl-point dsl-reveal "+(highlighted.has(point.id)?"hot":"")}><circle cx={sx(point.x)} cy={sy(point.y)} r="7"/><text x={sx(point.x)+11} y={sy(point.y)-11}>{point.label}</text></g>)}
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
