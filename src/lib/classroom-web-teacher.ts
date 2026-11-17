import crypto from "node:crypto";
import type {PoolClient} from "pg";
import type {NextRequest} from "next/server";
import {listWechatParentCandidates} from "@/lib/parent-auth";
import {PLATFORM_SUBJECT_PATTERN} from "@/lib/platform-capabilities";
import {activePlatformGrantsForSubjects} from "@/lib/platform-grants";
import {
  type Actor,ClassroomFailure,LESSONS,admin,approved,ensureAccount,id,learnerId,
  workspaceId,teacher,tx,txt,jsonBody,newShareToken,digest,shareUrl,
  classForAssignment,teacherRoleAllowed
} from "@/lib/classroom-web-core";

async function classWorkspace(db:PoolClient,a:Actor,tenant:string){
  await approved(db,a);
  const rows=await db.query(["SELECT 1 FROM accent.memberships",
    "WHERE tenant_id=$1 AND account_id=$2 AND state='active' AND role='teacher'"].join(" "),
    [tenant,a.accountId]);
  if(!rows.rows.length)throw new ClassroomFailure(403,"请先创建教师班级");
}
async function checkClassName(v:unknown):Promise<string>{return txt(v,60,2)}
type WechatClassroomCandidate={id:string;name:string;lastLoginAt:number|null};
/** Exact subject lookup is owner-only at the caller. This is how the unified
 * user directory links to classroom teaching grants even for unnamed users.
 * The response still uses the classroom UUID, never the WeChat parent ID. */
