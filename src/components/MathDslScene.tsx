"use client";

import CubeNetScene from "@/components/CubeNetScene";
import CubeNetPuzzle from "@/components/CubeNetPuzzle";
import ThreeSolidScene from "@/components/ThreeSolidScene";
import ImageOverlayScene from "@/components/ImageOverlayScene";
import FlipCardScene from "@/components/FlipCardScene";
import ChaseScene from "@/components/ChaseScene";

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
  | {kind:"text";id:string;x:number;y:number;text:string}
  | {kind:"equation";id:string;text:string}
  | {kind:"dicepair";id:string;a:number;b:number;label:string}
  | {kind:"net";id:string;pattern:string}
  | {kind:"cubenet";id:string;cells:{label:string;x:number;y:number}[];removed?:string}
  | {kind:"image";id:string;url:string}
  | {kind:"spot";id:string;x:number;y:number;label:string}
  | {kind:"trace";id:string;points:Array<[number,number]>}
  | {kind:"pick";id:string;x:number;y:number;label:string;correct:boolean}
  | {kind:"cubefaces";id:string;labels:[string,string,string,string,string,string]}
  | {kind:"flipcard";id:string}
  | {kind:"chase";id:string};

export function parseMathDsl(script:string[]) {
  const objects:Obj[]=[];
  const hidden=new Set<string>();
  const highlighted=new Set<string>();
  const folded=new Set<string>();
  const rotations=new Map<string,number>();
  const morphed=new Set<string>();
  let hasCube=false;

  const find=(id:string)=>objects.find(o=>o.id===id);

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
    else if((m=s.match(/^TEXT\s+(\S+)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(.+)$/i))) objects.push({kind:"text",id:m[1],x:Number(m[2]),y:Number(m[3]),text:m[4]});
    else if((m=s.match(/^EQUATION\s+(\S+)\s+(.+)$/i))) objects.push({kind:"equation",id:m[1],text:m[2]});
    else if((m=s.match(/^DICEPAIR\s+(\S+)\s+([1-6])\s+([1-6])\s*(.*)$/i))) objects.push({kind:"dicepair",id:m[1],a:Number(m[2]),b:Number(m[3]),label:m[4]});
    else if((m=s.match(/^NET\s+(\S+)\s+(cube-cross|cube-t|cube-zigzag)$/i))) objects.push({kind:"net",id:m[1],pattern:m[2].toLowerCase()});
    else if((m=s.match(/^CUBENET\s+(\S+)\s+(.+)$/i))) {
      const cells=m[2].split("|").map(part=>{
        const z=part.match(/^([^@|]+)@(-?\d+),(-?\d+)$/);
        return z?{label:z[1],x:Number(z[2]),y:Number(z[3])}:null;
      }).filter(Boolean) as {label:string;x:number;y:number}[];
      if(cells.length>=6&&cells.length<=12) objects.push({kind:"cubenet",id:m[1],cells});
    }
    else if((m=s.match(/^IMAGE\s+(\S+)\s+(\S+)$/i))) objects.push({kind:"image",id:m[1],url:m[2]});
    else if((m=s.match(/^SPOT\s+(\S+)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*(.*)$/i))) objects.push({kind:"spot",id:m[1],x:Number(m[2]),y:Number(m[3]),label:m[4]});
    else if((m=s.match(/^TRACE\s+(\S+)\s+(.+)$/i))) {
      const points=m[2].split("|").map(part=>{
        const z=part.match(/^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/);
        return z?[Number(z[1]),Number(z[2])] as [number,number]:null;
      }).filter(Boolean) as Array<[number,number]>;
      if(points.length>=2) objects.push({kind:"trace",id:m[1],points});
    }
    else if((m=s.match(/^PICK\s+(\S+)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(correct|wrong)\s+(.+)$/i))) objects.push({kind:"pick",id:m[1],x:Number(m[2]),y:Number(m[3]),correct:m[4].toLowerCase()==="correct",label:m[5]});
    else if((m=s.match(/^CUBEFACES\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)$/i))) objects.push({kind:"cubefaces",id:m[1],labels:[m[2],m[3],m[4],m[5],m[6],m[7]]});
    else if((m=s.match(/^FLIPCARD\s+(\S+)$/i))) objects.push({kind:"flipcard",id:m[1]});
    else if((m=s.match(/^CHASE\s+(\S+)$/i))) objects.push({kind:"chase",id:m[1]});
    else if(/^CUBE\s+/i.test(s)) hasCube=true;
    else if((m=s.match(/^MOVE\s+(\S+)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)$/i))) {
      const o=find(m[1]);
      if(o?.kind==="point"){o.x=Number(m[2]);o.y=Number(m[3]);highlighted.add(o.id);}
      else if(o?.kind==="text"){o.x=Number(m[2]);o.y=Number(m[3]);highlighted.add(o.id);}
    }
    else if((m=s.match(/^ROTATE\s+(\S+)\s+(?:x|y|z|2d)\s+(-?\d+(?:\.\d+)?)$/i))) rotations.set(m[1],Number(m[2]));
    else if((m=s.match(/^MORPH\s+(\S+)\s+(.+)$/i))) {
      const o=find(m[1]);
      if(o?.kind==="equation"||o?.kind==="text"){o.text=m[2];morphed.add(o.id);highlighted.add(o.id);}
    }
    else if((m=s.match(/^FOLD\s+(\S+)$/i))) folded.add(m[1]);
    else if((m=s.match(/^REMOVE\s+(\S+)\s+(\S+)$/i))) {
      const o=find(m[1]); if(o?.kind==="cubenet") o.removed=m[2];
    }
    else if((m=s.match(/^HIDE\s+(\S+)$/i))) hidden.add(m[1]);
    else if((m=s.match(/^SHOW\s+(\S+)$/i))) hidden.delete(m[1]);
    else if((m=s.match(/^HIGHLIGHT\s+(\S+)$/i))) highlighted.add(m[1]);
  }
  return {objects:objects.filter(o=>!hidden.has(o.id)),highlighted,folded,rotations,morphed,hasCube};
}

