import HomeLanguageBridge from "@/components/HomeLanguageBridge";
import { listTrainingExamProfiles } from "@/lib/training-question-bank";

export const dynamic = "force-dynamic";

export default function CompetitionsPage(){
  const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  return <HomeLanguageBridge exams={listTrainingExamProfiles()} today={today}/>;
}
