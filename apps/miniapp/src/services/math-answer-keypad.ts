/**
 * Taro/WeChat Mini Program implementation of the same answer-kind keypad as
 * src/lib/arithmetic-input.ts. CI verifies every required key matches Web.
 */
export type MathAnswerKind = 'number'|'fraction'|'radical'|'pi'|'expression'
export type AnswerKey = { label:string; insert:string }

export function mathAnswerKeys(kind:MathAnswerKind='number'):AnswerKey[]{
 const digits=[
  {label:'7',insert:'7'},{label:'8',insert:'8'},{label:'9',insert:'9'},
  {label:'4',insert:'4'},{label:'5',insert:'5'},{label:'6',insert:'6'},
  {label:'1',insert:'1'},{label:'2',insert:'2'},{label:'3',insert:'3'},
  {label:'−',insert:'-'},{label:'0',insert:'0'},{label:'.',insert:'.'},
 ]
 const fraction={label:'分数 a/b',insert:'/'}
 switch(kind){
 case 'fraction':return [...digits,fraction]
 case 'radical':return [...digits,{label:'√',insert:'√'},fraction]
 case 'pi':return [...digits,{label:'π',insert:'π'},fraction]
 case 'expression':return [...digits,{label:'x',insert:'x'},{label:'²',insert:'^2'},
  {label:'^',insert:'^'},{label:'(',insert:'('},{label:')',insert:')'},
  {label:'+',insert:'+'},{label:'×',insert:'*'},{label:'÷',insert:'/'}]
 default:return [...digits,fraction]
 }
}

export function editMathAnswer(input:string,insert:string,cursor:number) {
 const start=Math.max(0,Math.min(input.length,Number.isFinite(cursor)?Math.floor(cursor):input.length))
 const value=(input.slice(0,start)+insert+input.slice(start)).slice(0,100)
 return {value,cursor:Math.min(start+insert.length,value.length)}
}
export function backspaceMathAnswer(input:string,cursor:number) {
 const index=Math.max(0,Math.min(input.length,Number.isFinite(cursor)?Math.floor(cursor):input.length))
 const begin=Math.max(0,index-1)
 return {value:input.slice(0,begin)+input.slice(index),cursor:begin}
}
