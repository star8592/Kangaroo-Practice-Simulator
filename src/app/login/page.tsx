import UnifiedLoginClient from "@/components/UnifiedLoginClient";

export default async function LoginPage({
  searchParams,
}:{
  searchParams:Promise<{next?:string;wechat?:string}>
}){
  const q=await searchParams;
  const next=q.next?.startsWith('/')&&!q.next.startsWith('//')&&!q.next.includes('\\')
    ?q.next:'/account';
  const loginError=typeof q.wechat==='string'?
    (['state_error','failed','unavailable'].includes(q.wechat)?q.wechat:undefined)
    :undefined;
  return <UnifiedLoginClient nextPath={next} loginError={loginError}/>;
}
