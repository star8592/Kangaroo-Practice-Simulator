import { cookies } from "next/headers";
import { userFromSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { parentFromSessionToken, PARENT_SESSION_COOKIE } from "@/lib/parent-auth";
import { attachVerifiedBilling } from "@/lib/access-context-server";
import { effectivePlan, classifyStudentIdentity, type AccessContext } from "@/lib/access-policy";
import MembershipClient from "./MembershipClient";

export const dynamic = "force-dynamic";

export default async function MembershipPage({searchParams}:{searchParams:Promise<{identity?:string}>}) {
  const query=await searchParams;
  const jar = await cookies();
  const parent = parentFromSessionToken(jar.get(PARENT_SESSION_COOKIE)?.value);
  const student = userFromSessionToken(jar.get(SESSION_COOKIE)?.value);
  const preferParent = Boolean(parent && (query.identity==="parent" || !student || classifyStudentIdentity(student) === "guest"));
  const identity: AccessContext = preferParent && parent
    ? {kind:"parent",accountId:parent.id}
    : student ? {kind:classifyStudentIdentity(student),accountId:student.id}
    : parent ? {kind:"parent",accountId:parent.id}
    : {kind:"anonymous"};
  let plan = effectivePlan(identity);
  let available=true;
  try { plan=effectivePlan(await attachVerifiedBilling(identity)); }
  catch { available=false; }
  return <MembershipClient identity={identity.kind} plan={plan} ledgerAvailable={available}/>;
}
