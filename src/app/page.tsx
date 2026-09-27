import HomeClient from "@/components/HomeClient";
import { listExamProfiles } from "@/lib/question-bank";

export const dynamic = "force-dynamic";
export default function Home(){
  const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  return <HomeClient exams={listExamProfiles()} today={today}/>;
}
