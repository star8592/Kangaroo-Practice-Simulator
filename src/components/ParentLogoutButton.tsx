"use client";
import {useRouter} from "next/navigation";
export default function ParentLogoutButton(){
  const router=useRouter();
  async function logout(){
    await fetch("/api/auth/parent/logout",{method:"POST"}).catch(()=>{});
    router.replace("/login");
    router.refresh();
  }
  return <button className="secondary-button" onClick={logout}>退出登录</button>;
}
