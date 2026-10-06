"use client";

import type { ArithmeticAnswerKind } from "@/lib/arithmetic-answer";
import { formatArithmeticDisplay } from "@/lib/arithmetic-display";
import { mathInputKeys,normalizeArithmeticInput } from "@/lib/arithmetic-input";

function MathPreview({raw,kind}:{raw:string;kind:ArithmeticAnswerKind|undefined}){
 const normalized=normalizeArithmeticInput(raw);
 if(!normalized)return null;
 if(kind==="fraction"){
  const m=normalized.match(/^([+-]?\d+)\/([+-]?\d+)$/);
  if(m)return <span className="math-preview-fraction" aria-label={formatArithmeticDisplay(normalized)}><span>{m[1]}</span><span>{m[2]}</span></span>;
 }
 if(kind==="pi"){
  const m=normalized.replace(/pi/gi,"π").match(/^([+-]?\d*)π(?:\/(\d+))?$/);
  if(m){
   const coefficient=m[1]&&m[1]!=="1"?(m[1]==="-1"?"−":m[1]):"";
   const numerator=<span>{coefficient}π</span>;
   return m[2]?<span className="math-preview-fraction" aria-label={formatArithmeticDisplay(normalized)}><span>{numerator}</span><span>{m[2]}</span></span>:numerator;
  }
 }
 if(kind==="radical"){
  const m=normalized.replace(/sqrt\((\d+)\)/gi,"√$1").match(/^([+-]?\d*)√(\d+)(?:\/(\d+))?$/);
  if(m){
   const coefficient=m[1]&&m[1]!=="1"?(m[1]==="-1"?"−":m[1]):"";
   const radical=<span className="math-preview-radical"><span>{coefficient}</span><span className="root-sign">√</span><span className="radicand">{m[2]}</span></span>;
   return m[3]?<span className="math-preview-fraction"><span>{radical}</span><span>{m[3]}</span></span>:radical;
  }
 }
 return <span>{formatArithmeticDisplay(normalized)}</span>;
}

export default function ArithmeticMathInputPad({
 raw,kind,onInsert,onBackspace,onSubmit,disabled,labels,
}:{
 raw:string;
 kind:ArithmeticAnswerKind|undefined;
 onInsert:(value:string,timeStamp:number)=>void;
 onBackspace:()=>void;
 onSubmit:(timeStamp:number)=>void;
 disabled?:boolean;
 labels:{preview:string;backspace:string;submit:string};
}){
 const keys=mathInputKeys(kind);
 return <div className="math-input-assistant">
   {raw&&<div className="math-answer-preview" aria-live="polite"><small>{labels.preview}</small><strong><MathPreview raw={raw} kind={kind}/></strong></div>}
   <div className={"symbolic-math-keypad kind-"+(kind||"number")}>
    {keys.map((key,i)=><button type="button" key={key.label+"-"+i} disabled={disabled} onClick={e=>onInsert(key.insert,e.timeStamp)}>{key.label}</button>)}
    <button type="button" className="key-back" disabled={disabled||!raw} onClick={onBackspace} aria-label={labels.backspace}>⌫</button>
    <button type="button" className="key-enter" disabled={disabled||!raw.trim()} onClick={e=>onSubmit(e.timeStamp)}>{labels.submit}</button>
   </div>
 </div>;
}
