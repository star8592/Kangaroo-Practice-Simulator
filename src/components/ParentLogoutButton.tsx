"use client";
import {useRouter} from "next/navigation";
export default function ParentLogoutButton(){
  const router=useRouter();
  async function logout(){
    await fetch("/api/auth/parent/logout",{method:"POST"}).catch(()=>{});
    router.replace("/parent/login");
    router.refresh();
  }
  return <button className="secondary-button" onClick={logout}>退出家长账号</button>;
}
