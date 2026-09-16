import HomeClient from "@/components/HomeClient";
import { listExamProfiles } from "@/lib/question-bank";

export const dynamic = "force-dynamic";
export default function Home(){ return <HomeClient exams={listExamProfiles()}/>; }
