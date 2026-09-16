import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import type { ArithmeticSession } from "@/lib/arithmetic-analytics";
const DIR=path.join(process.cwd(),"private","arithmetic");const FILE=path.join(DIR,"sessions.jsonl");
export async function GET(){if(!fs.existsSync(FILE))return NextResponse.json({sessions:[]});const sessions=fs.readFileSync(FILE,"utf8").split("\n").filter(Boolean).flatMap(line=>{try{return[JSON.parse(line) as ArithmeticSession]}catch{return[]}});return NextResponse.json({sessions:sessions.slice(-500)});}
export async function POST(req:Request){const body=await req.json() as ArithmeticSession;if(!body?.id||!body?.grade||!Array.isArray(body.attempts))return NextResponse.json({error:"invalid session"},{status:400});fs.mkdirSync(DIR,{recursive:true});fs.appendFileSync(FILE,JSON.stringify(body)+"\n");return NextResponse.json({ok:true});}
