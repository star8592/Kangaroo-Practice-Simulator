import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

type Student={id:string;name:string;createdAt:number};
const DIR=path.join(process.cwd(),"private","arithmetic");
const FILE=path.join(DIR,"students.json");
const DEFAULT:Student={id:"default",name:"默认学生",createdAt:0};
function readStudents():Student[]{
 if(!fs.existsSync(FILE))return [DEFAULT];
 try{const x=JSON.parse(fs.readFileSync(FILE,"utf8")) as Student[];return x.some(s=>s.id==="default")?x:[DEFAULT,...x]}catch{return[DEFAULT]}
}
export async function GET(){return NextResponse.json({students:readStudents()})}
export async function POST(req:Request){
 const body=await req.json() as {name?:string};const name=(body.name||"").trim().slice(0,30);
 if(!name)return NextResponse.json({error:"name required"},{status:400});
 const student:Student={id:`s_${randomUUID().replaceAll("-","").slice(0,12)}`,name,createdAt:Date.now()};
 const students=readStudents();students.push(student);fs.mkdirSync(DIR,{recursive:true});fs.writeFileSync(FILE,JSON.stringify(students,null,2));
 return NextResponse.json({student});
}
