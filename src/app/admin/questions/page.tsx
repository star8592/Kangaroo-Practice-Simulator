import { cookies } from "next/headers";import { redirect } from "next/navigation";import AdminQuestions from "@/components/AdminQuestions";import {canManagePlatform} from "@/lib/platform-admin-principal";
export default async function AdminQuestionsPage(){const jar=await cookies();if(!canManagePlatform(jar))redirect('/admin/login');return <AdminQuestions/>}
