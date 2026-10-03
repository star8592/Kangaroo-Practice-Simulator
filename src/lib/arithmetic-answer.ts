export type ArithmeticAnswerKind="number"|"fraction"|"radical"|"expression";
export type ArithmeticAnswerValue=number|string;
export type ArithmeticAnswerSpec={answer:ArithmeticAnswerValue;answerKind?:ArithmeticAnswerKind;requireSimplified?:boolean};

const EPS=1e-9;
const gcd=(a:number,b:number)=>{a=Math.abs(Math.trunc(a));b=Math.abs(Math.trunc(b));while(b)[a,b]=[b,a%b];return a||1};
const clean=(raw:string)=>raw.trim().replace(/[−–—]/g,"-").replace(/×/g,"*").replace(/÷/g,"/").replace(/\s+/g,"");

export function parseFraction(raw:string){
 const s=clean(raw),m=s.match(/^([+-]?\d+)\/([+-]?\d+)$/);if(!m)return null;
 let num=Number(m[1]),den=Number(m[2]);if(!den)return null;if(den<0){num=-num;den=-den}
 const d=gcd(num,den);return{num,den,value:num/den,reducedNum:num/d,reducedDen:den/d,simplified:d===1};
}
export function numericAnswerValue(raw:string){
 const f=parseFraction(raw);if(f)return f.value;const x=Number(clean(raw));return Number.isFinite(x)?x:null;
}

type Radical={num:number;den:number;radicand:number;simplifiedNum:number;simplifiedDen:number;simplifiedRadicand:number;isSimplified:boolean};
function simplifyRadical(num:number,den:number,radicand:number){let outside=1,inside=radicand;for(let k=2;k*k<=inside;k++){while(inside%(k*k)===0){outside*=k;inside/=k*k}}num*=outside;const d=gcd(num,den);return{num:num/d,den:den/d,radicand:inside}}
function parseRadical(raw:string):Radical|null{
 const s=clean(raw).replace(/sqrt\((\d+)\)/gi,"√$1").replace(/\*/g,"");
 const m=s.match(/^([+-]?)(\d*)√(\d+)(?:\/(\d+))?$/);if(!m)return null;
 const sign=m[1]==="-"?-1:1,num=sign*(m[2]?Number(m[2]):1),radicand=Number(m[3]),den=m[4]?Number(m[4]):1;if(!den||!Number.isInteger(radicand)||radicand<0)return null;
 const reduced=simplifyRadical(num,den,radicand);return{num,den,radicand,simplifiedNum:reduced.num,simplifiedDen:reduced.den,simplifiedRadicand:reduced.radicand,isSimplified:reduced.radicand===radicand&&gcd(num,den)===1};
}

type Token={kind:"num"|"x"|"op"|"lp"|"rp";value:string};
type Poly=number[];
function tokenizeExpression(raw:string):Token[]|null{
 const s=clean(raw).replace(/²/g,"^2").replace(/³/g,"^3");const base:Token[]=[];
 for(let i=0;i<s.length;){const ch=s[i];if(/[0-9.]/.test(ch)){let j=i+1;while(j<s.length&&/[0-9.]/.test(s[j]))j++;const v=s.slice(i,j);if(!/^\d*\.?\d+$/.test(v)||v===".")return null;base.push({kind:"num",value:v});i=j;continue}if(ch==="x"||ch==="X"){base.push({kind:"x",value:"x"});i++;continue}if("+-*/^".includes(ch)){base.push({kind:"op",value:ch});i++;continue}if(ch==="("){base.push({kind:"lp",value:ch});i++;continue}if(ch===")"){base.push({kind:"rp",value:ch});i++;continue}return null}
 const out:Token[]=[];for(const t of base){const p=out[out.length-1];if(p&&(["num","x","rp"].includes(p.kind))&&(["x","lp"].includes(t.kind)))out.push({kind:"op",value:"*"});out.push(t)}return out;
}
const trimPoly=(p:Poly)=>{const out=[...p];while(out.length>1&&Math.abs(out[out.length-1])<EPS)out.pop();return out};
const addPoly=(a:Poly,b:Poly,sign=1)=>trimPoly(Array.from({length:Math.max(a.length,b.length)},(_,i)=>(a[i]||0)+sign*(b[i]||0)));
const mulPoly=(a:Poly,b:Poly)=>{const out=Array(a.length+b.length-1).fill(0);for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++)out[i+j]+=a[i]*b[j];return trimPoly(out)};
const divPoly=(a:Poly,b:Poly)=>b.length===1&&Math.abs(b[0])>EPS?a.map(x=>x/b[0]):null;
function parsePolynomial(raw:string):Poly|null{
 const tokens=tokenizeExpression(raw);if(!tokens)return null;let i=0;const peek=()=>tokens[i];const take=()=>tokens[i++];
 const primary=():Poly|null=>{const t=take();if(!t)return null;if(t.kind==="num")return[Number(t.value)];if(t.kind==="x")return[0,1];if(t.kind==="lp"){const v=expr();if(peek()?.kind!=="rp")return null;take();return v}return null};
 const unary=():Poly|null=>{if(peek()?.kind==="op"&&(peek().value==="+"||peek().value==="-")){const op=take().value,v=unary();return v?(op==="-"?v.map(x=>-x):v):null}return primary()};
 const power=():Poly|null=>{let left=unary();if(!left)return null;if(peek()?.kind==="op"&&peek().value==="^"){take();const right=unary();if(!right||right.length!==1||!Number.isInteger(right[0])||right[0]<0||right[0]>4)return null;let out:Poly=[1];for(let k=0;k<right[0];k++)out=mulPoly(out,left);left=out}return left};
 const term=():Poly|null=>{let left=power();if(!left)return null;while(peek()?.kind==="op"&&(peek().value==="*"||peek().value==="/")){const op=take().value,right=power();if(!right)return null;left=op==="*"?mulPoly(left,right):divPoly(left,right);if(!left)return null}return left};
 const expr=():Poly|null=>{let left=term();if(!left)return null;while(peek()?.kind==="op"&&(peek().value==="+"||peek().value==="-")){const op=take().value,right=term();if(!right)return null;left=addPoly(left,right,op==="+"?1:-1)}return left};
 const result=expr();return result&&i===tokens.length?trimPoly(result):null;
}
function samePoly(a:Poly|null,b:Poly|null){if(!a||!b||a.length!==b.length)return false;return a.every((x,i)=>Math.abs(x-b[i])<EPS)}

export function isEquivalentArithmeticAnswer(spec:ArithmeticAnswerSpec,raw:string){
 if(!raw.trim())return false;const kind=spec.answerKind||(typeof spec.answer==="number"?"number":"expression");
 if(kind==="number"){const got=numericAnswerValue(raw),want=typeof spec.answer==="number"?spec.answer:numericAnswerValue(String(spec.answer));return got!==null&&want!==null&&Math.abs(got-want)<EPS}
 if(kind==="fraction"){const got=parseFraction(raw),want=parseFraction(String(spec.answer));if(!got||!want)return false;if(spec.requireSimplified&&!got.simplified)return false;return got.reducedNum===want.reducedNum&&got.reducedDen===want.reducedDen}
 if(kind==="radical"){const got=parseRadical(raw),want=parseRadical(String(spec.answer));if(!got||!want)return false;if(spec.requireSimplified&&!got.isSimplified)return false;return got.simplifiedNum===want.simplifiedNum&&got.simplifiedDen===want.simplifiedDen&&got.simplifiedRadicand===want.simplifiedRadicand}
 return samePoly(parsePolynomial(raw),parsePolynomial(String(spec.answer)));
}
