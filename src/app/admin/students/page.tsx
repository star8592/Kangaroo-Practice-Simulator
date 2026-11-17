import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import AdminStudents from "@/components/AdminStudents";
import {canManagePlatform} from "@/lib/platform-admin-principal";
export default async function AdminStudentsPage(){const jar=await cookies();if(!canManagePlatform(jar))redirect('/admin/login');return <AdminStudents/>}
