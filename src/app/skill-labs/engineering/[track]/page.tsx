import Link from "next/link";
import {notFound} from "next/navigation";
import type {Metadata} from "next";
import CodeLabClient from "@/components/CodeLabClient";
import styles from "@/app/assessment-center/measurement.module.css";
import workStyles from "@/components/code-lab.module.css";
import {ENGINEERING_TRACKS,ENGINEERING_TRACK_LIST} from "@/lib/engineering-code-tracks";
import type {EngineeringTrackId} from "@/lib/engineering-code-tracks";

export function generateStaticParams(){
 return ENGINEERING_TRACK_LIST.map(t=>({track:t.id}));
}
export async function generateMetadata({params}:{params:Promise<{track:string}>}):Promise<Metadata>{
 const {track:id}=await params;
 const track=Object.prototype.hasOwnProperty.call(ENGINEERING_TRACKS,id)?
  ENGINEERING_TRACKS[id as EngineeringTrackId]:null;
 return track?{
  title:track.name+"｜原生代码执行与岗位训练｜SOC THINK",
  description:track.summary+" 四项原创JavaScript代码任务，每题4组真正运行结果。免费学习，非企业认证或官方真题。",
  alternates:{canonical:"/skill-labs/engineering/"+id}
 }:{title:"岗位实训未开放"};
}
export default async function EngineeringTrackPage({params}:{params:Promise<{track:string}>}){
 const {track:id}=await params;
 if(!Object.prototype.hasOwnProperty.call(ENGINEERING_TRACKS,id))notFound();
 const track=id as EngineeringTrackId;
 return <div className={[styles.shell,workStyles.pageShell].join(" ")}>
  <nav className={styles.breadcrumb} aria-label="位置">
   <Link href="/skill-labs">技能实训</Link><span> / </span>{ENGINEERING_TRACKS[track].name}
  </nav>
  <CodeLabClient trackId={track}/>
 </div>;
}