function NumberLine({o,hot}:{o:Extract<Obj,{kind:"numberline"}>;hot:boolean}) {
  const vals:number[]=[]; for(let v=o.start;v<=o.end+1e-9&&vals.length<25;v+=o.step) vals.push(Number(v.toFixed(6)));
  return <div className={"dsl-numberline "+(hot?"hot":"")}><div className="dsl-number-track"/><div className="dsl-number-ticks">{vals.map(v=><span key={v}><i/>{v}</span>)}</div></div>;
}

function Geometry({objects,highlighted,rotations}:{objects:Obj[];highlighted:Set<string>;rotations:Map<string,number>}) {
  const pts=new Map(objects.filter((o):o is Extract<Obj,{kind:"point"}>=>o.kind==="point").map(p=>[p.id,p]));
  const segs=objects.filter((o):o is Extract<Obj,{kind:"segment"}>=>o.kind==="segment");
  const circles=objects.filter((o):o is Extract<Obj,{kind:"circle"}>=>o.kind==="circle");
  const polys=objects.filter((o):o is Extract<Obj,{kind:"polygon"}>=>o.kind==="polygon");
  const angles=objects.filter((o):o is Extract<Obj,{kind:"angle"}>=>o.kind==="angle");
  if(!pts.size&&!segs.length&&!circles.length&&!polys.length&&!angles.length)return null;
  const sx=(x:number)=>300+x*82, sy=(y:number)=>225-y*82;
  const polygonPoints=(ids:string[])=>ids.map(id=>pts.get(id)).filter(Boolean).map(p=>String(sx(p!.x))+","+String(sy(p!.y))).join(" ");
  const polygonCenter=(ids:string[])=>{
    const a=ids.map(id=>pts.get(id)).filter(Boolean) as Extract<Obj,{kind:"point"}>[];
    if(!a.length)return {x:300,y:225};
    return {x:a.reduce((n,p)=>n+sx(p.x),0)/a.length,y:a.reduce((n,p)=>n+sy(p.y),0)/a.length};
  };
  const angleArc=(o:Extract<Obj,{kind:"angle"}>)=>{
    const v=pts.get(o.vertex),a=pts.get(o.a),b=pts.get(o.b); if(!v||!a||!b)return null;
    const av=Math.atan2(-(a.y-v.y),a.x-v.x),bv=Math.atan2(-(b.y-v.y),b.x-v.x);
    let diff=bv-av; while(diff<=-Math.PI)diff+=(Math.PI*2); while(diff>Math.PI)diff-=(Math.PI*2);
    const r=36,startX=sx(v.x)+r*Math.cos(av),startY=sy(v.y)+r*Math.sin(av);
    const endX=sx(v.x)+r*Math.cos(av+diff),endY=sy(v.y)+r*Math.sin(av+diff);
    const d="M "+startX+" "+startY+" A "+r+" "+r+" 0 0 "+(diff>0?1:0)+" "+endX+" "+endY;
    return {d,lx:sx(v.x)+55*Math.cos(av+diff/2),ly:sy(v.y)+55*Math.sin(av+diff/2)};
  };
  let reveal=0;
  const revealStyle=()=>({animationDelay:String(Math.min(900,reveal++*95))+"ms"});
  return <svg className="dsl-geometry" viewBox="0 0 600 450">
    {circles.map(c=>{const center=pts.get(c.center);return center?<circle key={c.id} style={revealStyle()} className={"dsl-geo-shape dsl-reveal "+(highlighted.has(c.id)?"hot":"")} cx={sx(center.x)} cy={sy(center.y)} r={c.radius*82}/>:null})}
    {polys.map(poly=>{const points=polygonPoints(poly.points);const c=polygonCenter(poly.points);const deg=rotations.get(poly.id)||0;return points?<polygon key={poly.id} style={revealStyle()} transform={deg?"rotate("+deg+" "+c.x+" "+c.y+")":undefined} className={"dsl-geo-shape dsl-reveal "+(highlighted.has(poly.id)?"hot":"")} points={points}/>:null})}
    {segs.map(seg=>{const a=pts.get(seg.a),b=pts.get(seg.b);return a&&b?<line key={seg.id} style={revealStyle()} x1={sx(a.x)} y1={sy(a.y)} x2={sx(b.x)} y2={sy(b.y)} className={"dsl-reveal "+(highlighted.has(seg.id)?"hot":"")}/>:null})}
    {angles.map(angle=>{const arc=angleArc(angle);return arc?<g key={angle.id} style={revealStyle()} className={"dsl-angle dsl-reveal "+(highlighted.has(angle.id)?"hot":"")}><path d={arc.d}/>{angle.label&&<text x={arc.lx} y={arc.ly}>{angle.label}</text>}</g>:null})}
    {[...pts.values()].map(point=><g key={point.id} style={revealStyle()} className={"dsl-point dsl-reveal "+(highlighted.has(point.id)?"hot":"")}><circle cx={sx(point.x)} cy={sy(point.y)} r="7"/><text x={sx(point.x)+11} y={sy(point.y)-11}>{point.label}</text></g>)}
  </svg>;
}

