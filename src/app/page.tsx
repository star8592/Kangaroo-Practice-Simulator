import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import HomeClient from "@/components/HomeClient";
import { listTrainingExamProfiles } from "@/lib/training-question-bank";
import { SESSION_COOKIE,userFromSessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";
export default async function Home(){
  const jar=await cookies();
  if(!userFromSessionToken(jar.get(SESSION_COOKIE)?.value))redirect("/login?next=/");
  const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  return <HomeClient exams={listTrainingExamProfiles()} today={today}/>;
}
