import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {SESSION_COOKIE,userFromSessionToken,isAdmin} from "@/lib/auth";
import SourceReviewDashboard from "@/components/SourceReviewDashboard";
export const dynamic="force-dynamic";
export default async function Page(){
  const cookie=await cookies();
  const user=userFromSessionToken(cookie.get(SESSION_COOKIE)?.value);
  if(!user)redirect("/login?next=/admin/competition-source-watch");
  if(!isAdmin(user))redirect("/");
  return <SourceReviewDashboard/>;
}
