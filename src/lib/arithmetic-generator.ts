import { GRADE_PROFILES, type ArithmeticGrade, type CleverNode, type MentalStrategy } from "./arithmetic";
export type ArithmeticItem={id:string;grade:ArithmeticGrade;skillId:string;prompt:string;answer:number;strategy:MentalStrategy;strategyNode?:CleverNode;expectedMs:number;difficulty:number;meta:Record<string,number|string>};
function rng(seed:number){let a=seed>>>0;return()=>{a|=0;a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}}
const pick=<T,>(r:()=>number,x:T[])=>x[Math.floor(r()*x.length)];
const n=(r:()=>number,a:number,b:number)=>Math.floor(r()*(b-a+1))+a;
const NODE_SKILL:Partial<Record<ArithmeticGrade,Partial<Record<CleverNode,string>>>>={
  1:{make10:"add20",bridge10:"sub20",double:"add20",near_double:"add20",fact_recall:"sub20"},
  2:{add_compensation:"add100",sub_compensation:"sub100",split_place:"add100",fact_recall:"times",place_value:"add100"},
  3:{add_compensation:"addsub1000",split_place:"addsub1000",distributive:"mul1",friendly25:"friendly",friendly50:"friendly",friendly125:"friendly",fact_recall:"div1",place_value:"addsub1000"},
  4:{mul_compensation:"laws",split_place:"laws",distributive:"mul2",friendly25:"friendly",friendly50:"friendly",friendly125:"friendly",fact_recall:"div2",place_value:"div2"},
  5:{add_compensation:"decimal",split_place:"decimal",distributive:"laws",friendly25:"laws",friendly50:"laws",friendly125:"laws",fact_recall:"fraction",place_value:"decimal"},
  6:{mul_compensation:"laws",split_place:"fraction",distributive:"laws",friendly25:"laws",friendly50:"laws",friendly125:"laws",fact_recall:"percent",place_value:"percent"},
};
function targetItem(grade:ArithmeticGrade,node:CleverNode,r:()=>number,seed:number,index:number):ArithmeticItem|null{
  const skillId=NODE_SKILL[grade]?.[node]; if(!skillId)return null; const s=GRADE_PROFILES[grade].skills.find(x=>x.id===skillId); if(!s)return null;
  let prompt="",answer=0,strategy:MentalStrategy="fact_recall";
  if(node==="make10"){const a=n(r,2,9),b=n(r,2,9);const x=Math.min(9,a),y=Math.max(2,11-x+b%5);prompt=`${x} + ${y} = ?`;answer=x+y;strategy="make10"}
  else if(node==="bridge10"){const a=n(r,12,19),b=n(r,a-9,9);prompt=`${a} − ${b} = ?`;answer=a-b;strategy="bridge10"}
  else if(node==="double"){const a=n(r,3,9);prompt=`${a} + ${a} = ?`;answer=a*2;strategy="double"}
  else if(node==="near_double"){const a=n(r,3,8),b=a+1;prompt=`${a} + ${b} = ?`;answer=a+b;strategy="near_double"}
  else if(node==="add_compensation"){if(grade>=5){const a=n(r,12,89)/10,b=pick(r,[1.9,2.9,3.9,4.9]);prompt=`${a.toFixed(1)} + ${b.toFixed(1)} = ?`;answer=+(a+b).toFixed(1)}else{const a=grade===2?n(r,21,69):n(r,120,799),b=pick(r,grade===2?[19,29,39]:[99,199]);prompt=`${a} + ${b} = ?`;answer=a+b}strategy="compensation"}
  else if(node==="sub_compensation"){const b=pick(r,[19,29,39]),a=n(r,Math.max(45,b+10),99);prompt=`${a} − ${b} = ?`;answer=a-b;strategy="compensation"}
  else if(node==="mul_compensation"){const a=n(r,12,79),b=pick(r,[9,99,101]);prompt=`${a} × ${b} = ?`;answer=a*b;strategy="compensation"}
  else if(node==="split_place"){if(grade<=3){const a=grade===2?n(r,31,89):n(r,120,790),b=grade===2?n(r,12,39):pick(r,[30,40,60,70]);prompt=`${a} + ${b} = ?`;answer=a+b}else{const a=n(r,12,49),b=n(r,12,29);prompt=`${a} × ${b} = ?`;answer=a*b}strategy="split"}
  else if(node==="distributive"){const a=n(r,12,59),b=grade===3?n(r,3,9):pick(r,[12,18,21,24]);prompt=`${a} × ${b} = ?`;answer=a*b;strategy="distributive"}
  else if(node==="friendly25"){const a=grade>=5?2.5:25,b=pick(r,[4,8,12,16,20,24]);prompt=`${a} × ${b} = ?`;answer=a*b;strategy="friendly_25_50_125"}
  else if(node==="friendly50"){const a=grade>=5?5:50,b=pick(r,[2,4,6,8,12,18]);prompt=`${a} × ${b} = ?`;answer=a*b;strategy="friendly_25_50_125"}
  else if(node==="friendly125"){const a=grade>=5?12.5:125,b=pick(r,[8,16,24,32]);prompt=`${a} × ${b} = ?`;answer=a*b;strategy="friendly_25_50_125"}
  else if(node==="fact_recall"){if(grade<=2){const a=n(r,2,9),b=n(r,2,9);prompt=`${a} × ${b} = ?`;answer=a*b}else if(grade===3){const d=n(r,2,9),q=n(r,4,18);prompt=`${d*q} ÷ ${d} = ?`;answer=q}else if(grade===4){const d=pick(r,[10,20,25,50]),q=n(r,4,30);prompt=`${d*q} ÷ ${d} = ?`;answer=q}else{const pct=pick(r,[10,20,25,50]),base=pick(r,[40,80,120,160,200]);prompt=`${base} 的 ${pct}% = ?`;answer=base*pct/100}strategy="fact_recall"}
  else if(node==="place_value"){const a=grade===2?n(r,21,79):n(r,120,780),b=pick(r,[10,20,50,100,200]);prompt=`${a} + ${b} = ?`;answer=a+b;strategy="place_value"}
  else return null;
  const difficulty=Math.min(5,1+Math.floor(s.targetMs/2500));return{id:`g${grade}-${seed}-${index}-node-${node}`,grade,skillId,prompt,answer,strategy,strategyNode:node,expectedMs:s.targetMs,difficulty,meta:{seed,index,node}};
}

