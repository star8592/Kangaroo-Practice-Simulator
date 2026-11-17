import assert from "node:assert/strict";
import {approved,teacherRoleAllowed,hasPlatformPronunciationRole,ClassroomFailure,type Actor}
  from "../src/lib/classroom-web-core";
type Grant=Awaited<ReturnType<typeof import("../src/lib/platform-grants").activePlatformGrants>>[number];
const masterId="par_aaaaaaaaaaaaaaaaaa";
const user:Actor={masterId,accountId:"11111111-1111-4111-8111-111111111111",name:"teacher-test",admin:false};
const db=(state:"approved"|"none")=>({
  query:async()=>({rows:state==="approved"?[{value:1}]:[]})
}) as never;
const grant=(capability:string,role:"teacher"|"module-admin"="teacher")=>
  ({capability,role,scopeKind:"product"}) as Grant;
async function run(){
  const granted=async()=>true,denied=async()=>false;
  assert.equal(await teacherRoleAllowed(db("none"),user,granted),true,
    "platform approval must allow a teacher without duplicate AccentLab approval");
  await approved(db("none"),user,granted);
  assert.equal(await teacherRoleAllowed(db("none"),user,denied),false);
  await assert.rejects(approved(db("none"),user,denied),
    (e:unknown)=>e instanceof ClassroomFailure&&e.status===403,
    "revoked platform-only teacher has no classroom access");
  await approved(db("approved"),user,denied);
  await approved(db("none"),{...user,admin:true},denied);
  const broken=async()=>{throw Error("platform offline")};
  await assert.rejects(approved(db("none"),user,broken),
    (e:unknown)=>e instanceof ClassroomFailure&&e.status===503,
    "uncertain role lookup must fail closed, not look like no teacher role");
  await approved(db("approved"),user,broken);
  const fake=async()=>[grant("english.pronunciation")];
  assert.equal(await hasPlatformPronunciationRole(masterId,fake),true);
  assert.equal(await hasPlatformPronunciationRole(masterId,
    async()=>[grant("english.pronunciation","module-admin")]),true);
  assert.equal(await hasPlatformPronunciationRole(masterId,
    async()=>[grant("english.vocabulary")]),false,
    "other product grants must not cross into pronunciation");
  assert.equal(await hasPlatformPronunciationRole(masterId,
    async()=>[{...grant("english.pronunciation"),scopeKind:"organization"} as Grant]),false);
  console.log("CLASSROOM_UNIFIED_TEACHER_ROLE_PASS=10");
}
run().catch(e=>{console.error(e);process.exitCode=1});