export default function MathDslScene({script}:{script:string[]}) {
  const {objects,highlighted,folded,rotations,morphed,hasCube}=parseMathDsl(script);
  const counters=objects.filter((o):o is Extract<Obj,{kind:"counters"}>=>o.kind==="counters");
  const frames=objects.filter((o):o is Extract<Obj,{kind:"tenframe"}>=>o.kind==="tenframe");
  const lines=objects.filter((o):o is Extract<Obj,{kind:"numberline"}>=>o.kind==="numberline");
  const bars=objects.filter((o):o is Extract<Obj,{kind:"bar"}>=>o.kind==="bar");
  const texts=objects.filter(o=>o.kind==="text"||o.kind==="equation") as Extract<Obj,{kind:"text"|"equation"}>[];
  const dice=objects.filter((o):o is Extract<Obj,{kind:"dicepair"}>=>o.kind==="dicepair");
  const nets=objects.filter((o):o is Extract<Obj,{kind:"net"}>=>o.kind==="net");
  const cubenets=objects.filter((o):o is Extract<Obj,{kind:"cubenet"}>=>o.kind==="cubenet");
  const images=objects.filter((o):o is Extract<Obj,{kind:"image"}>=>o.kind==="image");
  const spots=objects.filter((o):o is Extract<Obj,{kind:"spot"}>=>o.kind==="spot");
  const traces=objects.filter((o):o is Extract<Obj,{kind:"trace"}>=>o.kind==="trace");
  const picks=objects.filter((o):o is Extract<Obj,{kind:"pick"}>=>o.kind==="pick");
  const cubeFaces=objects.filter((o):o is Extract<Obj,{kind:"cubefaces"}>=>o.kind==="cubefaces");
  const flipCards=objects.filter((o):o is Extract<Obj,{kind:"flipcard"}>=>o.kind==="flipcard");
  const chases=objects.filter((o):o is Extract<Obj,{kind:"chase"}>=>o.kind==="chase");
  const maxBar=Math.max(1,...bars.map(b=>Math.abs(b.value)));
  return <div className="dsl-stage">
    {hasCube&&<ThreeSolidScene/>}
    {cubeFaces.map(o=><ThreeSolidScene key={o.id} faceLabels={{
      "1,0,0":o.labels[0],"-1,0,0":o.labels[1],"0,1,0":o.labels[2],
      "0,-1,0":o.labels[3],"0,0,1":o.labels[4],"0,0,-1":o.labels[5],
    }}/>)}
    {flipCards.map(o=><FlipCardScene key={o.id}/>)}
    {chases.map(o=><ChaseScene key={o.id}/>)}
    {images.map(img=><ImageOverlayScene key={img.id} url={img.url}
      spots={spots.map(o=>({...o,hot:highlighted.has(o.id)}))}
      traces={traces.map(o=>({...o,hot:highlighted.has(o.id)}))}
      picks={picks}/>)}
    {nets.map(o=><CubeNetScene key={o.id} pattern={o.pattern} initialFolded={folded.has(o.id)}/>)}
    {cubenets.map(o=><CubeNetPuzzle key={o.id} cells={o.cells} initialRemoved={o.removed} initialFolded={folded.has(o.id)}/>)}
    {counters.map(o=><div key={o.id} className={"dsl-counters "+(highlighted.has(o.id)?"hot":"")}>{Array.from({length:Math.min(o.count,60)},(_,i)=><i key={i}/>)}</div>)}
    {frames.map(o=><div key={o.id} className={"dsl-tenframe "+(highlighted.has(o.id)?"hot":"")}>{Array.from({length:10},(_,i)=><i key={i} className={i<o.filled?"filled":""}/>)}</div>)}
    {lines.map(o=><NumberLine key={o.id} o={o} hot={highlighted.has(o.id)}/>)}
    {bars.map(o=><div key={o.id} className={"dsl-bar-row "+(highlighted.has(o.id)?"hot":"")}><span>{o.label||o.id}</span><i style={{width:String(Math.max(8,Math.abs(o.value)/maxBar*100))+"%"}}/><b>{o.value}</b></div>)}
    <Geometry objects={objects} highlighted={highlighted} rotations={rotations}/>
    {dice.map(o=><div key={o.id} className={"dsl-dicepair "+(highlighted.has(o.id)?"hot":"")}><div><i>{o.a}</i><span>+</span><i>{o.b}</i></div><b>{o.label||String(o.a+o.b)}</b></div>)}
    {texts.map(o=><div key={o.id} className={(o.kind==="equation"?"dsl-equation":"dsl-text")+" "+(morphed.has(o.id)?"dsl-morphed":"")}>{o.text}</div>)}
    {!hasCube&&!objects.length&&<div className="solution-empty-visual"><span>🧩</span><strong>这一步由本地动画工人执行</strong><small>剧本已经锁定，渲染器不会修改数学关系。</small></div>}
  </div>;
}