function probePair(grade:ArithmeticGrade,node:CleverNode,r:()=>number,seed:number,pairNo:number):ArithmeticItem[]{
  const skillId=NODE_SKILL[grade]?.[node];if(!skillId)return[];const skill=GRADE_PROFILES[grade].skills.find(x=>x.id===skillId);if(!skill)return[];
  let controlPrompt="",strategyPrompt="",controlAnswer=0,strategyAnswer=0,controlStrategy:MentalStrategy="fact_recall",strategy:MentalStrategy="compensation";
  if(node==="near_double"){const a=n(r,4,8);controlPrompt=`${a} + ${a} = ?`;strategyPrompt=`${a} + ${a+1} = ?`;controlAnswer=a*2;strategyAnswer=a*2+1;controlStrategy="double";strategy="near_double"}
  else if(node==="add_compensation"&&grade===2){const a=n(r,31,68);controlPrompt=`${a} + 30 = ?`;strategyPrompt=`${a} + 29 = ?`;controlAnswer=a+30;strategyAnswer=a+29;controlStrategy="place_value"}
  else if(node==="sub_compensation"&&grade===2){const a=n(r,61,98);controlPrompt=`${a} − 30 = ?`;strategyPrompt=`${a} − 29 = ?`;controlAnswer=a-30;strategyAnswer=a-29;controlStrategy="place_value"}
  else if(node==="add_compensation"&&grade===3){const a=n(r,220,760);controlPrompt=`${a} + 100 = ?`;strategyPrompt=`${a} + 99 = ?`;controlAnswer=a+100;strategyAnswer=a+99;controlStrategy="place_value"}
  else if(node==="mul_compensation"&&(grade===4||grade===6)){const a=n(r,12,49),base=grade===4?10:100,near=base-1;controlPrompt=`${a} × ${base} = ?`;strategyPrompt=`${a} × ${near} = ?`;controlAnswer=a*base;strategyAnswer=a*near;controlStrategy="place_value"}
  else if(node==="add_compensation"&&grade===5){const a=n(r,21,79)/10;controlPrompt=`${a.toFixed(1)} + 3.0 = ?`;strategyPrompt=`${a.toFixed(1)} + 2.9 = ?`;controlAnswer=+(a+3).toFixed(1);strategyAnswer=+(a+2.9).toFixed(1);controlStrategy="place_value"}
  else return[];
  const family=`g${grade}-${node}-${seed}-${pairNo}`;const common={grade,skillId,expectedMs:skill.targetMs,difficulty:Math.min(5,1+Math.floor(skill.targetMs/2500))};
  return[
    {...common,id:`${family}-control`,prompt:controlPrompt,answer:controlAnswer,strategy:controlStrategy,meta:{seed,index:pairNo,probeFamily:family,probeRole:"control",probeNode:node}},
    {...common,id:`${family}-strategy`,prompt:strategyPrompt,answer:strategyAnswer,strategy,strategyNode:node,meta:{seed,index:pairNo,probeFamily:family,probeRole:"strategy",probeNode:node}},
  ];
}

