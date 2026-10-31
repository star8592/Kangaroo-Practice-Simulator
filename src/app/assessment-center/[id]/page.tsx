import Link from "next/link";
import {notFound} from "next/navigation";
import type {Metadata} from "next";
import MeasurementRunner from "@/components/MeasurementRunner";
import {getInstrument,INSTRUMENTS} from "@/lib/measurement-center";
import styles from "../measurement.module.css";
export function generateStaticParams(){return INSTRUMENTS.map(x=>({id:x.id}));}
export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{
  const {id}=await params;const instrument=getInstrument(id);
  return {title:instrument?instrument.title+"｜智量测评中心":"测评不存在｜智量测评中心",
    description:instrument?instrument.subtitle+"。仅供免费研究试测；中文常模尚未验证。":"测评不存在。",
    alternates:{canonical:"/assessment-center/"+id}};
}
export default async function MeasurementDetail({params}:{params:Promise<{id:string}>}){
  const {id}=await params;const instrument=getInstrument(id);
  if(!instrument)notFound();
  return <div className={styles.shell}><nav className={styles.breadcrumb} aria-label="位置">
    <Link href="/assessments">全部考试</Link><span> / </span><Link href="/assessment-center">智量测评中心</Link><span> / </span>{instrument.title}
  </nav><MeasurementRunner instrument={instrument}/></div>;
}
