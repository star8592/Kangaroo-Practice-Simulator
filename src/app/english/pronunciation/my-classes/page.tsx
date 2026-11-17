import type {Metadata} from "next";
import MyClassesClient from "@/features/english/pronunciation/MyClassesClient";
export const metadata:Metadata={title:"我的英语班级｜SOC THINK",robots:{index:false,follow:false}};
export default function MyClassesPage(){
 return <div data-site-shell="content" style={{maxWidth:760,margin:"24px auto",padding:24}}>
  <h1>我的英语班级</h1><p>只显示你当前微信账号已被老师批准加入的班级。</p>
  <MyClassesClient/>
 </div>;
}
