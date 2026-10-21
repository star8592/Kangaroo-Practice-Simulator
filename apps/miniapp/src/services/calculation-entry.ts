export const CALC_START_INTENT_KEY='socthink_calc_start_v1'
export const CALC_GRADE_KEY='socthink_calc_grade_v1'
export const GRADE_LABELS=Array.from({length:12},(_,i)=>i<6?`小学${i+1}年级`:i<9?`初中${i-5}年级`:`高中${i-8}年级`)
export const validGrade=(x:unknown):number|null=>{const n=Number(x);return x!==null&&x!==undefined&&x!==''&&Number.isInteger(n)&&n>=1&&n<=12?n:null}
export function preferredGrade(user:unknown,stored:unknown){const p=user&&typeof user==='object'?(user as {grade?:unknown}).grade:null;return validGrade(p)??validGrade(stored)}
export function readStartIntent(x:unknown,now=Date.now()):number|null {
 if(!x||typeof x!=='object')return null
 const v=x as {grade?:unknown;at?:unknown}
 const g=validGrade(v.grade)
 return g!==null&&typeof v.at==='number'&&now>=v.at&&now-v.at<=120000?g:null
}
