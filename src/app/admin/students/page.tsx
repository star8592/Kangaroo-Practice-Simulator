import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import AdminStudents from "@/components/AdminStudents";
import {isAdmin,SESSION_COOKIE,userFromSessionToken} from "@/lib/auth";
export default async function AdminStudentsPage(){const jar=await cookies(),u=userFromSessionToken(jar.get(SESSION_COOKIE)?.value);if(!u)redirect('/login?next=/admin/students');if(!isAdmin(u))redirect('/');return <AdminStudents/>}
