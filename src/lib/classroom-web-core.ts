import crypto from "node:crypto";
import {Pool,type PoolClient} from "pg";
import {NextRequest} from "next/server";
import {PARENT_SESSION_COOKIE,parentFromSessionToken} from "@/lib/parent-auth";
import {isSiteOwner} from "@/lib/site-owner";

/** Embedded in the existing SOC THINK Next.js server; no classroom daemon. */
export class ClassroomFailure extends Error {
  constructor(public readonly status:number,message:string){super(message)}
}
export type Actor={masterId:string;accountId:string;name:string;admin:boolean};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN=/^[0-9a-f]{64}$/i;
export function id(v:string|undefined):string{
  if(!v||!UUID.test(v))throw new ClassroomFailure(400,"非法课堂标识");return v.toLowerCase();
}
export function token(v:string|undefined):string{
  if(!v||!TOKEN.test(v))throw new ClassroomFailure(400,"作业链接无效");return v.toLowerCase();
}
export function txt(v:unknown,max=60,min=1):string{
  if(typeof v!=="string")throw new ClassroomFailure(400,"请填写有效名称");
  const s=v.trim();
  if([...s].length<min||[...s].length>max||/[<>]/.test(s)||
    [...s].some(ch=>ch.charCodeAt(0)<32||ch.charCodeAt(0)===127))
    throw new ClassroomFailure(400,"名称不符合要求");
  return s;
}
function stable(prefix:string,master:string):string{
  const b=crypto.createHash("sha256").update(prefix).update(master).digest().subarray(0,16);
  b[6]=(b[6]&15)|0x80;b[8]=(b[8]&63)|0x80;
  const h=b.toString("hex");return h.slice(0,8)+"-"+h.slice(8,12)+"-"+h.slice(12,16)+"-"+h.slice(16,20)+"-"+h.slice(20);
}
/** Exactly matches the original Rust classroom identity and workspace IDs. */
export function learnerId(master:string):string{return stable("accentlab/socthink/one-learner/v1\0",master)}
export function workspaceId(master:string,kind:string):string{
  return stable("accentlab/socthink/teacher-space/v1\0"+kind+"\0",master)
}
export function newShareToken():string{return crypto.randomBytes(32).toString("hex")}
export function digest(v:string):string{return crypto.createHash("sha256").update(token(v)).digest("hex")}
export function shareUrl(tenant:string,t:string):string{
  return "https://socthink.cn/english/pronunciation/app/a/"+id(tenant)+"/"+token(t);
}
export const LESSONS=[
  ["octopus-flexibility","An octopus has no bones, so it can squeeze through surprisingly narrow spaces."],
  ["octopus-remarkable-abilities","But flexibility is only one of its remarkable abilities."],
  ["octopus-learn-from-experience","An octopus can explore a puzzle, remember a route, and learn from experience."],
  ["bees-rich-patch","When a honeybee finds a rich patch of flowers, it does not simply return to the hive and hope others will follow."],
  ["bees-short-dance","Inside the dark hive, it performs a short dance that gives other bees clues about where to look."],
  ["bees-direction-and-distance","The angle of the dance helps indicate direction in relation to the sun, while the length of a waggle run provides information about distance."],
  ["trees-cooler-pavement","On a hot afternoon, the pavement under a street tree can feel much cooler than the open sidewalk nearby."],
  ["trees-leaves-and-water","Leaves block some sunlight, and water moving from the leaves into the air carries heat away."],
  ["trees-slow-rainwater","Trees also slow rainwater as it reaches the ground."]
] as const;
export function actor(req:NextRequest):Actor{
  const p=parentFromSessionToken(req.cookies.get(PARENT_SESSION_COOKIE)?.value);
  if(!p||!p.active||p.role!=="parent"||!/^par_[a-f0-9]{16,48}$/i.test(p.id)||
    !(p.wechatId||p.wechatOpenId))throw new ClassroomFailure(401,"请先使用 SOC THINK 微信登录");
  return {masterId:p.id,accountId:learnerId(p.id),name:p.name,admin:isSiteOwner(p)};
}
export function admin(a:Actor):void{
  if(!a.admin)throw new ClassroomFailure(403,"请使用已绑定的主站管理员微信身份");
}
export function writeOrigin(req:NextRequest):void{
  const origin=req.headers.get("origin"),host=req.headers.get("host");
  const allowed=["https://socthink.cn","https://www.socthink.cn"];
  if(process.env.NODE_ENV==="development")allowed.push("http://localhost:3000");
  if(!origin||!allowed.includes(origin)||
    !/^(socthink\.cn|www\.socthink\.cn|localhost:3000)$/.test(host||""))
      throw new ClassroomFailure(403,"操作来源验证失败");
}
export async function jsonBody(req:NextRequest,max=16384):Promise<Record<string,unknown>>{
  if(!req.headers.get("content-type")?.startsWith("application/json"))
    throw new ClassroomFailure(415,"请求格式应为 JSON");
  const s=await req.text();
  if(Buffer.byteLength(s,"utf8")>max)throw new ClassroomFailure(413,"请求内容过大");
  let v:unknown;try{v=JSON.parse(s)}catch{throw new ClassroomFailure(400,"JSON 格式无效")}
  if(!v||typeof v!=="object"||Array.isArray(v))throw new ClassroomFailure(400,"请求内容无效");
  return v as Record<string,unknown>;
}
let pool:Pool|undefined;
export function classroomPool():Pool{
  const url=process.env.SOCTHINK_CLASSROOM_DATABASE_URL?.trim();
  if(!url)throw new ClassroomFailure(503,"课堂数据库尚未接入 Web 主站");
  if(!pool)pool=new Pool({connectionString:url,max:5,connectionTimeoutMillis:3000,
    idleTimeoutMillis:15000,application_name:"socthink-web-classroom"});
  return pool;
}
export async function tx<T>(ctx:{tenant?:string;account?:string;isAdmin?:boolean},
  fn:(db:PoolClient)=>Promise<T>):Promise<T>{
  const db=await classroomPool().connect();
  try{
    await db.query("BEGIN");
    const check=await db.query<{rolsuper:boolean;rolbypassrls:boolean;owns:boolean}>(
      "SELECT r.rolsuper,r.rolbypassrls,EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='accent' AND c.relkind='r' AND c.relowner=r.oid) AS owns FROM pg_roles r WHERE r.rolname=current_user");
    if(!check.rows[0]||check.rows[0].rolsuper||check.rows[0].rolbypassrls||check.rows[0].owns)
      throw new ClassroomFailure(503,"课堂数据库权限配置不安全");
    if(ctx.account)await db.query("SELECT set_config('app.account_id',$1,true)",[id(ctx.account)]);
    if(ctx.tenant)await db.query("SELECT set_config('app.tenant_id',$1,true)",[id(ctx.tenant)]);
    if(ctx.isAdmin)await db.query("SELECT set_config('app.classroom_admin','yes',true)");
    const result=await fn(db);await db.query("COMMIT");return result;
  }catch(e){await db.query("ROLLBACK").catch(()=>undefined);throw e}
  finally{db.release()}
}
export async function ensureAccount(db:PoolClient,a:Actor):Promise<void>{
  const subject="socthink:parent:"+a.masterId;
  await db.query("INSERT INTO accent.accounts(id,auth_subject,display_name) VALUES($1,$2,'微信学习账号') ON CONFLICT(id) DO NOTHING",
    [a.accountId,subject]);
  const r=await db.query("SELECT auth_subject FROM accent.accounts WHERE id=$1",[a.accountId]);
  if(r.rows[0]?.auth_subject!==subject)throw new ClassroomFailure(403,"微信学习身份无法核验");
}
export async function approved(db:PoolClient,a:Actor):Promise<void>{
  const r=await db.query("SELECT 1 FROM accent.teacher_access_requests WHERE account_id=$1 AND state='approved'",[a.accountId]);
  if(!r.rows.length)throw new ClassroomFailure(403,"教师权限尚未获批准");
}
export async function teacher(db:PoolClient,a:Actor,tenant:string,cl:string):Promise<void>{
  await approved(db,a);
  const r=await db.query(["SELECT 1 FROM accent.classes c JOIN accent.memberships m",
    "ON m.tenant_id=c.tenant_id AND m.account_id=c.lead_teacher_id",
    "WHERE c.tenant_id=$1 AND c.id=$2 AND c.lead_teacher_id=$3",
    "AND m.state='active' AND m.role='teacher'"].join(" "),[id(tenant),id(cl),a.accountId]);
  if(!r.rows.length)throw new ClassroomFailure(403,"你无权管理这个班级");
}
export async function enrolled(db:PoolClient,a:Actor,tenant:string,cl:string):Promise<void>{
  const r=await db.query(["SELECT 1 FROM accent.class_enrollments e",
    "JOIN accent.memberships m ON m.tenant_id=e.tenant_id AND m.account_id=e.account_id",
    "WHERE e.tenant_id=$1 AND e.class_id=$2 AND e.account_id=$3 AND e.role='student' AND m.state='active'"].join(" "),
    [id(tenant),id(cl),a.accountId]);
  if(!r.rows.length)throw new ClassroomFailure(403,"请先获得老师的入班确认");
}
export type Invite={assignment:string;classId:string;title:string;setId:string};
export async function invite(db:PoolClient,tenant:string,t:string):Promise<Invite>{
  const r=await db.query(["SELECT a.id AS assignment,a.class_id,a.title,a.sentence_set_id",
    "FROM accent.assignment_invitation_links i JOIN accent.class_assignments a",
    "ON a.tenant_id=i.tenant_id AND a.id=i.assignment_id",
    "WHERE i.tenant_id=$1 AND i.token_digest=decode($2,'hex')",
    "AND i.revoked_at IS NULL AND i.expires_at>now() AND a.lifecycle='published'"].join(" "),
    [id(tenant),digest(t)]);
  if(!r.rows.length)throw new ClassroomFailure(404,"作业链接已过期或不存在");
  const x=r.rows[0];return {assignment:x.assignment,classId:x.class_id,title:x.title,setId:x.sentence_set_id};
}
export async function classForAssignment(db:PoolClient,tenant:string,a:string):Promise<string>{
  const r=await db.query("SELECT class_id FROM accent.class_assignments WHERE tenant_id=$1 AND id=$2",[id(tenant),id(a)]);
  if(!r.rows.length)throw new ClassroomFailure(404,"作业不存在");
  return r.rows[0].class_id as string;
}