function diagnosticProbeNodes(grade:ArithmeticGrade):CleverNode[]{
  if(grade===1)return["near_double"];
  if(grade===2)return["add_compensation","sub_compensation"];
  if(grade===3)return["add_compensation"];
  if(grade===4)return["mul_compensation"];
  if(grade===5)return["add_compensation"];
  return["mul_compensation"];
}

export function injectDiagnosticProbes(items:ArithmeticItem[],grade:ArithmeticGrade,seed:number):ArithmeticItem[]{
  const r=rng(seed^0x51f15e);const copy=[...items];
  for(const node of diagnosticProbeNodes(grade)){
    const pairs=[...probePair(grade,node,r,seed,0),...probePair(grade,node,r,seed,1)];if(!pairs.length)continue;
    const skillId=pairs[0].skillId;const slots=copy.map((x,i)=>x.skillId===skillId?i:-1).filter(i=>i>=0).slice(0,pairs.length);
    if(slots.length<pairs.length)continue;slots.forEach((slot,i)=>copy[slot]=pairs[i]);
  }
  return copy;
}

export function generateDiagnosticSet(grade:ArithmeticGrade,count=20,seed=Date.now()):ArithmeticItem[]{
  return injectDiagnosticProbes(generateArithmeticSet(grade,count,seed,[],true,[]),grade,seed);
}

