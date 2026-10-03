import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import HomeLanguageBridge from "@/components/HomeLanguageBridge";
import { listTrainingExamProfiles } from "@/lib/training-question-bank";
import { SESSION_COOKIE,userFromSessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CompetitionsPage(){
  const jar=await cookies();
  if(!userFromSessionToken(jar.get(SESSION_COOKIE)?.value))redirect("/login?next=/competitions");
  const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  return <HomeLanguageBridge exams={listTrainingExamProfiles()} today={today}/>;
}
