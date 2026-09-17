import { cookies } from "next/headers";import { redirect } from "next/navigation";import ReviewClient from "@/components/ReviewClient";import { SESSION_COOKIE,userFromSessionToken } from "@/lib/auth";
export default async function ReviewPage(){const jar=await cookies();if(!userFromSessionToken(jar.get(SESSION_COOKIE)?.value))redirect('/login?next=/review');return <ReviewClient/>}