export function selectVerifiedClassroomCandidates(
  params:URLSearchParams,accounts:readonly WechatClassroomCandidate[]
):WechatClassroomCandidate[]{
  const subject=params.get("subject");
  if(subject!==null){
    if(!PLATFORM_SUBJECT_PATTERN.test(subject))
      throw new ClassroomFailure(400,"非法平台用户编号");
    return accounts.filter(x=>x.id===subject).slice(0,1);
  }
  const q=(params.get("q")||"").trim().toLocaleLowerCase();
  if([...q].length<2)return [];
  if([...q].length>60)throw new ClassroomFailure(400,"搜索内容过长");
  return accounts.filter(x=>x.name.toLocaleLowerCase().includes(q)).slice(0,20);
}
export async function teacherHandler(req:NextRequest,p:string[],a:Actor):Promise<unknown|undefined>{
  const method=req.method;
  if(p[0]==="teacher"&&p[1]==="access"&&p.length===2&&method==="GET")
    return tx({account:a.accountId},async db=>{
      const r=await db.query("SELECT state,display_name FROM accent.teacher_access_requests WHERE account_id=$1",[a.accountId]);
      const row=r.rows[0],authorized=await teacherRoleAllowed(db,a);
      return {status:authorized?"approved":row?.state||"not_requested",
        approved:authorized,name:row?.display_name||a.name||null,is_admin:a.admin};
    });
  if(p[0]==="teacher"&&p[1]==="apply"&&p.length===2&&method==="POST"){
    const body=await jsonBody(req);const display=txt(body.display_name,60,2);
    return tx({account:a.accountId},async db=>{
      await db.query("INSERT INTO accent.teacher_access_requests(account_id,display_name) VALUES($1,$2) ON CONFLICT(account_id) DO NOTHING",
        [a.accountId,display]);
      const r=await db.query("SELECT state FROM accent.teacher_access_requests WHERE account_id=$1",[a.accountId]);
      const authorized=await teacherRoleAllowed(db,a);
      return {status:authorized?"approved":r.rows[0]?.state,approved:authorized};
    });
  }
  if(p[0]==="admin"&&p[1]==="users"&&p.length===2&&method==="GET"){
    admin(a);
    // Admin-only exact subject lookup comes directly from the main user table.
    // The nickname fallback remains available for teachers found by name.
    const found=selectVerifiedClassroomCandidates(
      req.nextUrl.searchParams,listWechatParentCandidates());
    const ids=found.map(x=>learnerId(x.id));
    // The admin directory must agree with the central workbench authorization.
    const central=await activePlatformGrantsForSubjects(found.map(x=>x.id));
    return tx({account:a.accountId,isAdmin:true},async db=>{
      const states=await db.query<{account_id:string;state:string}>(
        "SELECT account_id,state FROM accent.teacher_access_requests WHERE account_id=ANY($1::uuid[])",[ids]);
      const stateById=new Map(states.rows.map(x=>[x.account_id,x.state]));
      return {users:found.map(x=>({
        account_id:learnerId(x.id),name:x.name,
        teacher_status:central.get(x.id)?.some(g=>
          g.capability==="english.pronunciation"&&g.scopeKind==="product"&&
          (g.role==="teacher"||g.role==="module-admin"))?"approved":
          stateById.get(learnerId(x.id))||"not_requested",
        authorization_source:central.get(x.id)?.some(g=>
          g.capability==="english.pronunciation"&&g.scopeKind==="product"&&
          (g.role==="teacher"||g.role==="module-admin"))?"platform":"classroom",
        last_login_at:x.lastLoginAt
      }))};
    });
  }
  if(p[0]==="admin"&&p[1]==="teachers"&&p[2]==="direct"&&p.length===3&&method==="POST"){
    admin(a);
    const body=await jsonBody(req),target=id(body.account_id as string);
    if(typeof body.approve!=="boolean")throw new ClassroomFailure(400,"请选择授权或撤销");
    // Only identities that really completed the existing main-site WeChat flow qualify.
    const selected=listWechatParentCandidates().find(p=>learnerId(p.id)===target);
    if(!selected)throw new ClassroomFailure(404,"未找到已绑定微信的有效用户");
    const name=txt(selected.name,60);
    return tx({account:a.accountId,isAdmin:true},async db=>{
      if(body.approve){
        const updated=await db.query([
          "INSERT INTO accent.teacher_access_requests",
          "(account_id,display_name,state,reviewed_by,reviewed_at)",
          "VALUES($1,$2,'approved',$3,now())",
          "ON CONFLICT(account_id) DO UPDATE SET",
          "display_name=EXCLUDED.display_name,state='approved',reviewed_by=$3,reviewed_at=now()",
          "RETURNING account_id,state AS status"
        ].join(" "),[target,name,a.accountId]);
        return {...updated.rows[0],direct:true};
      }
      const revoked=await db.query([
        "UPDATE accent.teacher_access_requests SET state='revoked',reviewed_by=$2,reviewed_at=now()",
        "WHERE account_id=$1 RETURNING account_id,state AS status"
      ].join(" "),[target,a.accountId]);
      if(!revoked.rows.length)throw new ClassroomFailure(404,"此用户尚未获得教师权限");
      return {...revoked.rows[0],direct:true};
    });
  }
  if(p[0]==="admin"&&p[1]==="teachers"&&p.length===2&&method==="GET"){
    admin(a);
    return tx({account:a.accountId,isAdmin:true},async db=>{
      const r=await db.query(["SELECT account_id,display_name AS name,state AS status,applied_at,reviewed_at",
        "FROM accent.teacher_access_requests ORDER BY applied_at DESC LIMIT 250"].join(" "));
      return {requests:r.rows};
    });
  }
  if(p[0]==="admin"&&p[1]==="teachers"&&p.length===4&&p[3]==="decision"&&method==="POST"){
    admin(a);const target=id(p[2]);const body=await jsonBody(req);
    if(typeof body.approve!=="boolean")throw new ClassroomFailure(400,"请选择是否批准");
    return tx({account:a.accountId,isAdmin:true},async db=>{
      const status=body.approve?"approved":"revoked";
      const r=await db.query(["UPDATE accent.teacher_access_requests SET state=$2,reviewed_by=$3,reviewed_at=now()",
        "WHERE account_id=$1 RETURNING account_id,state AS status"].join(" "),
        [target,status,a.accountId]);
      if(!r.rows.length)throw new ClassroomFailure(404,"教师申请不存在");
      return r.rows[0];
    });
  }
  if(p[0]==="teacher"&&p[1]==="onboard"&&p.length===2&&method==="POST"){
    const body=await jsonBody(req),className=await checkClassName(body.class_name);
    const tenant=workspaceId(a.masterId,"tenant"),classId=workspaceId(a.masterId,"class"),
      setId=workspaceId(a.masterId,"original-sentence-set");
    return tx({tenant,account:a.accountId},async db=>{
      await approved(db,a);
      await db.query("INSERT INTO accent.tenants(id,name,status) VALUES($1,$2,'active') ON CONFLICT(id) DO NOTHING",
        [tenant,className+" · English Leap"]);
      await ensureAccount(db,a);
      await db.query(["INSERT INTO accent.memberships(tenant_id,account_id,role,display_name)",
        "VALUES($1,$2,'teacher','授课老师') ON CONFLICT(tenant_id,account_id) DO NOTHING"].join(" "),
        [tenant,a.accountId]);
      await db.query(["INSERT INTO accent.classes(tenant_id,id,title,lead_teacher_id)",
        "VALUES($1,$2,$3,$4) ON CONFLICT(tenant_id,id) DO NOTHING"].join(" "),
        [tenant,classId,className,a.accountId]);
      await db.query(["INSERT INTO accent.sentence_sets(",
        "tenant_id,id,owner_id,title,visibility,rights_holder,license_ref,permission_scope,content_status)",
        "VALUES($1,$2,$3,'自然科学英语原版跟读','classroom','AccentLab project original',",
        "'content/follow-along/catalog.json:original:v1','project_original','approved')",
        "ON CONFLICT(tenant_id,id) DO NOTHING"].join(" "),
        [tenant,setId,a.accountId]);
      for(let index=0;index<LESSONS.length;index++){
        const item=LESSONS[index];
        const sentenceId=workspaceId(a.masterId,"sentence:"+item[0]);
        await db.query(["INSERT INTO accent.sentence_items(tenant_id,id,set_id,ordinal,english_text)",
          "VALUES($1,$2,$3,$4,$5) ON CONFLICT(tenant_id,id) DO NOTHING"].join(" "),
          [tenant,sentenceId,setId,index+1,item[1]]);
      }
      await teacher(db,a,tenant,classId);
      return {created_or_existing:true,tenant_id:tenant,class_id:classId,class_name:className,original_sentences:9};
    });
  }
  if(p[0]==="teacher"&&p[1]==="classes"&&p.length===2&&method==="GET"){
    const tenant=workspaceId(a.masterId,"tenant");
    return tx({tenant,account:a.accountId},async db=>{
      await approved(db,a);
      const r=await db.query(["SELECT c.id,c.title AS name,c.tenant_id FROM accent.classes c",
        "JOIN accent.memberships m ON m.tenant_id=c.tenant_id AND m.account_id=c.lead_teacher_id",
        "WHERE c.tenant_id=$1 AND c.lead_teacher_id=$2 AND m.state='active'",
        "ORDER BY c.created_at,c.id LIMIT 100"].join(" "),[tenant,a.accountId]);
      return {classes:r.rows};
    });
  }
  if(p[0]==="teacher"&&p[1]==="classes"&&p[2]==="create"&&p.length===3&&method==="POST"){
    const body=await jsonBody(req),className=await checkClassName(body.class_name);
    const tenant=workspaceId(a.masterId,"tenant"),classId=crypto.randomUUID();
    return tx({tenant,account:a.accountId},async db=>{
      await classWorkspace(db,a,tenant);
      const current=await db.query("SELECT count(*)::integer AS n FROM accent.classes WHERE tenant_id=$1 AND lead_teacher_id=$2",
        [tenant,a.accountId]);
      if(current.rows[0].n>=30)throw new ClassroomFailure(409,"最多创建 30 个班级");
      await db.query("INSERT INTO accent.classes(tenant_id,id,title,lead_teacher_id) VALUES($1,$2,$3,$4)",
        [tenant,classId,className,a.accountId]);
      return {tenant_id:tenant,class_id:classId,class_name:className};
    });
  }
  if(p[0]!=="tenants"||p[2]!=="classes"||p.length<5)return undefined;
  const tenant=id(p[1]),cl=id(p[3]);
  // Two paths to the same authoritative class enrollment:
  // (1) student applies with a WeChat-authenticated assignment invitation and
  // teacher approves (join-requests), or (2) teacher assigns an already verified
  // student account belonging to this teacher's tenant. Unregistered names are
  // pre-entered separately in expected-roster and NEVER impersonate an account.
  if(p[4]==="students"&&p.length===5&&method==="GET")
    return tx({tenant,account:a.accountId},async db=>{
      await teacher(db,a,tenant,cl);
      const counts=await db.query(["SELECT",
        "(SELECT count(*)::int FROM accent.class_expected_roster WHERE tenant_id=$1 AND class_id=$2) AS planned_total,",
        "(SELECT count(*)::int FROM accent.class_join_requests WHERE tenant_id=$1 AND requested_class_id=$2 AND status='pending') AS pending_total,",
        "(SELECT count(*)::int FROM accent.class_enrollments e JOIN accent.memberships m",
        "ON m.tenant_id=e.tenant_id AND m.account_id=e.account_id",
        "WHERE e.tenant_id=$1 AND e.class_id=$2 AND e.role='student'",
        "AND m.role='student' AND m.state='active') AS enrolled_total"].join(" "),[tenant,cl]);
      const people=await db.query(["SELECT e.account_id,m.display_name AS name,e.enrolled_at",
        "FROM accent.class_enrollments e JOIN accent.memberships m",
        "ON m.tenant_id=e.tenant_id AND m.account_id=e.account_id",
        "WHERE e.tenant_id=$1 AND e.class_id=$2 AND e.role='student'",
        "AND m.role='student' AND m.state='active' ORDER BY e.enrolled_at,e.account_id LIMIT 100"].join(" "),[tenant,cl]);
      return {...counts.rows[0],students:people.rows};
    });
  if(p[4]==="students"&&p[5]==="candidates"&&p.length===6&&method==="GET"){
    const query=(req.nextUrl.searchParams.get("q")||"").trim();
    if([...query].length<2||[...query].length>60)
      throw new ClassroomFailure(400,"请输入至少两个字的已入校学生姓名");
    return tx({tenant,account:a.accountId},async db=>{
      await teacher(db,a,tenant,cl);
      // Only accounts that previously joined this teacher's tenant are
      // searchable. A teacher may not enumerate all SOC THINK children.
      const people=await db.query(["SELECT m.account_id,m.display_name AS name,",
        "EXISTS(SELECT 1 FROM accent.class_enrollments e",
        "WHERE e.tenant_id=m.tenant_id AND e.account_id=m.account_id",
        "AND e.class_id=$2 AND e.role='student') AS already_enrolled",
        "FROM accent.memberships m WHERE m.tenant_id=$1 AND m.role='student'",
        "AND m.state='active' AND strpos(lower(m.display_name),lower($3))>0",
        "ORDER BY m.display_name,m.account_id LIMIT 20"].join(" "),[tenant,cl,query]);
      return {users:people.rows};
    });
  }
  if(p[4]==="students"&&p[5]==="direct"&&p.length===6&&method==="POST"){
    const body=await jsonBody(req),student=id(body.account_id as string);
    return tx({tenant,account:a.accountId},async db=>{
      await teacher(db,a,tenant,cl);
      // Verify actual tenant membership inside the same transaction; never
      // enroll an arbitrary user ID or infer identity from a matching name.
      const member=await db.query(["SELECT display_name FROM accent.memberships",
        "WHERE tenant_id=$1 AND account_id=$2 AND role='student' AND state='active' FOR UPDATE"].join(" "),[tenant,student]);
      if(!member.rows.length)
        throw new ClassroomFailure(404,"未找到本教学空间内已验证的学生账号，请先录入花名册并分享微信作业链接");
      const current=await db.query(["SELECT count(*)::int AS n FROM accent.class_enrollments",
        "WHERE tenant_id=$1 AND class_id=$2 AND role='student'"].join(" "),[tenant,cl]);
      const existing=await db.query(["SELECT 1 FROM accent.class_enrollments",
        "WHERE tenant_id=$1 AND class_id=$2 AND account_id=$3 AND role='student'"].join(" "),
        [tenant,cl,student]);
      if(!existing.rows.length&&current.rows[0].n>=80)
        throw new ClassroomFailure(409,"本班已经有80名学生，请先联系管理员调整班级安排");
      const inserted=await db.query(["INSERT INTO accent.class_enrollments(tenant_id,class_id,account_id,role)",
        "VALUES($1,$2,$3,'student') ON CONFLICT(tenant_id,class_id,account_id) DO NOTHING",
        "RETURNING account_id"].join(" "),[tenant,cl,student]);
      // A directly appointed student has no outstanding admission request
      // for this exact class; preserve unrelated applications/classes.
      await db.query(["UPDATE accent.class_join_requests SET status='approved',",
        "assigned_class_id=$2,reviewed_by=$3,reviewed_at=now(),updated_at=now()",
        "WHERE tenant_id=$1 AND requested_class_id=$2 AND student_id=$4 AND status='pending'"].join(" "),
        [tenant,cl,a.accountId,student]);
      return {assigned:true,already_enrolled:inserted.rows.length===0,
        account_id:student,name:member.rows[0].display_name};
    });
  }
  if(p[4]==="students"&&p[5]==="remove"&&p.length===6&&method==="POST"){
    const body=await jsonBody(req),student=id(body.account_id as string);
    return tx({tenant,account:a.accountId},async db=>{
      await teacher(db,a,tenant,cl);
      // This removes only membership in THIS class. It never deletes the
      // verified WeChat account, tenant membership, homework or past grades.
      const result=await db.query(["DELETE FROM accent.class_enrollments",
        "WHERE tenant_id=$1 AND class_id=$2 AND account_id=$3 AND role='student'",
        "RETURNING account_id"].join(" "),[tenant,cl,student]);
      if(!result.rows.length)return {removed:false,already_absent:true,account_id:student};
      // A previously approved invite must not continue claiming 'approved'
      // after the actual enrollment has been removed. Applications for other
      // classes remain unchanged, and a fresh application can be submitted.
      await db.query(["UPDATE accent.class_join_requests SET status='rejected',",
        "assigned_class_id=NULL,reviewed_by=$4,reviewed_at=now(),updated_at=now()",
        "WHERE tenant_id=$1 AND student_id=$3 AND assigned_class_id=$2",
        "AND status='approved'"].join(" "),[tenant,cl,student,a.accountId]);
      await db.query(["INSERT INTO accent.audit_events",
        "(tenant_id,actor_id,action,resource_kind,resource_id,details)",
        "VALUES($1,$2,'student_removed_from_class','class_enrollment',$3,",
        "jsonb_build_object('class_id',$4::text))"].join(" "),
        [tenant,a.accountId,student,cl]);
      return {removed:true,already_absent:false,account_id:student,
        history_preserved:true,other_classes_unchanged:true};
    });
  }
  if(p[4]==="expected-roster"&&p[5]==="remove"&&p.length===6&&method==="POST"){
    const body=await jsonBody(req),name=txt(body.name,30);
    return tx({tenant,account:a.accountId},async db=>{
      await teacher(db,a,tenant,cl);
      const r=await db.query(["DELETE FROM accent.class_expected_roster",
        "WHERE tenant_id=$1 AND class_id=$2 AND lower(btrim(name))=lower(btrim($3))",
        "RETURNING name"].join(" "),[tenant,cl,name]);
      if(r.rows.length)await db.query(["INSERT INTO accent.audit_events",
        "(tenant_id,actor_id,action,resource_kind,resource_id,details)",
        "VALUES($1,$2,'planned_student_removed','class_expected_roster',$3,",
        "jsonb_build_object('name',$4::text))"].join(" "),
        [tenant,a.accountId,cl,r.rows[0].name]);
      return {removed:r.rows.length>0,already_absent:r.rows.length===0,
        name,verified_enrollment_unchanged:true};
    });
  }
  if(p[4]==="materials"&&p.length===5&&method==="POST"){
    const body=await jsonBody(req,90000);
    const title=txt(body.title,160,2);
    if(body.rights_confirmed!==true)
      throw new ClassroomFailure(400,"请确认这些英语句子可用于你自己的课堂教学");
    if(!Array.isArray(body.sentences)||body.sentences.length<1||body.sentences.length>80)
      throw new ClassroomFailure(400,"每次请导入 1–80 句英语句子");
    const sentences=body.sentences.map(x=>txt(x,350,12));
    if(new Set(sentences.map(x=>x.toLowerCase().replace(/\s+/g," "))).size!==sentences.length)
      throw new ClassroomFailure(400,"导入内容有重复句子，请先去重");
    return tx({tenant,account:a.accountId},async db=>{
      await teacher(db,a,tenant,cl);
      const count=await db.query(
        "SELECT count(*)::int AS n FROM accent.sentence_sets WHERE tenant_id=$1 AND owner_id=$2",
        [tenant,a.accountId]);
      if(count.rows[0]?.n>=100)throw new ClassroomFailure(409,"当前教师素材集已达到上限，请先整理已有素材");
      const set=crypto.randomUUID();
      await db.query(["INSERT INTO accent.sentence_sets",
        "(tenant_id,id,owner_id,title,visibility,rights_holder,license_ref,permission_scope,content_status)",
        "VALUES($1,$2,$3,$4,'classroom','Teacher-provided classroom material',",
        "'teacher-declared-classroom-rights-v1','commercial_training','approved')"].join(" "),
        [tenant,set,a.accountId,title]);
      for(let i=0;i<sentences.length;i++)await db.query(
        "INSERT INTO accent.sentence_items(tenant_id,id,set_id,ordinal,english_text) VALUES($1,$2,$3,$4,$5)",
        [tenant,crypto.randomUUID(),set,i+1,sentences[i]]);
      return {saved:true,set_id:set,title,count:sentences.length};
    });
  }
  if(p[4]==="catalog"&&p.length===5&&method==="GET")
    return tx({tenant,account:a.accountId},async db=>{
      await teacher(db,a,tenant,cl);
      const r=await db.query(["SELECT s.id,s.set_id AS sentence_set_id,s.english_text AS sentence,",
        "s.ordinal,t.title AS set_title FROM accent.sentence_items s",
        "JOIN accent.sentence_sets t ON t.tenant_id=s.tenant_id AND t.id=s.set_id",
        "WHERE s.tenant_id=$1 AND t.content_status='approved'",
        "AND t.permission_scope IN ('project_original','public_domain','commercial_training')",
        "ORDER BY t.created_at DESC,s.ordinal LIMIT 1000"].join(" "),[tenant]);
      return {items:r.rows};
    });
  if(p[4]==="assignments"&&p[5]==="list"&&p.length===6&&method==="GET")
    return tx({tenant,account:a.accountId},async db=>{
      await teacher(db,a,tenant,cl);
      const r=await db.query(["SELECT a.id,a.title,a.lifecycle,a.created_at,",
        "(SELECT count(*)::int FROM accent.assignment_receipts x",
        "WHERE x.tenant_id=a.tenant_id AND x.assignment_id=a.id",
        "AND x.status IN ('submitted','completed')) AS submitted,",
        "(SELECT count(*)::int FROM accent.class_enrollments e",
        "WHERE e.tenant_id=a.tenant_id AND e.class_id=a.class_id",
        "AND e.role='student') AS enrolled_total,",
        "(SELECT count(*)::int FROM accent.assignment_receipts x",
        "WHERE x.tenant_id=a.tenant_id AND x.assignment_id=a.id AND x.claimed_at IS NOT NULL)",
        "AS claimed_total,",
        "(SELECT round(avg(b.best_score)::numeric,1)::float8 FROM (",
        "SELECT max(p.reference_score) AS best_score",
        "FROM accent.assignment_attempt_links l",
        "JOIN accent.pronunciation_assessments p ON p.tenant_id=l.tenant_id AND p.attempt_id=l.attempt_id",
        "WHERE l.tenant_id=a.tenant_id AND l.assignment_id=a.id",
        "GROUP BY l.student_id) b) AS average_best_score",
        "FROM accent.class_assignments a WHERE a.tenant_id=$1 AND a.class_id=$2",
        "AND a.lifecycle IN ('published','closed') ORDER BY a.created_at DESC LIMIT 100"].join(" "),[tenant,cl]);
      return {assignments:r.rows};
    });
  if(p[4]==="assignments"&&p.length===5&&method==="POST"){
    const body=await jsonBody(req);
    const title=txt(body.title,160,2),setId=id(body.sentence_set_id as string);
    const ids=body.sentence_ids;
    if(!Array.isArray(ids)||ids.length<1||ids.length>30||!ids.every(v=>typeof v==="string"))
      throw new ClassroomFailure(400,"请选择 1–30 句作业");
    const sentenceIds=(ids as string[]).map(id);
    if(new Set(sentenceIds).size!==sentenceIds.length)throw new ClassroomFailure(400,"重复的练习句子");
    const assignment=crypto.randomUUID(),raw=newShareToken();
    return tx({tenant,account:a.accountId},async db=>{
      await teacher(db,a,tenant,cl);
      const r=await db.query(["SELECT count(*)::int AS n FROM accent.sentence_items i",
        "JOIN accent.sentence_sets s ON s.tenant_id=i.tenant_id AND s.id=i.set_id",
        "WHERE i.tenant_id=$1 AND i.set_id=$2 AND i.id=ANY($3::uuid[])",
        "AND s.content_status='approved'",
        "AND (s.permission_scope='project_original' OR",
        "(s.permission_scope='commercial_training' AND s.owner_id=$4))"].join(" "),
        [tenant,setId,sentenceIds,a.accountId]);
      if(r.rows[0]?.n!==sentenceIds.length)throw new ClassroomFailure(400,"练习内容不在已审核素材中");
      await db.query(["INSERT INTO accent.class_assignments",
        "(tenant_id,id,class_id,sentence_set_id,assigned_by,title,lifecycle,published_at)",
        "VALUES($1,$2,$3,$4,$5,$6,'published',now())"].join(" "),
        [tenant,assignment,cl,setId,a.accountId,title]);
      for(let i=0;i<sentenceIds.length;i++)
        await db.query(["INSERT INTO accent.class_assignment_items",
          "(tenant_id,assignment_id,sentence_set_id,sentence_id,ordinal)",
          "VALUES($1,$2,$3,$4,$5)"].join(" "),
          [tenant,assignment,setId,sentenceIds[i],i+1]);
      await db.query(["INSERT INTO accent.assignment_invitation_links",
        "(tenant_id,assignment_id,token_digest,expires_at)",
        "VALUES($1,$2,decode($3,'hex'),now()+interval '7 days')"].join(" "),[tenant,assignment,digest(raw)]);
      return {assignment_id:assignment,class_id:cl,title,sentence_count:sentenceIds.length,share_url:shareUrl(tenant,raw)};
    });
  }
  if(p[4]==="expected-roster"&&p.length===5&&method==="GET")
    return tx({tenant,account:a.accountId},async db=>{
      await teacher(db,a,tenant,cl);
      const r=await db.query(["SELECT r.name,r.display_alias,",
        "(SELECT count(*)::int FROM accent.class_enrollments e JOIN accent.memberships m",
        "ON m.tenant_id=e.tenant_id AND m.account_id=e.account_id",
        "WHERE e.tenant_id=r.tenant_id AND e.class_id=r.class_id",
        "AND e.role='student' AND m.state='active' AND lower(btrim(m.display_name))=lower(btrim(r.name))) AS matching_accounts",
        "FROM accent.class_expected_roster r WHERE r.tenant_id=$1 AND r.class_id=$2",
        "ORDER BY r.added_at,r.name"].join(" "),[tenant,cl]);
      const entries=r.rows,matched=entries.filter(e=>e.matching_accounts===1).length,
        unmatched=entries.filter(e=>e.matching_accounts===0).length;
      return {expected_total:entries.length,matched_by_name:matched,unmatched_by_name:unmatched,
        ambiguous_by_name:entries.length-matched-unmatched,identity_verified_by_name:false,entries};
    });
  if(p[4]==="expected-roster"&&p.length===5&&method==="POST"){
    const body=await jsonBody(req,20000);
    const names=body.names,aliases=body.aliases;
    if(!Array.isArray(names)||names.length>80||!names.every(v=>typeof v==="string"))
      throw new ClassroomFailure(400,"名单人数或格式不正确");
    const clean=(names as string[]).map(x=>txt(x,30));
    if(new Set(clean.map(x=>x.toLowerCase())).size!==clean.length)
      throw new ClassroomFailure(400,"学生姓名有重复");
    const rawAliases=Array.isArray(aliases)?aliases:[];
    if(rawAliases.length&&rawAliases.length!==clean.length)
      throw new ClassroomFailure(400,"昵称数量与名单不一致");
    const nice=clean.map((x,i)=>{
      const v=rawAliases[i];return v===null||v===undefined||v===""?null:txt(v,24);
    });
    return tx({tenant,account:a.accountId},async db=>{
      await teacher(db,a,tenant,cl);
      await db.query("DELETE FROM accent.class_expected_roster WHERE tenant_id=$1 AND class_id=$2",[tenant,cl]);
      for(let i=0;i<clean.length;i++)await db.query(
        "INSERT INTO accent.class_expected_roster(tenant_id,class_id,name,display_alias) VALUES($1,$2,$3,$4)",
        [tenant,cl,clean[i],nice[i]]);
      return {saved:true,expected_total:clean.length};
    });
  }
  if(p[4]==="join-requests"&&p.length===5&&method==="GET")
    return tx({tenant,account:a.accountId},async db=>{
      await teacher(db,a,tenant,cl);
      const r=await db.query(["SELECT id,student_name,grade_label,created_at FROM accent.class_join_requests",
        "WHERE tenant_id=$1 AND requested_class_id=$2 AND status='pending'",
        "ORDER BY created_at,id LIMIT 100"].join(" "),[tenant,cl]);
      return {requests:r.rows};
    });
  if(p[4]==="join-requests"&&p[6]==="decision"&&p.length===7&&method==="POST"){
    const requestId=id(p[5]),body=await jsonBody(req);
    if(typeof body.approve!=="boolean")throw new ClassroomFailure(400,"请选择审批结果");
    const target=body.assigned_class_id==null?cl:id(body.assigned_class_id as string);
    return tx({tenant,account:a.accountId},async db=>{
      await teacher(db,a,tenant,cl);
      if(body.approve)await teacher(db,a,tenant,target);
      const r=await db.query(["SELECT student_id,status FROM accent.class_join_requests",
        "WHERE tenant_id=$1 AND id=$2 AND requested_class_id=$3 FOR UPDATE"].join(" "),
        [tenant,requestId,cl]);
      if(!r.rows.length)throw new ClassroomFailure(404,"入班申请不存在");
      if(r.rows[0].status!=="pending")return {status:r.rows[0].status,already_reviewed:true};
      const student=r.rows[0].student_id;
      await db.query(["UPDATE accent.class_join_requests SET status=$4,assigned_class_id=$5,",
        "reviewed_by=$6,reviewed_at=now(),updated_at=now()",
        "WHERE tenant_id=$1 AND id=$2 AND requested_class_id=$3"].join(" "),
        [tenant,requestId,cl,body.approve?"approved":"rejected",body.approve?target:null,a.accountId]);
      if(body.approve){
        await db.query(["UPDATE accent.memberships SET state='active' WHERE tenant_id=$1",
          "AND account_id=$2 AND state='invited'"].join(" "),[tenant,student]);
        await db.query(["INSERT INTO accent.class_enrollments(tenant_id,class_id,account_id,role)",
          "VALUES($1,$2,$3,'student') ON CONFLICT(tenant_id,class_id,account_id) DO NOTHING"].join(" "),
          [tenant,target,student]);
      }
      return {status:body.approve?"approved":"rejected",already_reviewed:false};
    });
  }
  return undefined;
}

