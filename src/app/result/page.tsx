import { cookies } from "next/headers";import { redirect } from "next/navigation";import ResultClient from "@/components/ResultClient";import { SESSION_COOKIE,userFromSessionToken } from "@/lib/auth";
export default async function ResultPage(){const jar=await cookies();if(!userFromSessionToken(jar.get(SESSION_COOKIE)?.value))redirect('/login?next=/result');return <ResultClient/>}
