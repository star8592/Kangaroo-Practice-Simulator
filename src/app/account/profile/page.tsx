import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {PARENT_SESSION_COOKIE,parentFromSessionToken,isWechatNicknamePlaceholder} from "@/lib/parent-auth";
import {safeReturnPath} from "@/lib/wechat-mobile-oauth-state";
import ProfileForm from "./ProfileForm";
export const dynamic="force-dynamic";
export default async function ProfilePage({searchParams}:{searchParams:Promise<{next?:string}>}){
 const user=parentFromSessionToken((await cookies()).get(PARENT_SESSION_COOKIE)?.value);
 if(!user?.active||!(user.wechatId||user.wechatOpenId))redirect("/login?next=%2Faccount%2Fprofile");
 const next=safeReturnPath((await searchParams).next);
 return <div data-site-shell="content" style={{maxWidth:560,margin:"40px auto",padding:24}}>
  <h1>完善我的显示名称</h1>
  <p>微信账号已验证。老师和同学需要辨认你是谁，请设置姓名或昵称。</p>
  <p>微信昵称缺失时，请自行填写平台显示名称。不会修改微信身份、订单、教师授权。</p>
  <ProfileForm currentName={isWechatNicknamePlaceholder(user.name)?"":user.name} nextPath={next}/>
 </div>;
}
