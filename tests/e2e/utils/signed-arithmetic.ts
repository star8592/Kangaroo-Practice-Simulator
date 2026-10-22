import { randomInt } from "node:crypto";
import { expect, type APIRequestContext } from "@playwright/test";
import type { ArithmeticItem } from "../../../src/lib/arithmetic-generator";

/** Real signed Web practice round, with an intentionally untrusted studentId. */
export async function submitSignedPractice(request:APIRequestContext,studentId:string,grade:number){
  const seed=randomInt(1,2147483647);
  const q=new URLSearchParams({action:"start",grade:String(grade),mode:"diagnostic",seed:String(seed)});
  const issued=await request.get("/api/arithmetic/sessions?"+q.toString());
  expect(issued.status()).toBe(200);
  const data=await issued.json() as {token:string;items:ArithmeticItem[]};
  expect(data.items).toHaveLength(20);
  const id="arith-"+studentId+"-g"+grade+"-"+seed+"-diagnostic";
  const session={
    id,studentId:"untrusted-id",grade,mode:"diagnostic",
    startedAt:0,finishedAt:0,
    attempts:data.items.map(item=>({
      item,answer:String(item.answer),
      correct:false, // Forged client claim must not matter: server verifies again.
      responseMs:1800,firstInputMs:700,edits:0,backspaces:0,
    })),
  };
  const saved=await request.post("/api/arithmetic/sessions",{data:{action:"finish",token:data.token,session}});
  expect(saved.status()).toBe(200);
  const body=await saved.json() as {ok:boolean;session:{id:string;studentId:string;rewardVerified:boolean}};
  expect(body.ok).toBe(true);
  expect(body.session.studentId).toBe(studentId);
  expect(body.session.rewardVerified).toBe(true);
  return id;
}
