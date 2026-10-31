import UnifiedLoginClient from "@/components/UnifiedLoginClient";
export default async function LoginPage({searchParams}:{searchParams:Promise<{next?:string}>}){const q=await searchParams;const next=q.next?.startsWith('/')&&!q.next.startsWith('//')&&!q.next.includes('\\')?q.next:'/account';return <UnifiedLoginClient nextPath={next}/>}
