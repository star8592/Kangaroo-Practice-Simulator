import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE,userFromSessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home(){
  const jar=await cookies();
  if(!userFromSessionToken(jar.get(SESSION_COOKIE)?.value))redirect("/login?next=/arithmetic");
  redirect("/arithmetic");
}
