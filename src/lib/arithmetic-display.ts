const SUPERSCRIPT: Record<string,string> = {
  "0":"⁰","1":"¹","2":"²","3":"³","4":"⁴","5":"⁵","6":"⁶","7":"⁷","8":"⁸","9":"⁹","+":"⁺","-":"⁻",
};
const SUBSCRIPT: Record<string,string> = {
  "0":"₀","1":"₁","2":"₂","3":"₃","4":"₄","5":"₅","6":"₆","7":"₇","8":"₈","9":"₉","+":"₊","-":"₋",
};

const mapDigits=(value:string,table:Record<string,string>) =>
  [...value].map(ch=>table[ch]??ch).join("");

export const toSuperscript=(value:string|number)=>mapDigits(String(value),SUPERSCRIPT);
export const toSubscript=(value:string|number)=>mapDigits(String(value),SUBSCRIPT);

/**
 * Presentation-only normalization for generated calculation prompts.
 * Keep the stored/generated expression unchanged for grading; only convert
 * programming-style notation into conventional mathematical typography.
 */
export function formatArithmeticDisplay(value:string|number):string{
  let text=String(value ?? "");
  text=text
    .replace(/sqrt\(([^()]+)\)/gi,"√($1)")
    .replace(/log_(\d+)\s*\(/gi,(_,base:string)=>`log${toSubscript(base)}(`)
    .replace(/\bC\((\d+)\s*,\s*(\d+)\)/g,(_,n:string,k:string)=>`C${toSubscript(n)}${toSuperscript(k)}`)
    .replace(/\^(-?\d+)/g,(_,power:string)=>toSuperscript(power))
    .replace(/\b([aS])(\d+)\b/g,(_,symbol:string,index:string)=>`${symbol}${toSubscript(index)}`)
    .replace(/<=/g,"≤")
    .replace(/>=/g,"≥")
    .replace(/!=/g,"≠")
    .replace(/\*/g,"×")
    .replace(/(?<=\d)\/(?=\d)/g,"⁄");
  return text;
}
