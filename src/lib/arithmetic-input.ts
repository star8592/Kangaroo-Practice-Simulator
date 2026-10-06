import type { ArithmeticAnswerKind, ArithmeticAnswerSpec } from "./arithmetic-answer";
import { isEquivalentArithmeticAnswer,numericAnswerValue } from "./arithmetic-answer";

export type ArithmeticAnswerAssessment =
  | {status:"correct"}
  | {status:"needs_simplification"}
  | {status:"incorrect"};

export function normalizeArithmeticInput(raw:string):string{
  let text=String(raw??"")
    .replace(/²/g,"^2")
    .replace(/³/g,"^3")
    .replace(/⁄/g,"/")
    .replace(/[−–—]/g,"-")
    .replace(/×/g,"*")
    .replace(/÷/g,"/")
    .replace(/根号/g,"√")
    .replace(/平方/g,"^2")
    .replace(/立方/g,"^3");
  text=text.normalize("NFKC")
    .replace(/[﹣－]/g,"-")
    .replace(/[／]/g,"/")
    .replace(/[＊]/g,"*")
    .replace(/[（]/g,"(")
    .replace(/[）]/g,")")
    .replace(/[，]/g,",")
    .replace(/\s+/g,"");
  return text;
}

export function assessArithmeticAnswer(spec:ArithmeticAnswerSpec,raw:string):ArithmeticAnswerAssessment{
  const normalized=normalizeArithmeticInput(raw);
  if(isEquivalentArithmeticAnswer(spec,normalized))return{status:"correct"};
  if(spec.requireSimplified){
    if(isEquivalentArithmeticAnswer({...spec,requireSimplified:false},normalized)){
      return{status:"needs_simplification"};
    }
    if(spec.answerKind==="fraction"){
      const got=numericAnswerValue(normalized),want=numericAnswerValue(String(spec.answer));
      if(got!==null&&want!==null&&Math.abs(got-want)<1e-9)return{status:"needs_simplification"};
    }
  }
  return{status:"incorrect"};
}

export type MathInputKey={label:string;insert:string};
export function mathInputKeys(kind:ArithmeticAnswerKind|undefined):MathInputKey[]{
  if(kind==="fraction")return[
    {label:"7",insert:"7"},{label:"8",insert:"8"},{label:"9",insert:"9"},
    {label:"4",insert:"4"},{label:"5",insert:"5"},{label:"6",insert:"6"},
    {label:"1",insert:"1"},{label:"2",insert:"2"},{label:"3",insert:"3"},
    {label:"−",insert:"-"},{label:"0",insert:"0"},{label:"a/b",insert:"/"},
  ];
  if(kind==="radical")return[
    {label:"7",insert:"7"},{label:"8",insert:"8"},{label:"9",insert:"9"},
    {label:"4",insert:"4"},{label:"5",insert:"5"},{label:"6",insert:"6"},
    {label:"1",insert:"1"},{label:"2",insert:"2"},{label:"3",insert:"3"},
    {label:"−",insert:"-"},{label:"0",insert:"0"},{label:"√",insert:"√"},
    {label:"a/b",insert:"/"},
  ];
  if(kind==="expression")return[
    {label:"7",insert:"7"},{label:"8",insert:"8"},{label:"9",insert:"9"},{label:"x",insert:"x"},
    {label:"4",insert:"4"},{label:"5",insert:"5"},{label:"6",insert:"6"},{label:"²",insert:"^2"},
    {label:"1",insert:"1"},{label:"2",insert:"2"},{label:"3",insert:"3"},{label:"(",insert:"("},
    {label:"0",insert:"0"},{label:"+",insert:"+"},{label:"−",insert:"-"},{label:")",insert:")"},
    {label:"×",insert:"*"},{label:"÷",insert:"/"},
  ];
  return[];
}
