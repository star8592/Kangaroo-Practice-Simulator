import type {Metadata} from "next";
import MyClassesClient from "@/features/english/pronunciation/MyClassesClient";
export const metadata:Metadata={title:"我的英语班级｜SOC THINK",robots:{index:false,follow:false}};
export default function MyClassesPage(){
 return <div data-site-shell="content" style={{maxWidth:760,margin:"24px auto",padding:24}}>
  <h1>我的英语班级</h1><p>只显示当前微信账号已获老师批准加入的班级，以及本人的真实作业状态、历史成绩和教师反馈。不公开其他学生的记录。</p>
  <MyClassesClient/>
 </div>;
}
