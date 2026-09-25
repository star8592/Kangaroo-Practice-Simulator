import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {issueChallenge,verifyChallenge} from "../src/lib/auth-challenges";
import {authenticateParent,createParent,createParentSessionToken,hashPassword,parentFromSessionToken,resetParentPassword} from "../src/lib/parent-auth";
import {addStudentToFamily,familyOwnsStudent,publicFamilyStudents} from "../src/lib/family-store";
import {createStudent} from "../src/lib/auth";

const root=process.cwd(),dir=path.join(root,"private","users");
const names=["parents.json","families.json","auth-challenges.json","auth-challenge-secret.txt","parent-session-secret.txt","users.json"];
const backup=new Map<string,Buffer|null>();
for(const n of names){const p=path.join(dir,n);backup.set(n,fs.existsSync(p)?fs.readFileSync(p):null)}
function restore(){for(const [n,b] of backup){const p=path.join(dir,n);if(b===null){if(fs.existsSync(p))fs.rmSync(p)}else fs.writeFileSync(p,b)}}
try{
 fs.mkdirSync(dir,{recursive:true});
 for(const n of ["parents.json","families.json","auth-challenges.json","auth-challenge-secret.txt","parent-session-secret.txt"]){const p=path.join(dir,n);if(fs.existsSync(p))fs.rmSync(p)}
 const email="parent-test@example.com",code="123456",now=Date.now();
 issueChallenge({purpose:"register",email,code,payload:{name:"Test Parent",passwordHash:hashPassword("StrongPass123"),termsAcceptedAt:now,guardianConfirmedAt:now}});
 assert.throws(()=>verifyChallenge("register",email,"000000"));
 const c=verifyChallenge("register",email,code);
 assert.equal(c.payload?.name,"Test Parent");
 assert.throws(()=>verifyChallenge("register",email,code));
 const p=createParent({email,name:c.payload!.name!,passwordHash:c.payload!.passwordHash!,termsAcceptedAt:c.payload!.termsAcceptedAt!,guardianConfirmedAt:c.payload!.guardianConfirmedAt!});
 assert.equal(authenticateParent(email,"bad"),null);
 assert.equal(authenticateParent(email,"StrongPass123")?.id,p.id);
 const old=createParentSessionToken(p.id);assert.equal(parentFromSessionToken(old)?.id,p.id);
 resetParentPassword(email,"NewPass1234");
 assert.equal(parentFromSessionToken(old),null);
 assert.equal(authenticateParent(email,"NewPass1234")?.id,p.id);
 const s=createStudent({username:"family_test_"+Date.now(),candidateNo:"FT"+Date.now(),name:"Kid",grade:1,pin:"1234"});
 addStudentToFamily(p.id,s.id);
 assert.equal(familyOwnsStudent(p.id,s.id),true);
 assert.equal(publicFamilyStudents(p.id)[0]?.id,s.id);
 console.log("PARENT_AUTH=PASS otp_one_time=true password_reset_revokes_session=true family_binding=true");
}finally{restore()}
