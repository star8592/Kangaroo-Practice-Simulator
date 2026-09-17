import LoginClient from "@/components/LoginClient";
export default async function LoginPage({searchParams}:{searchParams:Promise<{next?:string}>}){const q=await searchParams;const next=q.next?.startsWith('/')?q.next:'/';return <LoginClient nextPath={next}/>}
