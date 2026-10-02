import {randomInt} from "node:crypto";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import StructureDiscoveryClient from "@/components/StructureDiscoveryClient";
import {SESSION_COOKIE,userFromSessionToken} from "@/lib/auth";
export default async function Page({params}:{params:Promise<{grade:string}>}){const jar=await cookies();const user=userFromSessionToken(jar.get(SESSION_COOKIE)?.value);if(!user)redirect('/login');const p=await params;const grade=Math.min(6,Math.max(1,Number(p.grade)||1)) as 1|2|3|4|5|6;return <StructureDiscoveryClient key={grade} grade={grade} seed={randomInt(0,2147483647)}/>}
