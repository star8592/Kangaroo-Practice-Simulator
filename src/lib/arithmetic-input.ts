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
    .replace(/立方/g,"^3")
    .replace(/pi/gi,"π");
  text=text.normalize("NFKC")
    .replace(/[﹣－]/g,"-")
    .replace(/[／]/g,"/")
    .replace(/[＊]/g,"*")
    .replace(/[（]/g,"(")
    .replace(/[）]/g,")")
    .replace(/[，]/g,",")
    .replace(/pi/gi,"π")
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

/**
 * Answer-kind driven keypad. Every type has '-' including ordinary integer
 * answers: a signed result must never become impossible on touch devices.
 * Fractions typed into numeric fields are accepted by numericAnswerValue.
 */
export function mathInputKeys(kind:ArithmeticAnswerKind|undefined):MathInputKey[]{
 const digits:MathInputKey[]=[
  {label:"7",insert:"7"},{label:"8",insert:"8"},{label:"9",insert:"9"},
  {label:"4",insert:"4"},{label:"5",insert:"5"},{label:"6",insert:"6"},
  {label:"1",insert:"1"},{label:"2",insert:"2"},{label:"3",insert:"3"},
  {label:"−",insert:"-"},{label:"0",insert:"0"},{label:".",insert:"."},
 ];
 const fraction={label:"分数 a/b",insert:"/"};
 if(kind==="fraction")return [...digits,fraction];
 if(kind==="radical")return [...digits,{label:"√",insert:"√"},fraction];
 if(kind==="pi")return [...digits,{label:"π",insert:"π"},fraction];
 if(kind==="expression")return [
  ...digits,{label:"x",insert:"x"},{label:"²",insert:"^2"},
  {label:"^",insert:"^"},{label:"(",insert:"("},{label:")",insert:")"},
  {label:"+",insert:"+"},{label:"×",insert:"*"},{label:"÷",insert:"/"},
 ];
 return [...digits,fraction];
}
