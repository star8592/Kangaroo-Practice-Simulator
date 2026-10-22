import {notFound,redirect} from "next/navigation";
import {cookies} from "next/headers";
import ExamClient from "@/components/ExamClient";
import {isExamBundleTrainingReady,loadTrainingExamBundle,trainingQuestions} from "@/lib/training-question-bank";
import {SESSION_COOKIE,userFromSessionToken} from "@/lib/auth";
import {PARENT_SESSION_COOKIE,parentFromSessionToken} from "@/lib/parent-auth";
import {canAccessExamProfile} from "@/lib/exam-access";

export default async function ExamPage({params}:{params:Promise<{examId:string}>}){
  const {examId}=await params;
  let bundle:ReturnType<typeof loadTrainingExamBundle>;
  try {
    bundle=loadTrainingExamBundle(examId);
    if(!isExamBundleTrainingReady(bundle))notFound();
  } catch {notFound()}
  const jar=await cookies();
  const user=userFromSessionToken(jar.get(SESSION_COOKIE)?.value);
  if(!canAccessExamProfile(user,bundle.profile)){
    // Any signed-in WeChat household has the same free exam rights as a
    // student account; create its stable provisional learner once, silently.
    if(parentFromSessionToken(jar.get(PARENT_SESSION_COOKIE)?.value)){
      redirect("/api/auth/guest/start?next="+encodeURIComponent("/exam/"+examId));
    }
    redirect("/login?next="+encodeURIComponent("/exam/"+examId));
  }
  return <ExamClient examId={examId} user={user} initialProfile={bundle.profile} initialQuestions={trainingQuestions(bundle.questions)}/>;
}
