import crypto from "node:crypto";
import path from "node:path";
import {readFile,unlink} from "node:fs/promises";
import type {NextRequest} from "next/server";
import type {PoolClient} from "pg";
import {classInvitationLink} from "./classroom-invitations";
import {type Actor,ClassroomFailure,digest,enrolled,id,jsonBody,newShareToken,teacher,tx,txt} from "./classroom-web-core";
import {scoreClassroomAudio,saveClassroomRecording,classroomRecordingRoot} from "./classroom-web-assessment";

/** Strict target words, not 12-character pseudo-sentences.
 * Caller/teacher owns exact word spelling; punctuation-only and translations
 * cannot be turned into targets. Scores are separate from sentence scores.
 */
export function validWordTarget(value:unknown):string {
 if(typeof value!=="string")throw new ClassroomFailure(400,"单词内容不是文本");
 const word=value.trim().replace(/\s+/g," ");
 if(word.length>60||!/^[A-Za-z]+(?:['-][A-Za-z]+)*(?: [A-Za-z]+(?:['-][A-Za-z]+)*){0,3}$/.test(word))
  throw new ClassroomFailure(400,"请只填写英文单词或不超过4词的英文短语");
 return word;
}
function words(value:unknown):string[]{
 if(!Array.isArray(value)||value.length<1||value.length>40)
  throw new ClassroomFailure(400,"一次请选择1—40个单词或短语");
 const approved=value.map(validWordTarget);
 if(new Set(approved.map(x=>x.toLowerCase())).size!==approved.length)
  throw new ClassroomFailure(400,"单词列表包含重复内容");
 return approved;
}
async function wordInvite(db:PoolClient,tenant:string,raw:string){
 const found=await db.query([
  "SELECT id,class_id,title FROM accent.word_assignments",
  "WHERE tenant_id=$1 AND token_digest=decode($2,'hex') AND expires_at>now()"
 ].join(" "),[tenant,digest(raw)]);
 if(!found.rows.length)throw new ClassroomFailure(404,"单词作业链接已过期或不存在");
 return found.rows[0] as {id:string;class_id:string;title:string};
}
function shareUrl(tenant:string,raw:string){
 return "https://socthink.cn/english/pronunciation/app/w/"+tenant+"/"+raw;
}
async function listWordProgress(db:PoolClient,tenant:string,assignment:string,student:string){
 const attempts=await db.query([
  "SELECT a.id AS attempt_id,a.item_id,a.score,a.model_version,a.recorded_at",
  "FROM accent.word_assignment_attempts a WHERE a.tenant_id=$1",
  "AND a.assignment_id=$2 AND a.student_id=$3",
  "ORDER BY a.recorded_at DESC LIMIT 150"
 ].join(" "),[tenant,assignment,student]);
 const receipt=await db.query([
  "SELECT status,claimed_at,submitted_at FROM accent.word_assignment_receipts",
  "WHERE tenant_id=$1 AND assignment_id=$2 AND student_id=$3"
 ].join(" "),[tenant,assignment,student]);
 return {attempts:attempts.rows,status:receipt.rows[0]?.status||"not_started",
  submitted:receipt.rows[0]?.status==="submitted"};
}
export async function wordHomeworkHandler(req:NextRequest,p:string[],actor:Actor):Promise<unknown|Response|undefined>{
 if(p[0]!=="tenants"||p.length<4)return undefined;
 const tenant=id(p[1]);
 // Teacher-owned creation, listing and reports use the SAME verified class ACL.
 if(p[2]==="classes"&&p.length===5&&p[4]==="word-assignments"){
  const cl=id(p[3]);
  if(req.method==="POST"){
   const body=await jsonBody(req,16000);
   const title=txt(body.title,160,2),targets=words(body.words);
   if(body.rights_confirmed!==true)throw new ClassroomFailure(400,"请确认教材内容可用于本班教学");
   const raw=newShareToken(),assignment=crypto.randomUUID();
   return tx({tenant,account:actor.accountId},async db=>{
    await teacher(db,actor,tenant,cl);
    await db.query([
     "INSERT INTO accent.word_assignments",
     "(tenant_id,id,class_id,assigned_by,title,token_digest,expires_at)",
     "VALUES($1,$2,$3,$4,$5,decode($6,'hex'),now()+interval '7 days')"
    ].join(" "),[tenant,assignment,cl,actor.accountId,title,digest(raw)]);
    for(let i=0;i<targets.length;i++)
     await db.query([
      "INSERT INTO accent.word_assignment_items(tenant_id,assignment_id,ordinal,target_word)",
      "VALUES($1,$2,$3,$4)"
     ].join(" "),[tenant,assignment,i+1,targets[i]]);
    return {assignment_id:assignment,title,count:targets.length,share_url:shareUrl(tenant,raw)};
   });
  }
  if(req.method==="GET")return tx({tenant,account:actor.accountId},async db=>{
   await teacher(db,actor,tenant,cl);
   const result=await db.query([
    "SELECT a.id,a.title,a.created_at,a.expires_at,",
    "(SELECT count(*)::int FROM accent.word_assignment_items i WHERE i.tenant_id=a.tenant_id AND i.assignment_id=a.id) AS word_count,",
    "(SELECT count(*)::int FROM accent.word_assignment_receipts r WHERE r.tenant_id=a.tenant_id AND r.assignment_id=a.id AND r.status='submitted') AS submitted",
    "FROM accent.word_assignments a WHERE a.tenant_id=$1 AND a.class_id=$2",
    "ORDER BY a.created_at DESC LIMIT 100"
   ].join(" "),[tenant,cl]);
   return {assignments:result.rows};
  });
 }
 if(p[2]==="word-assignments"&&p.length===5&&["renew","close"].includes(p[4])&&req.method==="POST"){
  const assignment=id(p[3]);
  return tx({tenant,account:actor.accountId},async db=>{
   const r=await db.query("SELECT class_id,title FROM accent.word_assignments WHERE tenant_id=$1 AND id=$2",
    [tenant,assignment]);
   if(!r.rows.length)throw new ClassroomFailure(404,"单词作业不存在");
   await teacher(db,actor,tenant,r.rows[0].class_id);
   if(p[4]==="close"){
    await db.query("UPDATE accent.word_assignments SET expires_at=now() WHERE tenant_id=$1 AND id=$2",
     [tenant,assignment]);
    return {closed:true,assignment_id:assignment};
   }
   const raw=newShareToken();
   await db.query([
    "UPDATE accent.word_assignments SET token_digest=decode($3,'hex'),expires_at=now()+interval '7 days'",
    "WHERE tenant_id=$1 AND id=$2"
   ].join(" "),[tenant,assignment,digest(raw)]);
   return {renewed:true,assignment_id:assignment,title:r.rows[0].title,share_url:shareUrl(tenant,raw)};
  });
 }
 if(p[2]==="word-assignments"&&p.length===5&&p[4]==="report"&&req.method==="GET"){
  const assignment=id(p[3]);
  return tx({tenant,account:actor.accountId},async db=>{
   const r=await db.query("SELECT class_id,title FROM accent.word_assignments WHERE tenant_id=$1 AND id=$2",[tenant,assignment]);
   if(!r.rows.length)throw new ClassroomFailure(404,"未找到这份单词作业");
   await teacher(db,actor,tenant,r.rows[0].class_id);
   const students=await db.query([
    "SELECT e.account_id AS student_id,m.display_name AS name,",
    "(SELECT count(*)::int FROM accent.word_assignment_attempts a WHERE a.tenant_id=e.tenant_id AND a.assignment_id=$3 AND a.student_id=e.account_id) AS attempts,",
    "(SELECT max(a.score)::float8 FROM accent.word_assignment_attempts a WHERE a.tenant_id=e.tenant_id AND a.assignment_id=$3 AND a.student_id=e.account_id) AS best_score,",
    "(SELECT count(DISTINCT a.item_id)::int FROM accent.word_assignment_attempts a WHERE a.tenant_id=e.tenant_id AND a.assignment_id=$3 AND a.student_id=e.account_id) AS completed_words,",
    "COALESCE(r.status='submitted',false) AS submitted",
    "FROM accent.class_enrollments e JOIN accent.memberships m ON m.tenant_id=e.tenant_id AND m.account_id=e.account_id",
    "LEFT JOIN accent.word_assignment_receipts r ON r.tenant_id=e.tenant_id AND r.assignment_id=$3 AND r.student_id=e.account_id",
    "WHERE e.tenant_id=$1 AND e.class_id=$2 AND e.role='student' AND m.state='active'",
    "ORDER BY m.display_name LIMIT 200"
   ].join(" "),[tenant,r.rows[0].class_id,assignment]);
   const items=await db.query([
    "SELECT i.id,i.target_word,i.ordinal,round(avg(a.score)::numeric,1)::float8 AS average_score,",
    "count(DISTINCT a.student_id)::int AS student_count",
    "FROM accent.word_assignment_items i LEFT JOIN accent.word_assignment_attempts a",
    "ON a.tenant_id=i.tenant_id AND a.assignment_id=i.assignment_id AND a.item_id=i.id",
    "WHERE i.tenant_id=$1 AND i.assignment_id=$2",
    "GROUP BY i.id,i.target_word,i.ordinal ORDER BY i.ordinal"
   ].join(" "),[tenant,assignment]);
   const history=await db.query([
    "SELECT a.id AS attempt_id,a.student_id,i.target_word AS word,",
    "a.score,a.model_version,a.recorded_at AS at FROM accent.word_assignment_attempts a",
    "JOIN accent.word_assignment_items i ON i.tenant_id=a.tenant_id AND i.id=a.item_id",
    "WHERE a.tenant_id=$1 AND a.assignment_id=$2",
    "ORDER BY a.recorded_at DESC LIMIT 300"
   ].join(" "),[tenant,assignment]);
   return {assignment_id:assignment,title:r.rows[0].title,
    total:students.rows.length,submitted:students.rows.filter(x=>x.submitted).length,
    students:students.rows,items:items.rows,attempt_history:history.rows};
  });
 }
 if(p[2]==="w"&&(p.length===4||p.length===5||p.length===7)){
  const raw=p[3];
  if(p.length===4&&req.method==="GET")return tx({tenant,account:actor.accountId},async db=>{
   const assignment=await wordInvite(db,tenant,raw);
   // A valid link cannot enroll a student or disclose other students' records.
   const exists=await db.query([
    "SELECT 1 FROM accent.class_enrollments e JOIN accent.memberships m",
    "ON m.tenant_id=e.tenant_id AND m.account_id=e.account_id",
    "WHERE e.tenant_id=$1 AND e.class_id=$2 AND e.account_id=$3",
    "AND e.role='student' AND m.role='student' AND m.state='active'"
   ].join(" "),[tenant,assignment.class_id,actor.accountId]);
   if(!exists.rows.length){
    const invite=await db.query("SELECT rotation,enabled FROM accent.class_invitations WHERE tenant_id=$1 AND class_id=$2",
     [tenant,assignment.class_id]);
    const joinUrl=invite.rows[0]?.enabled?
      classInvitationLink(tenant,assignment.class_id,invite.rows[0].rotation):null;
    return {status:"join_required",assignment_id:assignment.id,title:assignment.title,join_url:joinUrl,items:[]};
   }
   const items=await db.query([
    "SELECT id AS item_id,target_word AS word,ordinal FROM accent.word_assignment_items",
    "WHERE tenant_id=$1 AND assignment_id=$2 ORDER BY ordinal"
   ].join(" "),[tenant,assignment.id]);
   const progress=await listWordProgress(db,tenant,assignment.id,actor.accountId);
   return {assignment_id:assignment.id,title:assignment.title,
    items:items.rows,...progress};
  });
  if(p.length===7&&p[4]==="items"&&p[6]==="attempts"&&req.method==="POST"){
   const item=id(p[5]),requestId=id(req.headers.get("x-request-id")||"");
   const mime=(req.headers.get("content-type")||"").split(";")[0].trim();
   if(mime!=="audio/webm"&&mime!=="audio/mp4")throw new ClassroomFailure(415,"仅支持 WebM/MP4 录音");
   if(Number(req.headers.get("content-length")||0)>2*1024*1024)
    throw new ClassroomFailure(413,"录音超过2MB");
   const bytes=new Uint8Array(await req.arrayBuffer());
   if(bytes.length<1024||bytes.length>2*1024*1024)
    throw new ClassroomFailure(413,"录音内容过短或超出2MB");
   return tx({tenant,account:actor.accountId},async db=>{
    const assignment=await wordInvite(db,tenant,raw);
    await enrolled(db,actor,tenant,assignment.class_id);
    await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
      ["word:"+tenant+":"+assignment.id+":"+actor.accountId+":"+requestId]);
    const existing=await db.query([
     "SELECT id,score FROM accent.word_assignment_attempts",
     "WHERE tenant_id=$1 AND assignment_id=$2 AND student_id=$3 AND client_request_id=$4"
    ].join(" "),[tenant,assignment.id,actor.accountId,requestId]);
    if(existing.rows.length){
     const status=await listWordProgress(db,tenant,assignment.id,actor.accountId);
     return {duplicate:true,attempt_id:existing.rows[0].id,score:existing.rows[0].score,submitted:status.submitted};
    }
    const found=await db.query([
     "SELECT target_word FROM accent.word_assignment_items WHERE tenant_id=$1 AND assignment_id=$2 AND id=$3"
    ].join(" "),[tenant,assignment.id,item]);
    if(!found.rows.length)throw new ClassroomFailure(403,"单词不属于当前作业");
    const usage=await db.query([
     "SELECT count(*)::int AS n FROM accent.word_assignment_attempts",
     "WHERE tenant_id=$1 AND student_id=$2 AND recorded_at>now()-interval '1 hour'"
    ].join(" "),[tenant,actor.accountId]);
    if(usage.rows[0].n>=40)throw new ClassroomFailure(429,"练习次数较多，请稍后重试");
    // The server chooses the exact target; never accept a score or word from the browser.
    const result=await scoreClassroomAudio(found.rows[0].target_word,bytes,mime);
    const attempt=crypto.randomUUID();
    const file=await saveClassroomRecording(tenant,attempt,mime,bytes);
    try{
     await db.query([
      "INSERT INTO accent.word_assignment_attempts",
      "(tenant_id,id,assignment_id,item_id,student_id,client_request_id,score,model_version,result_json,recording_asset_key,audio_retention_until)",
      "VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,now()+interval '30 days')"
     ].join(" "),[tenant,attempt,assignment.id,item,actor.accountId,requestId,
      result.score,String(result.engine_version||"unspecified").slice(0,120),JSON.stringify(result),file]);
     await db.query([
      "INSERT INTO accent.word_assignment_receipts(tenant_id,assignment_id,student_id,status)",
      "VALUES($1,$2,$3,'in_progress') ON CONFLICT(tenant_id,assignment_id,student_id) DO NOTHING"
     ].join(" "),[tenant,assignment.id,actor.accountId]);
     const progress=await db.query([
      "SELECT",
      "(SELECT count(*)::int FROM accent.word_assignment_items WHERE tenant_id=$1 AND assignment_id=$2) AS required,",
      "(SELECT count(DISTINCT item_id)::int FROM accent.word_assignment_attempts WHERE tenant_id=$1 AND assignment_id=$2 AND student_id=$3) AS done"
     ].join(" "),[tenant,assignment.id,actor.accountId]);
     const complete=progress.rows[0].required>0&&progress.rows[0].done>=progress.rows[0].required;
     if(complete)await db.query([
      "UPDATE accent.word_assignment_receipts SET status='submitted',submitted_at=COALESCE(submitted_at,now()),updated_at=now()",
      "WHERE tenant_id=$1 AND assignment_id=$2 AND student_id=$3 AND status='in_progress'"
     ].join(" "),[tenant,assignment.id,actor.accountId]);
     return {duplicate:false,attempt_id:attempt,score:result.score,submitted:complete,
      model_version:String(result.engine_version||"unspecified").slice(0,120)};
    }catch(e){await unlink(path.join(classroomRecordingRoot(),file)).catch(()=>undefined);throw e}
   });
  }
 }
 if(p[2]==="word-recordings"&&p.length===4&&req.method==="GET"){
  const attempt=id(p[3]);
  return tx({tenant,account:actor.accountId},async db=>{
   const r=await db.query([
    "SELECT a.student_id,a.recording_asset_key,w.class_id",
    "FROM accent.word_assignment_attempts a JOIN accent.word_assignments w",
    "ON w.tenant_id=a.tenant_id AND w.id=a.assignment_id",
    "WHERE a.tenant_id=$1 AND a.id=$2 AND a.recording_deleted_at IS NULL AND a.audio_retention_until>now()"
   ].join(" "),[tenant,attempt]);
   if(!r.rows.length)throw new ClassroomFailure(404,"录音已过期或不存在");
   const x=r.rows[0];
   if(x.student_id!==actor.accountId)await teacher(db,actor,tenant,x.class_id);
   const key=String(x.recording_asset_key||"");
   if(key!==tenant+"/"+attempt+".mp4"&&key!==tenant+"/"+attempt+".webm")
    throw new ClassroomFailure(404,"录音位置无效");
   const data=await readFile(path.join(classroomRecordingRoot(),key)).catch(()=>null);
   if(!data)throw new ClassroomFailure(404,"录音文件已不可用");
   return new Response(new Uint8Array(data),{status:200,headers:{
    "Content-Type":key.endsWith(".mp4")?"audio/mp4":"audio/webm",
    "Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"
   }});
  });
 }
 return undefined;
}
