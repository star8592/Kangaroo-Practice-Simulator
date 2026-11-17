import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {canManagePlatform} from "@/lib/platform-admin-principal";
import SourceReviewDashboard from "@/components/SourceReviewDashboard";
export const dynamic="force-dynamic";
export default async function Page(){
  const cookie=await cookies();
  if(!canManagePlatform(cookie))redirect("/login?next=/admin/competition-source-watch");
  return <SourceReviewDashboard/>;
}
