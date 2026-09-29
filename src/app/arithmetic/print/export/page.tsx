import "../print.css";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import ArithmeticPrintClient from "@/components/ArithmeticPrintClient";
import { SESSION_COOKIE, userFromSessionToken } from "@/lib/auth";
import { GRADE_PROFILES, type ArithmeticGrade } from "@/lib/arithmetic";
import { loadArithmeticSessions } from "@/lib/arithmetic-session-store";
import type { ArithmeticPrintMode } from "@/lib/arithmetic-print";

function toInt(value:string|undefined,fallback:number,min:number,max:number){const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,Math.round(n))):fallback}
function toMode(value:string|undefined):ArithmeticPrintMode{return value==="manual"||value==="mixed"?value:"smart"}

export default async function ArithmeticPrintExport({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  const jar=await cookies();
  const user=userFromSessionToken(jar.get(SESSION_COOKIE)?.value);
  if(!user)notFound();
  const p=await searchParams;
  const grade=toInt(p.grade,user.grade,1,6) as ArithmeticGrade;
  const questions=toInt(p.questions,grade<=2?40:60,20,80);
  const sheets=toInt(p.sheets,5,1,20);
  const seed=toInt(p.seed,8592,1,2147483647);
  const mode=toMode(p.mode);
  const fallbackSkill=GRADE_PROFILES[grade].skills[0]?.id??"";
  const manualSkillId=GRADE_PROFILES[grade].skills.some(s=>s.id===p.manualSkillId)?p.manualSkillId!:fallbackSkill;
  return <ArithmeticPrintClient initialGrade={grade} initialSeed={seed} studentName={user.name} sessions={loadArithmeticSessions(user.id,500)} initialMode={mode} initialManualSkillId={manualSkillId} initialQuestions={questions} initialSheetCount={sheets} initialAnswers={p.answers!=="0"} exportMode/>;
}