export function generateArithmeticSet(grade:ArithmeticGrade,count=20,seed=Date.now(),focusSkills:string[]=[],balanced=false,focusNodes:CleverNode[]=[]):ArithmeticItem[]{const r=rng(seed);const p=GRADE_PROFILES[grade];const bag=p.skills.flatMap(s=>Array.from({length:s.weight*(focusSkills.includes(s.id)?3:1)},()=>s));const balancedSkills=balanced?Array.from({length:count},(_,i)=>p.skills[i%p.skills.length]).sort(()=>r()-.5):[];const out:ArithmeticItem[]=[];
 for(let i=0;i<count;i++){if(focusNodes.length&&i<Math.ceil(count*.6)){const targeted=targetItem(grade,pick(r,focusNodes),r,seed,i);if(targeted){out.push(targeted);continue}}const s=balanced?balancedSkills[i]:pick(r,bag);let prompt="",answer=0,strategy=pick(r,s.strategies),difficulty=1;
 if(grade===1){if(s.id==="number10"){const a=n(r,1,9);prompt=`${a} + □ = 10`;answer=10-a;strategy="make10"}else if(s.id==="add20"){const a=n(r,2,9),b=n(r,2,9);prompt=`${a} + ${b} = ?`;answer=a+b;strategy=a+b>10?"make10":"fact_recall"}else{const a=n(r,11,20),b=n(r,1,9);prompt=`${a} − ${b} = ?`;answer=a-b;strategy=a-b<10?"bridge10":"fact_recall"}}
 else if(grade===2){if(s.id==="times"){const a=n(r,2,9),b=n(r,2,9);prompt=`${a} × ${b} = ?`;answer=a*b;strategy="fact_recall"}else if(s.id==="divide"){const b=n(r,2,9),q=n(r,2,9);prompt=`${b*q} ÷ ${b} = ?`;answer=q;strategy="fact_recall"}else{const a=n(r,20,89),b=n(r,5,39);if(s.id==="sub100"){const x=Math.max(a,b),y=Math.min(a,b);prompt=`${x} − ${y} = ?`;answer=x-y}else{prompt=`${a} + ${b} = ?`;answer=a+b}strategy=(a%10>=8||b%10>=8)?"compensation":"split"}}
 else if(grade===3){if(s.id==="mul1"){const a=n(r,12,49),b=n(r,2,9);prompt=`${a} × ${b} = ?`;answer=a*b;strategy="distributive"}else if(s.id==="div1"){const b=n(r,2,9),q=n(r,4,25);prompt=`${b*q} ÷ ${b} = ?`;answer=q;strategy="split"}else if(s.id==="friendly"){const base=pick(r,[25,50,125]),m=pick(r,[4,8,16]);prompt=`${base} × ${m} = ?`;answer=base*m;strategy="friendly_25_50_125"}else{const a=n(r,120,850),b=pick(r,[20,30,40,50,90,100]);prompt=`${a} + ${b} = ?`;answer=a+b;strategy="place_value"}}
 else if(grade===4){if(s.id==="friendly"){const a=pick(r,[25,50,125]),b=pick(r,[4,8,16,20,40]);prompt=`${a} × ${b} = ?`;answer=a*b;strategy="friendly_25_50_125"}else if(s.id==="div2"){const d=pick(r,[10,20,25,50]),q=n(r,4,40);prompt=`${d*q} ÷ ${d} = ?`;answer=q;strategy="place_value"}else{const a=n(r,12,99),b=pick(r,[9,11,19,21,99,101]);prompt=`${a} × ${b} = ?`;answer=a*b;strategy=b===9||b===11||b===99||b===101?"compensation":"distributive"}}
 else if(grade===5){if(s.id==="decimal"){const a=n(r,10,99)/10,b=n(r,10,99)/10;prompt=`${a.toFixed(1)} + ${b.toFixed(1)} = ?`;answer=+(a+b).toFixed(1);strategy="place_value"}else if(s.id==="fraction"){const d=pick(r,[2,4,5,10]),a=n(r,1,d-1),b=n(r,1,d-1);prompt=`${a}/${d} + ${b}/${d} = ?（填小数）`;answer=(a+b)/d;strategy="fact_recall"}else{const a=pick(r,[2.5,5,12.5,25]),b=pick(r,[4,8,16,20,40]);prompt=`${a} × ${b} = ?`;answer=a*b;strategy="friendly_25_50_125"}}
 else {if(s.id==="percent"){const pct=pick(r,[10,20,25,50,75]),base=pick(r,[40,80,120,160,200]);prompt=`${base} 的 ${pct}% = ?`;answer=base*pct/100;strategy="fact_recall"}else if(s.id==="fraction"){const d=pick(r,[2,3,4,5,6,8]),a=n(r,1,d-1),m=pick(r,[12,18,24,30,36,48]);prompt=`${m} × ${a}/${d} = ?`;answer=m*a/d;strategy="split"}else{const a=pick(r,[25,50,125]),b=pick(r,[8,16,24,32,40]);prompt=`${a} × ${b} = ?`;answer=a*b;strategy="friendly_25_50_125"}}
 difficulty=Math.min(5,1+Math.floor(s.targetMs/2500));out.push({id:`g${grade}-${seed}-${i}`,grade,skillId:s.id,prompt,answer,strategy,expectedMs:s.targetMs,difficulty,meta:{seed,index:i}})}return out;}