export async function assignmentTeacherHandler(req:NextRequest,p:string[],a:Actor):Promise<unknown|undefined>{
  if(p[0]!=="tenants"||p[2]!=="assignments"||p.length<5)return undefined;
  const tenant=id(p[1]),assignment=id(p[3]);
  if(p[4]==="invite"&&p[5]==="renew"&&p.length===6&&req.method==="POST"){
    const raw=newShareToken();
    return tx({tenant,account:a.accountId},async db=>{
      const cl=await classForAssignment(db,tenant,assignment);await teacher(db,a,tenant,cl);
      const r=await db.query("SELECT title FROM accent.class_assignments WHERE tenant_id=$1 AND id=$2 AND lifecycle='published'",
        [tenant,assignment]);
      if(!r.rows.length)throw new ClassroomFailure(409,"只能重新分享正在进行的作业");
      await db.query("UPDATE accent.assignment_invitation_links SET revoked_at=now() WHERE tenant_id=$1 AND assignment_id=$2 AND revoked_at IS NULL",
        [tenant,assignment]);
      await db.query(["INSERT INTO accent.assignment_invitation_links",
        "(tenant_id,assignment_id,token_digest,expires_at)",
        "VALUES($1,$2,decode($3,'hex'),now()+interval '7 days')"].join(" "),[tenant,assignment,digest(raw)]);
      return {assignment_id:assignment,title:r.rows[0].title,share_url:shareUrl(tenant,raw),old_links_revoked:true,expires_in_days:7};
    });
  }
  if(p[4]==="close"&&p.length===5&&req.method==="POST")
    return tx({tenant,account:a.accountId},async db=>{
      const cl=await classForAssignment(db,tenant,assignment);await teacher(db,a,tenant,cl);
      const r=await db.query(["UPDATE accent.class_assignments SET lifecycle='closed',closed_at=now(),updated_at=now()",
        "WHERE tenant_id=$1 AND id=$2 AND lifecycle='published' RETURNING id"].join(" "),[tenant,assignment]);
      await db.query("UPDATE accent.assignment_invitation_links SET revoked_at=now() WHERE tenant_id=$1 AND assignment_id=$2 AND revoked_at IS NULL",
        [tenant,assignment]);
      return {assignment_id:assignment,closed:true,already_closed:!r.rows.length};
    });
  return undefined;
}
